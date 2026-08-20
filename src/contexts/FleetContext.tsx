import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import { useAuth } from './AuthContext';
import { traccarApi } from '../services/traccar/traccarApi';
import { traccarWs } from '../services/traccar/traccarWebSocket';
import { traccarEventManager } from '../services/traccar/traccarEvents';

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

// Safe JSON parser for localStorage persistence
function loadPersisted<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

const FleetContext = createContext<FleetContextType | undefined>(undefined);

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // 100% Real Production State with local persistence
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>(() => loadPersisted('bcs_fleet_drivers', []));
  const [devices, setDevices] = useState<Device[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>(() => loadPersisted('bcs_fleet_geofences', []));
  const [alerts, setAlerts] = useState<Alert[]>(() => loadPersisted('bcs_fleet_alerts', []));
  const [toastNotification, setToastNotification] = useState<Alert | null>(null);
  const [alertRules, setAlertRules] = useState<AlertRuleConfig>(() =>
    loadPersisted('bcs_fleet_alert_rules', DEFAULT_ALERT_RULES)
  );
  const [settings, setSettings] = useState<CompanySettings>(() =>
    loadPersisted('bcs_fleet_settings', DEFAULT_SETTINGS)
  );
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Maintenance & Expenses State
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>(() =>
    loadPersisted('bcs_fleet_maint_records', [])
  );
  const [maintenanceSchedules, setMaintenanceSchedules] = useState<MaintenanceSchedule[]>(() =>
    loadPersisted('bcs_fleet_maint_schedules', [])
  );
  const [vehicleDocuments, setVehicleDocuments] = useState<VehicleDocument[]>(() =>
    loadPersisted('bcs_fleet_veh_docs', [])
  );
  const [expenses, setExpenses] = useState<Expense[]>(() => loadPersisted('bcs_fleet_expenses', []));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadPersisted('bcs_fleet_audit_logs', []));

  // Persist state updates to localStorage
  useEffect(() => {
    localStorage.setItem('bcs_fleet_drivers', JSON.stringify(drivers));
  }, [drivers]);

  useEffect(() => {
    localStorage.setItem('bcs_fleet_geofences', JSON.stringify(geofences));
  }, [geofences]);

  useEffect(() => {
    localStorage.setItem('bcs_fleet_alerts', JSON.stringify(alerts.slice(0, 500)));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('bcs_fleet_maint_records', JSON.stringify(maintenanceRecords));
  }, [maintenanceRecords]);

  useEffect(() => {
    localStorage.setItem('bcs_fleet_maint_schedules', JSON.stringify(maintenanceSchedules));
  }, [maintenanceSchedules]);

  useEffect(() => {
    localStorage.setItem('bcs_fleet_veh_docs', JSON.stringify(vehicleDocuments));
  }, [vehicleDocuments]);

  useEffect(() => {
    localStorage.setItem('bcs_fleet_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('bcs_fleet_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('bcs_fleet_alert_rules', JSON.stringify(alertRules));
  }, [alertRules]);

  useEffect(() => {
    localStorage.setItem('bcs_fleet_settings', JSON.stringify(settings));
  }, [settings]);

  const clearToast = () => setToastNotification(null);

  // Helper to add an alert with deduplication and notification dispatch
  const pushAlert = useCallback((newAlert: Alert) => {
    setAlerts((prev) => {
      // Deduplicate by ID
      if (prev.some((a) => a.id === newAlert.id)) {
        return prev;
      }
      return [newAlert, ...prev.slice(0, 499)];
    });

    if (newAlert.severity === 'CRITICAL' || newAlert.severity === 'WARNING') {
      setToastNotification(newAlert);
    }

    // Browser Notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(newAlert.title || `Alerte: ${newAlert.vehicle_name}`, {
          body: `${newAlert.vehicle_plate} — ${newAlert.message}`,
          icon: '/favicon.svg',
        });
      } catch (err) {
        console.warn('Browser notification notice:', err);
      }
    }
  }, []);

  // Request Browser Notification Permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Convert real Traccar Device & Position to Vehicle object
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

    const lastPosTime = position?.fixTime || position?.deviceTime || device.lastUpdate || new Date().toISOString();
    const odometerMeters = position?.attributes?.totalDistance || position?.attributes?.distance || 0;
    const odometerKm = Math.round((odometerMeters / 1000) * 10) / 10;

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
        odometer_km: odometerKm > 0 ? odometerKm : existingMetier.odometer_km || 0,
        last_position_time: lastPosTime,
        active: true,
      };
    }

    return {
      id: `veh-traccar-${device.id}`,
      name: device.name || `Traceur GPS (${device.uniqueId})`,
      plate_number: device.uniqueId,
      brand: 'GPS Traccar',
      model: 'Traceur',
      year: 2024,
      color: 'Gris',
      vehicle_type: 'PICKUP',
      group_name: 'FLOTTE ACTIVE',
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
      battery_level: position?.attributes?.batteryLevel ?? position?.attributes?.battery ?? null,
      ignition_on: position?.attributes?.ignition ?? false,
      engine_locked: false,
      odometer_km: odometerKm,
      last_position_time: lastPosTime,
      active: true,
    };
  };

  // Synchronize 100% Real Traccar Data (REST + WebSocket)
  useEffect(() => {
    const syncLiveTraccarData = async () => {
      try {
        const [devicesData, positionsData] = await Promise.all([
          traccarApi.getDevices(),
          traccarApi.getPositions(),
        ]);

        if (devicesData) {
          // Update devices array
          setDevices(
            devicesData.map((d) => ({
              id: d.id.toString(),
              name: d.name || `Traceur ${d.uniqueId}`,
              imei: d.uniqueId,
              model: 'GPS Tracker',
              status: d.status === 'online' ? 'ONLINE' : 'OFFLINE',
              last_communication: d.lastUpdate || new Date().toISOString(),
            }))
          );

          const positionsMap = new Map<number, TraccarPosition>();
          if (positionsData) {
            positionsData.forEach((p) => positionsMap.set(p.deviceId, p));
          }

          setVehicles((prevMetierVehicles) => {
            return devicesData.map((d) => {
              const pos = positionsMap.get(d.id);
              const existing = prevMetierVehicles.find(
                (v) => v.traccar_id === d.id || v.device_id === d.id.toString() || v.device_imei === d.uniqueId
              );
              const liveVeh = buildLiveVehicleFromTraccar(d, pos, existing);

              // Evaluate Telemetry rules via centralized manager
              const generated = traccarEventManager.evaluateTelemetry(liveVeh, alertRules, geofences);
              generated.forEach((alt) => pushAlert(alt));

              return liveVeh;
            });
          });
        }
      } catch (err) {
        console.warn('Notice: Traccar Live REST Sync:', err);
      }
    };

    syncLiveTraccarData();
    const intervalId = setInterval(syncLiveTraccarData, 12000);

    // Register immediate sync callback when WebSocket reconnects
    const unsubscribeReconnect = traccarWs.onReconnect(() => {
      syncLiveTraccarData();
    });

    // WebSocket Realtime Subscribers
    traccarWs.connect();
    const unsubscribe = traccarWs.subscribe((wsMessage) => {
      // 1. Process positions stream
      if (wsMessage.positions && wsMessage.positions.length > 0) {
        wsMessage.positions.forEach((pos) => {
          setVehicles((prev) =>
            prev.map((v) => {
              if (v.traccar_id === pos.deviceId || v.device_id === pos.deviceId.toString()) {
                const rawSpeed = pos.speed || 0;
                const speedKmh = Math.round(rawSpeed * 1.852 * 10) / 10;
                const isMoving = speedKmh >= 3.0 && (pos.attributes?.ignition || pos.attributes?.motion);
                const effectiveSpeed = isMoving ? speedKmh : 0;
                const odometerMeters = pos.attributes?.totalDistance || pos.attributes?.distance || 0;
                const odometerKm = odometerMeters > 0 ? Math.round((odometerMeters / 1000) * 10) / 10 : v.odometer_km;

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
                  odometer_km: odometerKm,
                  last_position_time: pos.fixTime || pos.deviceTime || new Date().toISOString(),
                };

                const generated = traccarEventManager.evaluateTelemetry(updated, alertRules, geofences);
                generated.forEach((alt) => pushAlert(alt));

                return updated;
              }
              return v;
            })
          );
        });
      }

      // 2. Process Traccar Events Stream via central normalizer
      if (wsMessage.events && wsMessage.events.length > 0) {
        wsMessage.events.forEach((evt: any) => {
          setVehicles((currentVehicles) => {
            const normalizedAlert = traccarEventManager.processTraccarRawEvent(evt, currentVehicles, geofences);
            if (normalizedAlert) {
              pushAlert(normalizedAlert);
            }
            return currentVehicles;
          });
        });
      }
    });

    return () => {
      clearInterval(intervalId);
      unsubscribe();
      unsubscribeReconnect();
    };
  }, [alertRules, geofences, pushAlert]);

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
      group_name: newVehData.group_name || 'FLOTTE ACTIVE',
      vehicle_type: newVehData.vehicle_type || 'PICKUP',
      driver_id: newVehData.driver_id || null,
      driver_name: newVehData.driver_name || 'Non assigné',
      traccar_id: newVehData.traccar_id,
      device_id: newVehData.device_id,
      device_imei: newVehData.device_imei,
      status: 'STOPPED',
      comm_status: 'OFFLINE',
      current_speed: 0,
      current_heading: 0,
      current_lat: 14.7869,
      current_lng: -17.3767,
      battery_level: null,
      ignition_on: false,
      engine_locked: false,
      odometer_km: newVehData.odometer_km || 0,
      last_position_time: new Date().toISOString(),
      active: true,
    };
    setVehicles((prev) => [created, ...prev]);
    logAuditAction('VEHICLE_CREATE', { vehicle_id: created.id, name: created.name });
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));
    logAuditAction('VEHICLE_UPDATE', { vehicle_id: id, updates });
  };

  const deleteVehicle = (id: string) => {
    const v = vehicles.find((veh) => veh.id === id);
    setVehicles((prev) => prev.filter((veh) => veh.id !== id));
    logAuditAction('VEHICLE_DELETE', { vehicle_id: id, name: v?.name });
  };

  const addDriver = (newDriver: Partial<Driver>) => {
    const created: Driver = {
      id: `drv-${Date.now()}`,
      first_name: newDriver.first_name || 'Nouveau',
      last_name: newDriver.last_name || 'Chauffeur',
      phone: newDriver.phone || '+221 77 000 00 00',
      email: newDriver.email,
      license_number: newDriver.license_number || 'SN-PERMIS-000',
      license_expiry_date: newDriver.license_expiry_date || new Date(Date.now() + 31536000000).toISOString().split('T')[0],
      status: 'ACTIVE',
      assigned_vehicle_id: newDriver.assigned_vehicle_id,
      assigned_vehicle_name: newDriver.assigned_vehicle_name,
    };
    setDrivers((prev) => [created, ...prev]);
    logAuditAction('DRIVER_CREATE', { driver_id: created.id, name: `${created.first_name} ${created.last_name}` });
  };

  const updateDriver = (id: string, updates: Partial<Driver>) => {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
    logAuditAction('DRIVER_UPDATE', { driver_id: id, updates });
  };

  const deleteDriver = (id: string) => {
    setDrivers((prev) => prev.filter((d) => d.id !== id));
    logAuditAction('DRIVER_DELETE', { driver_id: id });
  };

  const addDevice = (newDevice: Partial<Device>) => {
    const created: Device = {
      id: `dev-${Date.now()}`,
      name: newDevice.name || `Boîtier ${newDevice.imei || ''}`,
      imei: newDevice.imei || '000000000000000',
      model: newDevice.model || 'Teltonika FMB920',
      status: 'ONLINE',
      sim_number: newDevice.sim_number || '+221 77 000 00 00',
      last_communication: new Date().toISOString(),
    };
    setDevices((prev) => [created, ...prev]);
    logAuditAction('DEVICE_REGISTER', { device_id: created.id, imei: created.imei });
  };

  const addGeofence = (geofence: Geofence) => {
    setGeofences((prev) => [geofence, ...prev]);
    logAuditAction('GEOFENCE_CREATE', { geofence_id: geofence.id, name: geofence.name });
  };

  const updateGeofence = (id: string, updates: Partial<Geofence>) => {
    setGeofences((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
    logAuditAction('GEOFENCE_UPDATE', { geofence_id: id });
  };

  const deleteGeofence = (id: string) => {
    setGeofences((prev) => prev.filter((g) => g.id !== id));
    logAuditAction('GEOFENCE_DELETE', { geofence_id: id });
  };

  const markAlertRead = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
  };

  const acknowledgeAlert = (id: string) => {
    const nowIso = new Date().toISOString();
    const ackUser = user?.email || 'admin@bcsfleet.sn';

    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              is_read: true,
              acknowledged: true,
              acknowledged_by: ackUser,
              acknowledged_at: nowIso,
            }
          : a
      )
    );

    logAuditAction('ALERT_ACKNOWLEDGED', {
      alert_id: id,
      acknowledged_by: ackUser,
      acknowledged_at: nowIso,
    });
  };

  const markAllAlertsRead = () => {
    const nowIso = new Date().toISOString();
    const ackUser = user?.email || 'admin@bcsfleet.sn';

    setAlerts((prev) =>
      prev.map((a) => ({
        ...a,
        is_read: true,
        acknowledged: true,
        acknowledged_by: a.acknowledged_by || ackUser,
        acknowledged_at: a.acknowledged_at || nowIso,
      }))
    );

    logAuditAction('ALL_ALERTS_ACKNOWLEDGED', { acknowledged_by: ackUser });
  };

  const updateAlertRules = (newRules: Partial<AlertRuleConfig>) => {
    setAlertRules((prev) => {
      const updated = { ...prev, ...newRules };
      logAuditAction('ALERT_RULE_UPDATED', { new_rules: updated });
      return updated;
    });
  };

  // Maintenance & Expenses CRUD
  const addMaintenanceRecord = (record: Partial<MaintenanceRecord>) => {
    const newRecord: MaintenanceRecord = {
      id: `maint-${Date.now()}`,
      vehicle_id: record.vehicle_id || '',
      vehicle_name: record.vehicle_name || '',
      vehicle_plate: record.vehicle_plate || '',
      type: record.type || 'OIL_CHANGE',
      title: record.title || 'Entretien',
      description: record.description,
      status: record.status || 'SCHEDULED',
      priority: record.priority || 'MEDIUM',
      provider: record.provider || 'Garage Partenaire',
      cost: Number(record.cost) || 0,
      currency: 'FCFA',
      odometer: record.odometer,
      scheduled_date: record.scheduled_date || new Date().toISOString().split('T')[0],
      completed_date: record.completed_date,
      created_at: new Date().toISOString(),
    };
    setMaintenanceRecords((prev) => [newRecord, ...prev]);

    if (newRecord.cost > 0 && newRecord.status === 'COMPLETED') {
      addExpense({
        vehicle_id: newRecord.vehicle_id,
        vehicle_name: newRecord.vehicle_name,
        vehicle_plate: newRecord.vehicle_plate,
        category: 'MAINTENANCE',
        amount: newRecord.cost,
        currency: 'FCFA',
        date: newRecord.completed_date || newRecord.scheduled_date,
        supplier: newRecord.provider,
        description: `Entretien: ${newRecord.title}`,
      });
    }

    logAuditAction('MAINTENANCE_RECORD_ADD', { id: newRecord.id, title: newRecord.title });
  };

  const updateMaintenanceRecord = (id: string, updates: Partial<MaintenanceRecord>) => {
    setMaintenanceRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const deleteMaintenanceRecord = (id: string) => {
    setMaintenanceRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const addMaintenanceSchedule = (schedule: Partial<MaintenanceSchedule>) => {
    const newSched: MaintenanceSchedule = {
      id: `sched-${Date.now()}`,
      vehicle_id: schedule.vehicle_id || '',
      vehicle_name: schedule.vehicle_name || '',
      vehicle_plate: schedule.vehicle_plate || '',
      type: schedule.type || 'OIL_CHANGE',
      title: schedule.title || 'Planification Entretien',
      interval_km: schedule.interval_km,
      interval_months: schedule.interval_months,
      active: true,
      created_at: new Date().toISOString(),
    };
    setMaintenanceSchedules((prev) => [newSched, ...prev]);
  };

  const updateMaintenanceSchedule = (id: string, updates: Partial<MaintenanceSchedule>) => {
    setMaintenanceSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteMaintenanceSchedule = (id: string) => {
    setMaintenanceSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const addVehicleDocument = (doc: Partial<VehicleDocument>) => {
    const newDoc: VehicleDocument = {
      id: `doc-${Date.now()}`,
      vehicle_id: doc.vehicle_id || '',
      vehicle_name: doc.vehicle_name || '',
      vehicle_plate: doc.vehicle_plate || '',
      type: doc.type || 'ASSURANCE',
      title: doc.title || 'Document',
      document_number: doc.document_number || 'N/A',
      provider_or_center: doc.provider_or_center || 'N/A',
      issue_date: doc.issue_date || new Date().toISOString().split('T')[0],
      expiry_date: doc.expiry_date || new Date(Date.now() + 31536000000).toISOString().split('T')[0],
      cost: doc.cost,
      created_at: new Date().toISOString(),
    };
    setVehicleDocuments((prev) => [newDoc, ...prev]);
  };

  const updateVehicleDocument = (id: string, updates: Partial<VehicleDocument>) => {
    setVehicleDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  };

  const deleteVehicleDocument = (id: string) => {
    setVehicleDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const addExpense = (expense: Partial<Expense>) => {
    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      vehicle_id: expense.vehicle_id || '',
      vehicle_name: expense.vehicle_name || '',
      vehicle_plate: expense.vehicle_plate || '',
      driver_name: expense.driver_name,
      category: expense.category || 'CARBURANT',
      amount: Number(expense.amount) || 0,
      currency: 'FCFA',
      date: expense.date || new Date().toISOString().split('T')[0],
      supplier: expense.supplier || 'Station Service',
      description: expense.description,
      liters: expense.liters,
      price_per_liter: expense.price_per_liter,
      created_at: new Date().toISOString(),
    };
    setExpenses((prev) => [newExp, ...prev]);
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // Compute Real TCO Summary
  const tcoSummary = useMemo<TCOSummary>(() => {
    const totalCost = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const totalDistanceKm = vehicles.reduce((acc, v) => acc + (v.odometer_km || 0), 0);
    const costPerKm = totalDistanceKm > 0 && totalCost > 0 ? Math.round(totalCost / totalDistanceKm) : null;

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

    expenses.forEach((e) => {
      const cat = e.category as ExpenseCategory;
      if (costByCategory[cat] !== undefined) {
        costByCategory[cat] += Number(e.amount) || 0;
      }
    });

    return {
      totalCost,
      totalDistanceKm,
      costPerKm,
      costByCategory,
      costByVehicle: {},
      monthlyTimeline: [],
    };
  }, [expenses, vehicles]);

  const toggleEngineImmobilizer = async (vehicleId: string, lock: boolean): Promise<boolean> => {
    const targetVeh = vehicles.find((v) => v.id === vehicleId);
    if (!targetVeh) return false;

    if (targetVeh.traccar_id) {
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
