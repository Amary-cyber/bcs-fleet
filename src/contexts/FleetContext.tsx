import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Vehicle,
  Driver,
  Device,
  Geofence,
  Alert,
  AuditLog,
  CompanySettings,
  TraccarPosition,
  TraccarDevice,
  AlertRuleConfig,
} from '../types';
import { useTraccar } from './TraccarContext';
import { useAuth } from './AuthContext';
import { traccarApi } from '../services/traccar/traccarApi';
import { traccarWs } from '../services/traccar/traccarWebSocket';
import {
  demoSimulator,
  DAKAR_GEOFENCES,
  DEMO_DRIVERS,
  DEMO_DEVICES,
  INITIAL_DEMO_VEHICLES,
} from '../services/demo/demoSimulator';

interface FleetContextType {
  vehicles: Vehicle[];
  drivers: Driver[];
  devices: Device[];
  geofences: Geofence[];
  alerts: Alert[];
  auditLogs: AuditLog[];
  settings: CompanySettings;
  alertRules: AlertRuleConfig;
  selectedVehicle: Vehicle | null;
  toastNotification: Alert | null;
  clearToast: () => void;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;

  // CRUD actions
  addVehicle: (vehicle: Partial<Vehicle>) => void;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  addDriver: (driver: Partial<Driver>) => void;
  updateDriver: (id: string, updates: Partial<Driver>) => void;
  deleteDriver: (id: string) => void;
  addDevice: (device: Partial<Device>) => void;
  addGeofence: (geofence: Geofence) => void;
  updateGeofence: (id: string, updates: Partial<Geofence>) => void;
  deleteGeofence: (id: string) => void;
  markAlertRead: (id: string) => void;
  acknowledgeAlert: (id: string) => void;
  markAllAlertsRead: () => void;
  updateAlertRules: (newRules: Partial<AlertRuleConfig>) => void;
  toggleEngineImmobilizer: (vehicleId: string, lock: boolean) => Promise<boolean>;
  logAuditAction: (action: string, details?: Record<string, any>) => void;
  updateSettings: (newSettings: Partial<CompanySettings>) => void;
}

const DEFAULT_SETTINGS: CompanySettings = {
  company_name: 'BCS Fleet Dakar',
  company_phone: '+221 33 800 00 00',
  company_email: 'contact@bcsfleet.sn',
  company_address: 'Route de la Corniche Ouest, Dakar, Sénégal',
  distance_unit: 'km',
  speed_unit: 'km/h',
  currency: 'FCFA',
  timezone: 'Africa/Dakar',
  online_threshold_sec: 120,
  delayed_threshold_sec: 600,
  speed_movement_threshold_kmh: 3.0,
};

const DEFAULT_ALERT_RULES: AlertRuleConfig = {
  speed_limit_kmh: 90,
  speed_tolerance_kmh: 5,
  offline_threshold_mins: 10,
  long_stop_threshold_mins: 60,
  low_battery_threshold: 20,
  notify_speeding: true,
  notify_geofence: true,
  notify_offline: true,
  notify_long_stop: true,
  notify_low_battery: true,
  notify_sos: true,
  notify_ignition: true,
};

