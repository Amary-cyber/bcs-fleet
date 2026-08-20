import { Alert, AlertSeverity, AlertType, AlertRuleConfig, Vehicle, Geofence } from '../../types';

export interface TraccarEventRaw {
  id?: number;
  attributes?: Record<string, any>;
  deviceId: number;
  type: string;
  eventTime: string;
  positionId?: number;
  geofenceId?: number;
  maintenanceId?: number;
}

export interface AlertState {
  active: boolean;
  firstTriggeredAt: number;
  lastTriggeredAt: number;
  alertId?: string;
  lastValue?: number;
}

export class TraccarEventManager {
  private processedEventKeys = new Set<string>();
  private activeSpeedingStates = new Map<string, AlertState>();
  private activeBatteryStates = new Map<string, AlertState>();
  private activeOfflineStates = new Map<string, AlertState>();
  private activeGeofenceStates = new Map<string, 'INSIDE' | 'OUTSIDE'>();

  // Map raw Traccar event type to BCS Fleet AlertType and AlertSeverity
  mapTraccarEventType(type: string): { alertType: AlertType; severity: AlertSeverity; defaultTitle: string } {
    switch (type) {
      case 'alarm':
      case 'sos':
      case 'panic':
        return { alertType: 'SOS', severity: 'CRITICAL', defaultTitle: '🚨 SIGNAL SOS / ALARME BOÎTIER' };
      case 'overspeed':
        return { alertType: 'SPEEDING', severity: 'WARNING', defaultTitle: '⚡ EXCÈS DE VITESSE DÉTECTÉ' };
      case 'geofenceEnter':
        return { alertType: 'GEOFENCE_ENTER', severity: 'INFO', defaultTitle: '📍 ENTRÉE DANS LA ZONE' };
      case 'geofenceExit':
        return { alertType: 'GEOFENCE_EXIT', severity: 'WARNING', defaultTitle: '⚠️ SORTIE DE LA ZONE' };
      case 'deviceOffline':
        return { alertType: 'GPS_OFFLINE', severity: 'CRITICAL', defaultTitle: '📡 BOÎTIER GPS HORS LIGNE' };
      case 'deviceOnline':
        return { alertType: 'TRACKER_ERROR', severity: 'INFO', defaultTitle: '🟢 BOÎTIER GPS EN LIGNE' };
      case 'ignitionOn':
        return { alertType: 'IGNITION', severity: 'INFO', defaultTitle: '🔑 CONTACT ALLUMÉ' };
      case 'ignitionOff':
        return { alertType: 'IGNITION', severity: 'INFO', defaultTitle: '⚪ CONTACT COUPÉ' };
      case 'lowBattery':
        return { alertType: 'LOW_BATTERY', severity: 'WARNING', defaultTitle: '🔋 BATTERIE BOÎTIER FAIBLE' };
      case 'unauthorizedMovement':
      case 'tow':
      case 'movement':
        return { alertType: 'UNAUTHORIZED_MOVEMENT', severity: 'WARNING', defaultTitle: '⚠️ MOUVEMENT NON AUTORISÉ' };
      default:
        return { alertType: 'TRACKER_ERROR', severity: 'INFO', defaultTitle: `Événement Traccar: ${type}` };
    }
  }

