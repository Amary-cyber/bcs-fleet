import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
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
  MaintenanceRecord,
  MaintenanceSchedule,
  VehicleDocument,
  Expense,
  TCOSummary,
  ExpenseCategory,
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
  DEMO_MAINTENANCE_RECORDS,
  DEMO_MAINTENANCE_SCHEDULES,
  DEMO_VEHICLE_DOCUMENTS,
  DEMO_EXPENSES,
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
  maintenanceRecords: MaintenanceRecord[];
  maintenanceSchedules: MaintenanceSchedule[];
  vehicleDocuments: VehicleDocument[];
  expenses: Expense[];
  tcoSummary: TCOSummary;
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

  // Maintenance & Expenses CRUD
  addMaintenanceRecord: (record: Partial<MaintenanceRecord>) => void;
  updateMaintenanceRecord: (id: string, updates: Partial<MaintenanceRecord>) => void;
  deleteMaintenanceRecord: (id: string) => void;
  addMaintenanceSchedule: (schedule: Partial<MaintenanceSchedule>) => void;
  updateMaintenanceSchedule: (id: string, updates: Partial<MaintenanceSchedule>) => void;
  deleteMaintenanceSchedule: (id: string) => void;
  addVehicleDocument: (doc: Partial<VehicleDocument>) => void;
  updateVehicleDocument: (id: string, updates: Partial<VehicleDocument>) => void;
  deleteVehicleDocument: (id: string) => void;
  addExpense: (expense: Partial<Expense>) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
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

  // Maintenance & Expenses State
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>(DEMO_MAINTENANCE_RECORDS);
  const [maintenanceSchedules, setMaintenanceSchedules] = useState<MaintenanceSchedule[]>(DEMO_MAINTENANCE_SCHEDULES);
  const [vehicleDocuments, setVehicleDocuments] = useState<VehicleDocument[]>(DEMO_VEHICLE_DOCUMENTS);
  const [expenses, setExpenses] = useState<Expense[]>(DEMO_EXPENSES);

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
  const maintenanceAlertsRef = useRef<Set<string>>(new Set());

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

  // Maintenance, Documents & Driver Licenses Deadline Check Engine
  useEffect(() => {
    const checkDeadlines = () => {
      const now = Date.now();

      // 1. Check Maintenance Schedules against real Odometer & Time
      maintenanceSchedules.forEach((sched) => {
        if (!sched.active) return;
        const veh = vehicles.find((v) => v.id === sched.vehicle_id);
        if (!veh) return;

        // Odometer-based check
        if (sched.interval_km && veh.odometer_km) {
          const lastKm = sched.last_performed_odometer || 0;
          const dueKm = lastKm + sched.interval_km;
          const kmRemaining = dueKm - veh.odometer_km;
          const alertKey = `sched-km-${sched.id}-${Math.floor(veh.odometer_km / 500)}`;

          if (kmRemaining <= 0 && !maintenanceAlertsRef.current.has(alertKey)) {
            maintenanceAlertsRef.current.add(alertKey);
            createAlert({
              vehicle_id: veh.id,
              vehicle_name: veh.name,
              vehicle_plate: veh.plate_number,
              traccar_device_id: veh.traccar_id,
              alert_type: 'MAINTENANCE_OVERDUE',
              severity: 'CRITICAL',
              title: `🛠️ ENTRETIEN EN RETARD: ${sched.title}`,
              message: `Le véhicule ${veh.name} (${veh.plate_number}) a dépassé l'échéance de ${Math.abs(kmRemaining)} km (Odomètre: ${veh.odometer_km} km / Prévu: ${dueKm} km).`,
              lat: veh.current_lat,
              lng: veh.current_lng,
            });
          } else if (kmRemaining > 0 && kmRemaining <= 1000 && !maintenanceAlertsRef.current.has(alertKey)) {
            maintenanceAlertsRef.current.add(alertKey);
            createAlert({
              vehicle_id: veh.id,
              vehicle_name: veh.name,
              vehicle_plate: veh.plate_number,
              traccar_device_id: veh.traccar_id,
              alert_type: 'MAINTENANCE_DUE',
              severity: 'WARNING',
              title: `⚠️ ENTRETIEN À PRÉVOIR: ${sched.title}`,
              message: `Échéance dans ${kmRemaining} km pour ${veh.name} (Odomètre: ${veh.odometer_km} km / Prévu à ${dueKm} km).`,
              lat: veh.current_lat,
              lng: veh.current_lng,
            });
          }
        }
      });

      // 2. Check Vehicle Documents (Assurance, Visite Technique, etc.) Expiration
      vehicleDocuments.forEach((doc) => {
        const expiryTime = new Date(doc.expiry_date).getTime();
        const daysRemaining = Math.ceil((expiryTime - now) / (1000 * 3600 * 24));
        const alertKey = `doc-exp-${doc.id}-${daysRemaining}`;

        if (daysRemaining <= 30 && !maintenanceAlertsRef.current.has(alertKey)) {
          maintenanceAlertsRef.current.add(alertKey);
          const isOverdue = daysRemaining < 0;
          const isAssurance = doc.type === 'ASSURANCE';
          const isVT = doc.type === 'VISITE_TECHNIQUE';

          const alertType = isAssurance
            ? 'INSURANCE_EXPIRING'
            : isVT
            ? 'TECHNICAL_INSPECTION_EXPIRING'
            : 'DOCUMENT_EXPIRING';

          createAlert({
            vehicle_id: doc.vehicle_id,
            vehicle_name: doc.vehicle_name,
            vehicle_plate: doc.vehicle_plate,
            alert_type: alertType,
            severity: isOverdue ? 'CRITICAL' : daysRemaining <= 7 ? 'WARNING' : 'INFO',
            title: isOverdue
              ? `🚨 ${doc.title} EXPIRÉ(E)`
              : `⏳ ÉCHÉANCE: ${doc.title}`,
            message: isOverdue
              ? `Le document ${doc.document_number} pour ${doc.vehicle_name} est expiré depuis ${Math.abs(daysRemaining)} jour(s).`
              : `Le document ${doc.document_number} pour ${doc.vehicle_name} expire dans ${daysRemaining} jour(s) (${doc.expiry_date}).`,
            lat: 14.6937,
            lng: -17.4583,
          });
        }
      });

      // 3. Check Driver Licenses Expiration
      drivers.forEach((drv) => {
        if (!drv.license_expiry_date) return;
        const expiryTime = new Date(drv.license_expiry_date).getTime();
        const daysRemaining = Math.ceil((expiryTime - now) / (1000 * 3600 * 24));
        const alertKey = `lic-exp-${drv.id}-${daysRemaining}`;

        if (daysRemaining <= 30 && !maintenanceAlertsRef.current.has(alertKey)) {
          maintenanceAlertsRef.current.add(alertKey);
          const isOverdue = daysRemaining < 0;

          createAlert({
            vehicle_id: drv.assigned_vehicle_id || 'unassigned',
            vehicle_name: drv.assigned_vehicle_name || 'Chauffeur',
            vehicle_plate: drv.license_number,
            alert_type: 'LICENSE_EXPIRING',
            severity: isOverdue ? 'CRITICAL' : daysRemaining <= 7 ? 'WARNING' : 'INFO',
            title: isOverdue
              ? `🪪 PERMIS DE CONDUIRE EXPIRÉ`
              : `🪪 PERMIS CHAUFFEUR: ÉCHÉANCE PROCHE`,
            message: isOverdue
              ? `Le permis de ${drv.first_name} ${drv.last_name} (${drv.license_number}) est expiré.`
              : `Le permis de ${drv.first_name} ${drv.last_name} (${drv.license_number}) expire dans ${daysRemaining} jour(s).`,
            lat: 14.6937,
            lng: -17.4583,
          });
        }
      });
    };

    checkDeadlines();
    const interval = setInterval(checkDeadlines, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [vehicles, maintenanceSchedules, vehicleDocuments, drivers]);

  // Dynamic TCO (Total Cost of Ownership) Calculation
  const tcoSummary: TCOSummary = useMemo(() => {
    const totalCost = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalDistanceKm = vehicles.reduce((sum, v) => sum + (v.odometer_km || 0), 0);
    const costPerKm = totalDistanceKm > 0 ? Math.round((totalCost / totalDistanceKm) * 10) / 10 : null;

    const costByCategory: Record<ExpenseCategory, number> = {
      CARBURANT: 0,
      MAINTENANCE: 0,
      REPARATION: 0,
      PNEUS: 0,
      PEAGE: 0,
      ASSURANCE: 0,
      AMENDES: 0,
      AUTRE: 0,
    };

    const costByVehicle: Record<string, { name: string; plate: string; total: number; km: number; costPerKm: number | null }> = {};

    vehicles.forEach((v) => {
      costByVehicle[v.id] = {
        name: v.name,
        plate: v.plate_number,
        total: 0,
        km: v.odometer_km || 0,
        costPerKm: null,
      };
    });

    const monthMap = new Map<string, { total: number; fuel: number; maintenance: number; other: number }>();

    expenses.forEach((exp) => {
      // By category
      costByCategory[exp.category] = (costByCategory[exp.category] || 0) + exp.amount;

      // By vehicle
      if (!costByVehicle[exp.vehicle_id]) {
        costByVehicle[exp.vehicle_id] = {
          name: exp.vehicle_name,
          plate: exp.vehicle_plate,
          total: 0,
          km: 0,
          costPerKm: null,
        };
      }
      costByVehicle[exp.vehicle_id].total += exp.amount;

      // Monthly timeline
      const monthKey = exp.date ? exp.date.substring(0, 7) : '2026-08';
      const mData = monthMap.get(monthKey) || { total: 0, fuel: 0, maintenance: 0, other: 0 };
      mData.total += exp.amount;
      if (exp.category === 'CARBURANT') {
        mData.fuel += exp.amount;
      } else if (exp.category === 'MAINTENANCE' || exp.category === 'REPARATION' || exp.category === 'PNEUS') {
        mData.maintenance += exp.amount;
      } else {
        mData.other += exp.amount;
      }
      monthMap.set(monthKey, mData);
    });

    // Compute cost per km for vehicles with reliable odometer
    Object.keys(costByVehicle).forEach((vid) => {
      const vData = costByVehicle[vid];
      if (vData.km > 0) {
        vData.costPerKm = Math.round((vData.total / vData.km) * 10) / 10;
      }
    });

    const monthlyTimeline = Array.from(monthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalCost,
      totalDistanceKm,
      costPerKm,
      costByCategory,
      costByVehicle,
      monthlyTimeline,
    };
  }, [expenses, vehicles]);

  // Maintenance & Expenses CRUD Handlers
  const addMaintenanceRecord = (recordData: Partial<MaintenanceRecord>) => {
    const veh = vehicles.find((v) => v.id === recordData.vehicle_id);
    const created: MaintenanceRecord = {
      id: `maint-${Date.now()}`,
      organization_id: 'org-bcs-dakar',
      vehicle_id: recordData.vehicle_id || (vehicles[0]?.id ?? 'veh-1'),
      vehicle_name: veh?.name || recordData.vehicle_name || 'Véhicule',
      vehicle_plate: veh?.plate_number || recordData.vehicle_plate || 'DK-0000-XX',
      type: recordData.type || 'OIL_CHANGE',
      title: recordData.title || 'Entretien Véhicule',
      description: recordData.description,
      status: recordData.status || 'SCHEDULED',
      priority: recordData.priority || 'MEDIUM',
      provider: recordData.provider || 'BCS Repair Dakar',
      cost: recordData.cost || 0,
      currency: 'FCFA',
      odometer: recordData.odometer ?? veh?.odometer_km,
      engine_hours: recordData.engine_hours ?? veh?.engine_hours,
      scheduled_date: recordData.scheduled_date || new Date().toISOString().split('T')[0],
      completed_date: recordData.completed_date,
      next_due_date: recordData.next_due_date,
      next_due_odometer: recordData.next_due_odometer,
      next_due_engine_hours: recordData.next_due_engine_hours,
      invoice_number: recordData.invoice_number,
      notes: recordData.notes,
      receipt_url: recordData.receipt_url,
      created_by: user?.id,
      created_at: new Date().toISOString(),
    };

    setMaintenanceRecords((prev) => [created, ...prev]);

    // If cost > 0, automatically log corresponding expense in the ledger
    if (created.cost > 0) {
      addExpense({
        vehicle_id: created.vehicle_id,
        vehicle_name: created.vehicle_name,
        vehicle_plate: created.vehicle_plate,
        category: 'MAINTENANCE',
        amount: created.cost,
        currency: created.currency,
        date: created.completed_date || created.scheduled_date,
        supplier: created.provider,
        description: `${created.title} (${created.invoice_number || 'Entretien'})`,
      });
    }

    logAuditAction('MAINTENANCE_RECORD_CREATE', { title: created.title, vehicle: created.vehicle_plate, cost: created.cost });
  };

  const updateMaintenanceRecord = (id: string, updates: Partial<MaintenanceRecord>) => {
    setMaintenanceRecords((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m))
    );
    logAuditAction('MAINTENANCE_RECORD_UPDATE', { id, updates });
  };

  const deleteMaintenanceRecord = (id: string) => {
    setMaintenanceRecords((prev) => prev.filter((m) => m.id !== id));
    logAuditAction('MAINTENANCE_RECORD_DELETE', { id });
  };

  const addMaintenanceSchedule = (scheduleData: Partial<MaintenanceSchedule>) => {
    const veh = vehicles.find((v) => v.id === scheduleData.vehicle_id);
    const created: MaintenanceSchedule = {
      id: `sched-${Date.now()}`,
      organization_id: 'org-bcs-dakar',
      vehicle_id: scheduleData.vehicle_id || (vehicles[0]?.id ?? 'veh-1'),
      vehicle_name: veh?.name || scheduleData.vehicle_name || 'Véhicule',
      vehicle_plate: veh?.plate_number || scheduleData.vehicle_plate || 'DK-0000-XX',
      type: scheduleData.type || 'OIL_CHANGE',
      title: scheduleData.title || 'Règle d\'entretien',
      interval_km: scheduleData.interval_km,
      interval_months: scheduleData.interval_months,
      interval_engine_hours: scheduleData.interval_engine_hours,
      last_performed_date: scheduleData.last_performed_date,
      last_performed_odometer: scheduleData.last_performed_odometer ?? veh?.odometer_km,
      last_performed_engine_hours: scheduleData.last_performed_engine_hours ?? veh?.engine_hours,
      active: scheduleData.active ?? true,
      notes: scheduleData.notes,
      created_at: new Date().toISOString(),
    };

    setMaintenanceSchedules((prev) => [created, ...prev]);
    logAuditAction('MAINTENANCE_SCHEDULE_CREATE', { title: created.title, vehicle: created.vehicle_plate });
  };

  const updateMaintenanceSchedule = (id: string, updates: Partial<MaintenanceSchedule>) => {
    setMaintenanceSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    logAuditAction('MAINTENANCE_SCHEDULE_UPDATE', { id, updates });
  };

  const deleteMaintenanceSchedule = (id: string) => {
    setMaintenanceSchedules((prev) => prev.filter((s) => s.id !== id));
    logAuditAction('MAINTENANCE_SCHEDULE_DELETE', { id });
  };

  const addVehicleDocument = (docData: Partial<VehicleDocument>) => {
    const veh = vehicles.find((v) => v.id === docData.vehicle_id);
    const created: VehicleDocument = {
      id: `doc-${Date.now()}`,
      organization_id: 'org-bcs-dakar',
      vehicle_id: docData.vehicle_id || (vehicles[0]?.id ?? 'veh-1'),
      vehicle_name: veh?.name || docData.vehicle_name || 'Véhicule',
      vehicle_plate: veh?.plate_number || docData.vehicle_plate || 'DK-0000-XX',
      type: docData.type || 'VISITE_TECHNIQUE',
      title: docData.title || 'Document Véhicule',
      document_number: docData.document_number || `DOC-${Math.floor(Math.random() * 100000)}`,
      provider_or_center: docData.provider_or_center || 'Centre Dakar',
      cost: docData.cost || 0,
      issue_date: docData.issue_date || new Date().toISOString().split('T')[0],
      expiry_date: docData.expiry_date || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      file_url: docData.file_url,
      notes: docData.notes,
      created_at: new Date().toISOString(),
    };

    setVehicleDocuments((prev) => [created, ...prev]);

    if (created.cost && created.cost > 0) {
      addExpense({
        vehicle_id: created.vehicle_id,
        vehicle_name: created.vehicle_name,
        vehicle_plate: created.vehicle_plate,
        category: created.type === 'ASSURANCE' ? 'ASSURANCE' : 'AUTRE',
        amount: created.cost,
        currency: 'FCFA',
        date: created.issue_date,
        supplier: created.provider_or_center,
        description: `${created.title} (${created.document_number})`,
      });
    }

    logAuditAction('VEHICLE_DOCUMENT_CREATE', { title: created.title, doc_number: created.document_number });
  };

  const updateVehicleDocument = (id: string, updates: Partial<VehicleDocument>) => {
    setVehicleDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
    logAuditAction('VEHICLE_DOCUMENT_UPDATE', { id, updates });
  };

  const deleteVehicleDocument = (id: string) => {
    setVehicleDocuments((prev) => prev.filter((d) => d.id !== id));
    logAuditAction('VEHICLE_DOCUMENT_DELETE', { id });
  };

  const addExpense = (expData: Partial<Expense>) => {
    const veh = vehicles.find((v) => v.id === expData.vehicle_id);
    const drv = drivers.find((d) => d.id === expData.driver_id || d.assigned_vehicle_id === expData.vehicle_id);
    const created: Expense = {
      id: `exp-${Date.now()}`,
      organization_id: 'org-bcs-dakar',
      vehicle_id: expData.vehicle_id || (vehicles[0]?.id ?? 'veh-1'),
      vehicle_name: veh?.name || expData.vehicle_name || 'Véhicule Flotte',
      vehicle_plate: veh?.plate_number || expData.vehicle_plate || 'DK-0000-XX',
      driver_id: expData.driver_id || drv?.id,
      driver_name: expData.driver_name || (drv ? `${drv.first_name} ${drv.last_name}` : undefined),
      category: expData.category || 'CARBURANT',
      amount: expData.amount || 0,
      currency: expData.currency || 'FCFA',
      date: expData.date || new Date().toISOString().split('T')[0],
      supplier: expData.supplier || 'Fournisseur Dakar',
      liters: expData.liters,
      price_per_liter: expData.price_per_liter,
      odometer_at_expense: expData.odometer_at_expense ?? veh?.odometer_km,
      description: expData.description,
      receipt_url: expData.receipt_url,
      created_by: user?.id,
      created_at: new Date().toISOString(),
    };

    setExpenses((prev) => [created, ...prev]);
    logAuditAction('EXPENSE_CREATE', { category: created.category, amount: created.amount, supplier: created.supplier });
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
    logAuditAction('EXPENSE_UPDATE', { id, updates });
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    logAuditAction('EXPENSE_DELETE', { id });
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
        maintenanceRecords,
        maintenanceSchedules,
        vehicleDocuments,
        expenses,
        tcoSummary,
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
        addMaintenanceRecord,
        updateMaintenanceRecord,
        deleteMaintenanceRecord,
        addMaintenanceSchedule,
        updateMaintenanceSchedule,
        deleteMaintenanceSchedule,
        addVehicleDocument,
        updateVehicleDocument,
        deleteVehicleDocument,
        addExpense,
        updateExpense,
        deleteExpense,
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