// Geofence Math Helper Functions
const isPointInCircle = (lat: number, lng: number, center: [number, number], radiusMeters: number): boolean => {
  const R = 6371000;
  const dLat = ((center[0] - lat) * Math.PI) / 180;
  const dLng = ((center[1] - lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat * Math.PI) / 180) * Math.cos((center[0] * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c <= radiusMeters;
};

const isPointInPolygon = (lat: number, lng: number, polygon: [number, number][]): boolean => {
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
};

const FleetContext = createContext<FleetContextType | undefined>(undefined);

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDemoMode } = useTraccar();
  const { user } = useAuth();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>(DEMO_DRIVERS);
  const [devices, setDevices] = useState<Device[]>(DEMO_DEVICES);
  const [geofences, setGeofences] = useState<Geofence[]>(DAKAR_GEOFENCES);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [toastNotification, setToastNotification] = useState<Alert | null>(null);
  const [alertRules, setAlertRules] = useState<AlertRuleConfig>(DEFAULT_ALERT_RULES);
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: 'log-1',
      user_email: 'admin@bcsfleet.sn',
      user_role: 'ADMIN',
      action: 'SYSTEM_BOOTUP',
      details: { mode: isDemoMode ? 'MODE DEMO' : 'MODE LIVE', location: 'Dakar' },
      created_at: new Date().toISOString(),
    },
  ]);

  // Anti-Spam Idempotency Trackers (Refs to avoid React re-render loops)
  const speedingStateRef = useRef<Record<string, boolean>>({});
  const geofenceStateRef = useRef<Record<string, Record<string, 'INSIDE' | 'OUTSIDE'>>>({});
  const lowBatteryStateRef = useRef<Record<string, boolean>>({});
  const processedEventIdsRef = useRef<Set<string>>(new Set());

  const clearToast = () => setToastNotification(null);

  // Helper to add an alert with Browser Notification & Toast
  const createAlert = (alertData: Omit<Alert, 'id' | 'is_read' | 'timestamp'>) => {
    const newAlert: Alert = {
      ...alertData,
      id: `alt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      is_read: false,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    setAlerts((prev) => [newAlert, ...prev]);
    setToastNotification(newAlert);

    // Browser Notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(newAlert.title || `Alerte Flotte: ${newAlert.vehicle_name}`, {
          body: `${newAlert.vehicle_plate} — ${newAlert.message}`,
          icon: '/favicon.svg',
        });
      } catch (err) {
        console.warn('Browser notification notice:', err);
      }
    }
  };

  // Request Browser Notification Permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Helper to convert Traccar Position & Device to Vehicle object
  const buildLiveVehicleFromTraccar = (
    device: TraccarDevice,
    position?: TraccarPosition,
    existingMetier?: Vehicle
  ): Vehicle => {
    const rawSpeed = position ? position.speed || 0 : 0;
    const speedKmh = Math.round(rawSpeed * 1.852 * 10) / 10;
    const isMoving = speedKmh >= 3.0 && (position?.attributes?.ignition || position?.attributes?.motion);
    const effectiveSpeed = isMoving ? speedKmh : 0;
    const commStatus = device.status === 'online' ? 'ONLINE' : 'OFFLINE';
    const effectiveStatus =
      commStatus === 'OFFLINE'
        ? 'OFFLINE'
        : existingMetier?.engine_locked
        ? 'STOPPED'
        : isMoving
        ? 'MOVING'
        : 'STOPPED';

    if (existingMetier) {
      return {
        ...existingMetier,
        traccar_id: device.id,
        device_id: device.id.toString(),
        device_imei: device.uniqueId,
        status: effectiveStatus,
        comm_status: commStatus,
        current_speed: effectiveSpeed,
        current_heading: position ? Math.round(position.course || 0) : existingMetier.current_heading || 0,
        current_lat: position ? position.latitude : existingMetier.current_lat,
        current_lng: position ? position.longitude : existingMetier.current_lng,
        battery_level:
          position?.attributes?.batteryLevel !== undefined
            ? position.attributes.batteryLevel
            : position?.attributes?.battery !== undefined
            ? position.attributes.battery
            : existingMetier.battery_level,
        ignition_on: position?.attributes?.ignition ?? existingMetier.ignition_on,
        last_position_time: position?.fixTime || position?.deviceTime || device.lastUpdate || existingMetier.last_position_time,
        active: true,
      };
    }

    return {
      id: `veh-traccar-${device.id}`,
      name: device.name || `Véhicule ${device.uniqueId}`,
      plate_number: device.uniqueId,
      brand: 'Traceur',
      model: 'GPS Traccar',
      year: 2024,
      color: 'Gris',
      vehicle_type: 'PICKUP',
      group_name: 'FLOTTE LIVE',
      traccar_id: device.id,
      device_id: device.id.toString(),
      device_imei: device.uniqueId,
      driver_name: 'Non assigné',
      status: effectiveStatus,
      comm_status: commStatus,
      current_speed: effectiveSpeed,
      current_heading: position ? Math.round(position.course || 0) : 0,
      current_lat: position ? position.latitude : 14.7869,
      current_lng: position ? position.longitude : -17.3767,
      battery_level: position?.attributes?.batteryLevel ?? position?.attributes?.battery ?? 80,
      ignition_on: position?.attributes?.ignition ?? false,
      engine_locked: false,
      odometer_km: 0,
      last_position_time: position?.fixTime || position?.deviceTime || device.lastUpdate || new Date().toISOString(),
      active: true,
    };
  };

  // Evaluate Rules Engine for a Vehicle Telemetry Update
  const evaluateTelemetryRules = (vehicle: Vehicle) => {
    if (isDemoMode) return;

    // 1. SPEEDING EVALUATION
    if (alertRules.notify_speeding && vehicle.current_speed > 0) {
      const speedLimit = alertRules.speed_limit_kmh + alertRules.speed_tolerance_kmh;
      const vehId = vehicle.id;
      const isCurrentlySpeeding = vehicle.current_speed > speedLimit;
      const wasSpeeding = speedingStateRef.current[vehId] || false;

      if (isCurrentlySpeeding && !wasSpeeding) {
        speedingStateRef.current[vehId] = true;
        createAlert({
          vehicle_id: vehicle.id,
          vehicle_name: vehicle.name,
          vehicle_plate: vehicle.plate_number,
          traccar_device_id: vehicle.traccar_id,
          alert_type: 'SPEEDING',
          severity: 'WARNING',
          title: `🚨 EXCÈS DE VITESSE: ${vehicle.name}`,
          message: `Vitesse mesurée à ${vehicle.current_speed} km/h (Limite: ${alertRules.speed_limit_kmh} km/h).`,
          speed: vehicle.current_speed,
          speed_limit: alertRules.speed_limit_kmh,
          lat: vehicle.current_lat,
          lng: vehicle.current_lng,
        });
      } else if (vehicle.current_speed <= alertRules.speed_limit_kmh && wasSpeeding) {
        speedingStateRef.current[vehId] = false;
      }
    }

    // 2. GEOFENCES ENTER / EXIT EVALUATION
    if (alertRules.notify_geofence && vehicle.current_lat && vehicle.current_lng) {
      const vehId = vehicle.id;
      if (!geofenceStateRef.current[vehId]) {
        geofenceStateRef.current[vehId] = {};
      }

      geofences.forEach((geo) => {
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

        const prevState = geofenceStateRef.current[vehId][geo.id] || 'OUTSIDE';

        if (isInside && prevState === 'OUTSIDE') {
          geofenceStateRef.current[vehId][geo.id] = 'INSIDE';
          if (geo.notify_on_enter) {
            createAlert({
              vehicle_id: vehicle.id,
              vehicle_name: vehicle.name,
              vehicle_plate: vehicle.plate_number,
              traccar_device_id: vehicle.traccar_id,
              alert_type: 'GEOFENCE_ENTER',
              severity: 'INFO',
              title: `📍 ENTRÉE DANS ZONE: ${geo.name}`,
              message: `${vehicle.name} (${vehicle.plate_number}) est entré dans la zone ${geo.name}.`,
              lat: vehicle.current_lat,
              lng: vehicle.current_lng,
              geofence_id: geo.id,
              geofence_name: geo.name,
            });
          }
        } else if (!isInside && prevState === 'INSIDE') {
          geofenceStateRef.current[vehId][geo.id] = 'OUTSIDE';
          if (geo.notify_on_exit) {
            createAlert({
              vehicle_id: vehicle.id,
              vehicle_name: vehicle.name,
              vehicle_plate: vehicle.plate_number,
              traccar_device_id: vehicle.traccar_id,
              alert_type: 'GEOFENCE_EXIT',
              severity: 'WARNING',
              title: `⚠️ SORTIE DE ZONE: ${geo.name}`,
              message: `${vehicle.name} (${vehicle.plate_number}) est sorti de la zone ${geo.name}.`,
              lat: vehicle.current_lat,
              lng: vehicle.current_lng,
              geofence_id: geo.id,
              geofence_name: geo.name,
            });
          }
        }
      });
    }

    // 3. LOW BATTERY EVALUATION
    if (alertRules.notify_low_battery && vehicle.battery_level !== null && vehicle.battery_level !== undefined) {
      const vehId = vehicle.id;
      const isLow = vehicle.battery_level < alertRules.low_battery_threshold;
      const wasLow = lowBatteryStateRef.current[vehId] || false;

      if (isLow && !wasLow) {
        lowBatteryStateRef.current[vehId] = true;
        createAlert({
          vehicle_id: vehicle.id,
          vehicle_name: vehicle.name,
          vehicle_plate: vehicle.plate_number,
          traccar_device_id: vehicle.traccar_id,
          alert_type: 'LOW_BATTERY',
          severity: 'WARNING',
          title: `🔋 BATTERIE FAIBLE: ${vehicle.name}`,
          message: `Niveau de batterie GPS à ${vehicle.battery_level}% (Seuil: ${alertRules.low_battery_threshold}%).`,
          lat: vehicle.current_lat,
          lng: vehicle.current_lng,
        });
      } else if (vehicle.battery_level >= alertRules.low_battery_threshold + 5 && wasLow) {
        lowBatteryStateRef.current[vehId] = false;
      }
    }
  };

  // Synchronize MODE LIVE vs MODE DEMO
  useEffect(() => {
    if (isDemoMode) {
      setVehicles(INITIAL_DEMO_VEHICLES);
      setDrivers(DEMO_DRIVERS);
      setDevices(DEMO_DEVICES);
      setGeofences(DAKAR_GEOFENCES);

      demoSimulator.start();
      const unsubscribeDemo = demoSimulator.subscribe((simulatedVehicles) => {
        setVehicles(simulatedVehicles);
      });

      return () => {
        unsubscribeDemo();
        demoSimulator.stop();
      };

    } else {
      demoSimulator.stop();

      const syncLiveTraccarData = async () => {
        try {
          const [devicesData, positionsData] = await Promise.all([
            traccarApi.getDevices(),
            traccarApi.getPositions(),
          ]);

          if (devicesData && devicesData.length > 0) {
            const positionsMap = new Map<number, TraccarPosition>();
            if (positionsData) {
              positionsData.forEach((p) => positionsMap.set(p.deviceId, p));
            }

            setVehicles((prevMetierVehicles) => {
              const liveVehicles: Vehicle[] = devicesData.map((d) => {
                const pos = positionsMap.get(d.id);
                const existing = prevMetierVehicles.find(
                  (v) => v.traccar_id === d.id || v.device_id === d.id.toString() || v.device_imei === d.uniqueId
                );
                const liveVeh = buildLiveVehicleFromTraccar(d, pos, existing);
                evaluateTelemetryRules(liveVeh);
                return liveVeh;
              });
              return liveVehicles;
            });
          }
        } catch (err) {
          console.warn('Notice: Traccar Live REST Sync:', err);
        }
      };

      syncLiveTraccarData();
      const intervalId = setInterval(syncLiveTraccarData, 15000);

      // WebSocket Realtime Subscribers
      traccarWs.connect();
      const unsubscribe = traccarWs.subscribe((wsMessage) => {
        if (wsMessage.positions && wsMessage.positions.length > 0) {
          wsMessage.positions.forEach((pos) => {
            setVehicles((prev) =>
              prev.map((v) => {
                if (v.traccar_id === pos.deviceId || v.device_id === pos.deviceId.toString()) {
                  const rawSpeed = pos.speed || 0;
                  const speedKmh = Math.round(rawSpeed * 1.852 * 10) / 10;
                  const isMoving = speedKmh >= 3.0 && (pos.attributes?.ignition || pos.attributes?.motion);
                  const effectiveSpeed = isMoving ? speedKmh : 0;
                  const updated: Vehicle = {
                    ...v,
                    comm_status: 'ONLINE',
                    status: isMoving ? 'MOVING' : 'STOPPED',
                    current_speed: effectiveSpeed,
                    current_heading: Math.round(pos.course || 0),
                    current_lat: pos.latitude,
                    current_lng: pos.longitude,
                    battery_level: pos.attributes?.batteryLevel ?? pos.attributes?.battery ?? v.battery_level,
                    ignition_on: pos.attributes?.ignition ?? v.ignition_on,
                    last_position_time: pos.fixTime || pos.deviceTime || new Date().toISOString(),
                  };
                  evaluateTelemetryRules(updated);
                  return updated;
                }
                return v;
              })
            );
          });
        }

        // Process Traccar Events (WS Events Stream)
        if (wsMessage.events && wsMessage.events.length > 0) {
          wsMessage.events.forEach((evt: any) => {
            const eventKey = `${evt.id || evt.eventTime}-${evt.deviceId}-${evt.type}`;
            if (!processedEventIdsRef.current.has(eventKey)) {
              processedEventIdsRef.current.add(eventKey);

              setVehicles((prev) => {
                const matched = prev.find((v) => v.traccar_id === evt.deviceId);
                if (matched) {
                  createAlert({
                    vehicle_id: matched.id,
                    vehicle_name: matched.name,
                    vehicle_plate: matched.plate_number,
                    traccar_device_id: matched.traccar_id,
                    alert_type: evt.type === 'overspeed' ? 'SPEEDING' : 'UNAUTHORIZED_MOVEMENT',
                    severity: evt.type === 'alarm' ? 'CRITICAL' : 'WARNING',
                    title: `Événement Traccar: ${evt.type}`,
                    message: `Événement ${evt.type} reçu du boîtier Traccar ${matched.name}.`,
                    lat: matched.current_lat,
                    lng: matched.current_lng,
                  });
                }
                return prev;
              });
            }
          });
        }
      });

      return () => {
        clearInterval(intervalId);
        unsubscribe();
      };
    }
  }, [isDemoMode]);

  // Actions
  const addVehicle = (newVehData: Partial<Vehicle>) => {
    const created: Vehicle = {
      id: `veh-${Date.now()}`,
      name: newVehData.name || 'Nouveau Véhicule',
      plate_number: newVehData.plate_number || 'DK-0000-XX',
      brand: newVehData.brand || 'Toyota',
      model: newVehData.model || 'Hilux',
      year: newVehData.year || 2024,
      color: newVehData.color || 'Blanc',
      vin: newVehData.vin,
      group_name: newVehData.group_name || 'LIVRAISON',
      vehicle_type: newVehData.vehicle_type || 'PICKUP',
      driver_id: newVehData.driver_id || null,
      driver_name: newVehData.driver_name || 'Non assigné',
      driver_phone: newVehData.driver_phone,
      device_id: newVehData.device_id || null,
      device_imei: newVehData.device_imei || 'Non associé',
      traccar_id: newVehData.traccar_id,
      traccar_unique_id: newVehData.traccar_unique_id,
      status: 'OFFLINE',
      comm_status: 'OFFLINE',
      current_speed: 0,
      current_heading: 0,
      current_lat: 14.6937,
      current_lng: -17.4583,
      battery_level: 100,
      ignition_on: false,
      engine_locked: false,
      odometer_km: newVehData.odometer_km || 0,
      last_position_time: new Date().toISOString(),
      notes: newVehData.notes,
      active: true,
    };

    setVehicles((prev) => [created, ...prev]);
    logAuditAction('VEHICLE_CREATE', { vehicle_name: created.name, plate: created.plate_number });
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates, updated_at: new Date().toISOString() } : v))
    );
    logAuditAction('VEHICLE_UPDATE', { vehicle_id: id, updates });
  };

  const deleteVehicle = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    logAuditAction('VEHICLE_DELETE', { vehicle_id: id });
  };

  const addDriver = (driverData: Partial<Driver>) => {
    const created: Driver = {
      id: `drv-${Date.now()}`,
      first_name: driverData.first_name || 'Nouveau',
      last_name: driverData.last_name || 'Chauffeur',
      phone: driverData.phone || '+221 77 000 00 00',
      license_number: driverData.license_number || `DK-${Math.floor(Math.random() * 100000)}`,
      license_expiry_date: driverData.license_expiry_date || '2028-12-31',
      status: 'ACTIVE',
    };
    setDrivers((prev) => [created, ...prev]);
  };

  const updateDriver = (id: string, updates: Partial<Driver>) => {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  };

  const deleteDriver = (id: string) => {
    setDrivers((prev) => prev.filter((d) => d.id !== id));
  };

  const addDevice = (deviceData: Partial<Device>) => {
    const created: Device = {
      id: `dev-${Date.now()}`,
      name: deviceData.name || 'Nouveau Traceur',
      imei: deviceData.imei || '860000000000000',
      model: deviceData.model || 'Teltonika FMB920',
      status: 'ONLINE',
      assigned_vehicle_name: deviceData.assigned_vehicle_name,
    };
    setDevices((prev) => [created, ...prev]);
  };

  const addGeofence = (geofence: Geofence) => {
    setGeofences((prev) => [geofence, ...prev]);
    logAuditAction('GEOFENCE_CREATE', { geofence_name: geofence.name });
  };

  const updateGeofence = (id: string, updates: Partial<Geofence>) => {
    setGeofences((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
    logAuditAction('GEOFENCE_UPDATE', { geofence_id: id, updates });
  };

  const deleteGeofence = (id: string) => {
    setGeofences((prev) => prev.filter((g) => g.id !== id));
    logAuditAction('GEOFENCE_DELETE', { geofence_id: id });
  };

  const markAlertRead = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_read: true, acknowledged: true, acknowledged_at: new Date().toISOString() } : a))
    );
  };

  const acknowledgeAlert = (id: string) => {
    markAlertRead(id);
    logAuditAction('ALERT_ACKNOWLEDGE', { alert_id: id, user: user?.email });
  };

  const markAllAlertsRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true, acknowledged: true })));
  };

  const updateAlertRules = (newRules: Partial<AlertRuleConfig>) => {
    setAlertRules((prev) => ({ ...prev, ...newRules }));
    logAuditAction('ALERT_RULES_UPDATE', newRules);
  };

  const toggleEngineImmobilizer = async (vehicleId: string, lock: boolean): Promise<boolean> => {
    const targetVeh = vehicles.find((v) => v.id === vehicleId);
    if (!targetVeh) return false;

    if (!isDemoMode && targetVeh.traccar_id) {
      await traccarApi.sendCommand(targetVeh.traccar_id, lock ? 'engineStop' : 'engineResume');
    }

    updateVehicle(vehicleId, { engine_locked: lock, status: lock ? 'STOPPED' : targetVeh.status });
    logAuditAction(lock ? 'ENGINE_IMMOBILIZE' : 'ENGINE_RESUME', { vehicle_id: vehicleId, vehicle_name: targetVeh.name });
    return true;
  };

  const logAuditAction = (action: string, details?: Record<string, any>) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      user_email: user?.email || 'admin@bcsfleet.sn',
      user_role: (user?.role as any) || 'ADMIN',
      action,
      details,
      created_at: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const updateSettings = (newSettings: Partial<CompanySettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <FleetContext.Provider
      value={{
        vehicles,
        drivers,
        devices,
        geofences,
        alerts,
        auditLogs,
        settings,
        alertRules,
        selectedVehicle,
        toastNotification,
        clearToast,
        setSelectedVehicle,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        addDriver,
        updateDriver,
        deleteDriver,
        addDevice,
        addGeofence,
        updateGeofence,
        deleteGeofence,
        markAlertRead,
        acknowledgeAlert,
        markAllAlertsRead,
        updateAlertRules,
        toggleEngineImmobilizer,
        logAuditAction,
        updateSettings,
      }}
    >
      {children}
    </FleetContext.Provider>
  );
};

export const useFleet = (): FleetContextType => {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
};