  // Deduplicate and normalize a raw Traccar WebSocket event
  processTraccarRawEvent(
    rawEvent: TraccarEventRaw,
    vehicles: Vehicle[],
    geofences: Geofence[]
  ): Alert | null {
    const eventKey = `${rawEvent.id || rawEvent.eventTime}-${rawEvent.deviceId}-${rawEvent.type}-${rawEvent.geofenceId || ''}`;
    if (this.processedEventKeys.has(eventKey)) {
      return null;
    }
    this.processedEventKeys.add(eventKey);

    const matchedVehicle = vehicles.find((v) => v.traccar_id === rawEvent.deviceId);
    const matchedGeofence = rawEvent.geofenceId
      ? geofences.find((g) => g.id === String(rawEvent.geofenceId) || g.name === `Zone #${rawEvent.geofenceId}`)
      : undefined;

    const { alertType, severity, defaultTitle } = this.mapTraccarEventType(rawEvent.type);

    const vehName = matchedVehicle ? matchedVehicle.name : `Traceur #${rawEvent.deviceId}`;
    const vehPlate = matchedVehicle ? matchedVehicle.plate_number : `DEV-${rawEvent.deviceId}`;
    const lat = matchedVehicle?.current_lat || 14.7869;
    const lng = matchedVehicle?.current_lng || -17.3767;

    let message = `Événement ${rawEvent.type} reçu du serveur Traccar pour ${vehName}.`;
    if (rawEvent.type === 'overspeed') {
      const spd = matchedVehicle?.current_speed || rawEvent.attributes?.speed || 0;
      message = `Excès de vitesse enregistré à ${spd} km/h sur le véhicule ${vehName} (${vehPlate}).`;
    } else if (rawEvent.type === 'geofenceEnter') {
      message = `${vehName} (${vehPlate}) est entré dans la zone ${matchedGeofence?.name || 'surveillée'}.`;
    } else if (rawEvent.type === 'geofenceExit') {
      message = `${vehName} (${vehPlate}) a quitté la zone ${matchedGeofence?.name || 'surveillée'}.`;
    } else if (rawEvent.type === 'deviceOffline') {
      message = `Perte de signal ou déconnexion du boîtier GPS pour ${vehName}.`;
    } else if (rawEvent.type === 'deviceOnline') {
      message = `Signal GPS rétabli avec succès pour ${vehName}.`;
    } else if (rawEvent.type === 'alarm' || rawEvent.type === 'sos') {
      message = `Déclenchement d'une alarme de sécurité immédiate sur ${vehName} (${vehPlate}).`;
    }

    const alert: Alert = {
      id: `alt-trac-${rawEvent.id || Date.now()}-${rawEvent.deviceId}`,
      vehicle_id: matchedVehicle ? matchedVehicle.id : `veh-traccar-${rawEvent.deviceId}`,
      vehicle_name: vehName,
      vehicle_plate: vehPlate,
      traccar_device_id: rawEvent.deviceId,
      alert_type: alertType,
      severity,
      title: defaultTitle,
      message,
      speed: matchedVehicle?.current_speed,
      lat,
      lng,
      geofence_id: matchedGeofence?.id,
      geofence_name: matchedGeofence?.name,
      is_read: false,
      acknowledged: false,
      timestamp: rawEvent.eventTime || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    return alert;
  }

  // Telemetry Rules Evaluation (Hysteresis & Anti-Spam Re-arm Cycles)
  evaluateTelemetry(
    vehicle: Vehicle,
    rules: AlertRuleConfig,
    geofences: Geofence[]
  ): Alert[] {
    const generatedAlerts: Alert[] = [];
    const vehId = vehicle.id;
    const now = Date.now();

    // 1. OVERSPEED EVALUATION (Single alert upon threshold crossing, re-arm when below limit)
    if (rules.notify_speeding && vehicle.current_speed > 0) {
      const speedThreshold = rules.speed_limit_kmh + rules.speed_tolerance_kmh;
      const isOver = vehicle.current_speed > speedThreshold;
      let state = this.activeSpeedingStates.get(vehId);

      if (!state) {
        state = { active: false, firstTriggeredAt: 0, lastTriggeredAt: 0 };
        this.activeSpeedingStates.set(vehId, state);
      }

      if (isOver && !state.active) {
        state.active = true;
        state.firstTriggeredAt = now;
        state.lastTriggeredAt = now;
        state.lastValue = vehicle.current_speed;

        generatedAlerts.push({
          id: `alt-spd-${vehId}-${now}`,
          vehicle_id: vehicle.id,
          vehicle_name: vehicle.name,
          vehicle_plate: vehicle.plate_number,
          traccar_device_id: vehicle.traccar_id,
          alert_type: 'SPEEDING',
          severity: 'WARNING',
          title: `🚨 EXCÈS DE VITESSE: ${vehicle.name}`,
          message: `Vitesse mesurée à ${vehicle.current_speed} km/h (Limite: ${rules.speed_limit_kmh} km/h, Tolérance: +${rules.speed_tolerance_kmh} km/h).`,
          speed: vehicle.current_speed,
          speed_limit: rules.speed_limit_kmh,
          lat: vehicle.current_lat,
          lng: vehicle.current_lng,
          is_read: false,
          acknowledged: false,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      } else if (vehicle.current_speed <= rules.speed_limit_kmh && state.active) {
        // Re-arm speeding trigger
        state.active = false;
      }
    }

    // 2. LOW BATTERY EVALUATION (Hysteresis of 5% before re-arming)
    if (rules.notify_low_battery && vehicle.battery_level !== null && vehicle.battery_level !== undefined) {
      const isLow = vehicle.battery_level < rules.low_battery_threshold;
      let state = this.activeBatteryStates.get(vehId);

      if (!state) {
        state = { active: false, firstTriggeredAt: 0, lastTriggeredAt: 0 };
        this.activeBatteryStates.set(vehId, state);
      }

      if (isLow && !state.active) {
        state.active = true;
        state.firstTriggeredAt = now;
        state.lastTriggeredAt = now;
        state.lastValue = vehicle.battery_level;

        generatedAlerts.push({
          id: `alt-bat-${vehId}-${now}`,
          vehicle_id: vehicle.id,
          vehicle_name: vehicle.name,
          vehicle_plate: vehicle.plate_number,
          traccar_device_id: vehicle.traccar_id,
          alert_type: 'LOW_BATTERY',
          severity: 'WARNING',
          title: `🔋 BATTERIE BOÎTIER FAIBLE: ${vehicle.name}`,
          message: `Niveau de charge du boîtier GPS à ${vehicle.battery_level}% (Seuil critique: ${rules.low_battery_threshold}%).`,
          lat: vehicle.current_lat,
          lng: vehicle.current_lng,
          is_read: false,
          acknowledged: false,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      } else if (vehicle.battery_level >= rules.low_battery_threshold + 5 && state.active) {
        // Re-arm battery trigger
        state.active = false;
      }
    }

    // 3. OFFLINE STATUS EVALUATION (Single alert when status turns OFFLINE, re-arm when ONLINE)
    if (rules.notify_offline) {
      const isOffline = vehicle.status === 'OFFLINE' || vehicle.comm_status === 'OFFLINE';
      let state = this.activeOfflineStates.get(vehId);

      if (!state) {
        state = { active: false, firstTriggeredAt: 0, lastTriggeredAt: 0 };
        this.activeOfflineStates.set(vehId, state);
      }

      if (isOffline && !state.active) {
        state.active = true;
        state.firstTriggeredAt = now;
        state.lastTriggeredAt = now;

        generatedAlerts.push({
          id: `alt-off-${vehId}-${now}`,
          vehicle_id: vehicle.id,
          vehicle_name: vehicle.name,
          vehicle_plate: vehicle.plate_number,
          traccar_device_id: vehicle.traccar_id,
          alert_type: 'GPS_OFFLINE',
          severity: 'CRITICAL',
          title: `📡 BOÎTIER GPS HORS LIGNE: ${vehicle.name}`,
          message: `Interruption de la communication télématique avec ${vehicle.name} (${vehicle.plate_number}).`,
          lat: vehicle.current_lat,
          lng: vehicle.current_lng,
          is_read: false,
          acknowledged: false,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      } else if (!isOffline && state.active) {
        // Re-arm offline trigger
        state.active = false;
      }
    }

    // 4. GEOFENCE BOUNDARY TRANSITIONS
    if (rules.notify_geofence && vehicle.current_lat && vehicle.current_lng && geofences.length > 0) {
      geofences.forEach((geo) => {
        const key = `${vehId}:${geo.id}`;
        let isInside = false;

        if (geo.type === 'CIRCLE' && 'center' in geo.coordinates) {
          isInside = isPointInCircle(
            vehicle.current_lat,
            vehicle.current_lng,
            geo.coordinates.center,
            geo.coordinates.radius
          );
        } else if (geo.type === 'POLYGON' && Array.isArray(geo.coordinates)) {
          isInside = isPointInPolygon(vehicle.current_lat, vehicle.current_lng, geo.coordinates as [number, number][]);
        }

        const prevState = this.activeGeofenceStates.get(key) || 'OUTSIDE';

        if (isInside && prevState === 'OUTSIDE') {
          this.activeGeofenceStates.set(key, 'INSIDE');
          if (geo.notify_on_enter) {
            generatedAlerts.push({
              id: `alt-geo-ent-${vehId}-${geo.id}-${now}`,
              vehicle_id: vehicle.id,
              vehicle_name: vehicle.name,
              vehicle_plate: vehicle.plate_number,
              traccar_device_id: vehicle.traccar_id,
              alert_type: 'GEOFENCE_ENTER',
              severity: 'INFO',
              title: `📍 ENTRÉE DE ZONE: ${geo.name}`,
              message: `${vehicle.name} (${vehicle.plate_number}) a franchi le périmètre et est entré dans la zone ${geo.name}.`,
              lat: vehicle.current_lat,
              lng: vehicle.current_lng,
              geofence_id: geo.id,
              geofence_name: geo.name,
              is_read: false,
              acknowledged: false,
              timestamp: new Date().toISOString(),
              created_at: new Date().toISOString(),
            });
          }
        } else if (!isInside && prevState === 'INSIDE') {
          this.activeGeofenceStates.set(key, 'OUTSIDE');
          if (geo.notify_on_exit) {
            generatedAlerts.push({
              id: `alt-geo-ext-${vehId}-${geo.id}-${now}`,
              vehicle_id: vehicle.id,
              vehicle_name: vehicle.name,
              vehicle_plate: vehicle.plate_number,
              traccar_device_id: vehicle.traccar_id,
              alert_type: 'GEOFENCE_EXIT',
              severity: 'WARNING',
              title: `⚠️ SORTIE DE ZONE: ${geo.name}`,
              message: `${vehicle.name} (${vehicle.plate_number}) est sorti de la zone autorisée ${geo.name}.`,
              lat: vehicle.current_lat,
              lng: vehicle.current_lng,
              geofence_id: geo.id,
              geofence_name: geo.name,
              is_read: false,
              acknowledged: false,
              timestamp: new Date().toISOString(),
              created_at: new Date().toISOString(),
            });
          }
        }
      });
    }

    return generatedAlerts;
  }
}

// Helpers
function isPointInCircle(lat: number, lng: number, center: [number, number], radiusMeters: number): boolean {
  const R = 6371000;
  const dLat = ((center[0] - lat) * Math.PI) / 180;
  const dLng = ((center[1] - lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat * Math.PI) / 180) * Math.cos((center[0] * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c <= radiusMeters;
}

function isPointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0],
      yi = polygon[i][1];
    const xj = polygon[j][0],
      yj = polygon[j][1];
    const intersect = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export const traccarEventManager = new TraccarEventManager();
