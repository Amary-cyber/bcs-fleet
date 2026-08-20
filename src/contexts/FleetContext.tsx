import React, { createContext, useContext, useState, useEffect } from 'react';
import { Vehicle, Driver, Device, Geofence, Alert, AuditLog, CompanySettings, TraccarPosition, TraccarDevice } from '../types';
import { useTraccar } from './TraccarContext';
import { useAuth } from './AuthContext';
import { traccarApi } from '../services/traccar/traccarApi';
import { traccarWs } from '../services/traccar/traccarWebSocket';
import { demoSimulator, DAKAR_GEOFENCES, DEMO_DRIVERS, DEMO_DEVICES, INITIAL_DEMO_VEHICLES } from '../services/demo/demoSimulator';

interface FleetContextType {
  vehicles: Vehicle[];
  drivers: Driver[];
  devices: Device[];
  geofences: Geofence[];
  alerts: Alert[];
  auditLogs: AuditLog[];
  settings: CompanySettings;
  selectedVehicle: Vehicle | null;
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
  deleteGeofence: (id: string) => void;
  markAlertRead: (id: string) => void;
  markAllAlertsRead: () => void;
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

const FleetContext = createContext<FleetContextType | undefined>(undefined);

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDemoMode } = useTraccar();
  const { user } = useAuth();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>(DEMO_DRIVERS);
  const [devices, setDevices] = useState<Device[]>(DEMO_DEVICES);
  const [geofences, setGeofences] = useState<Geofence[]>(DAKAR_GEOFENCES);
  const [alerts, setAlerts] = useState<Alert[]>([]);
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
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

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
    const effectiveStatus = commStatus === 'OFFLINE'
      ? 'OFFLINE'
      : (existingMetier?.engine_locked
        ? 'STOPPED'
        : isMoving
        ? 'MOVING'
        : 'STOPPED');

    if (existingMetier) {
      return {
        ...existingMetier,
        traccar_id: device.id,
        device_id: device.id.toString(),
        device_imei: device.uniqueId,
        status: effectiveStatus,
        comm_status: commStatus,
        current_lat: position ? position.latitude : existingMetier.current_lat,
        current_lng: position ? position.longitude : existingMetier.current_lng,
        current_speed: effectiveSpeed,
        current_heading: position ? Math.round(position.course || 0) : existingMetier.current_heading,
        last_position_time: position?.fixTime || device.lastUpdate || new Date().toISOString(),
        battery_level: position?.attributes?.batteryLevel ?? existingMetier.battery_level,
        fuel_level: position?.attributes?.fuelLevel ?? position?.attributes?.fuel ?? existingMetier.fuel_level,
        engine_temp: position?.attributes?.temp1 ?? position?.attributes?.temp ?? existingMetier.engine_temp,
        ignition_on: !!position?.attributes?.ignition,
      };
    }

    return {
      id: `traccar-${device.id}`,
      name: device.name || `Device ${device.uniqueId}`,
      plate_number: device.uniqueId,
      brand: 'Traccar',
      model: 'GPS Tracker',
      year: 2024,
      color: 'Gris',
      vin: `IMEI-${device.uniqueId}`,
      group_name: 'FLOTTE LIVE',
      vehicle_type: 'SEDAN',
      driver_name: 'Chauffeur GPS',
      device_id: device.id.toString(),
      device_imei: device.uniqueId,
      traccar_id: device.id,
      status: effectiveStatus,
      comm_status: commStatus,
      current_speed: effectiveSpeed,
      current_heading: position ? Math.round(position.course || 0) : 0,
      current_lat: position ? position.latitude : 14.6937,
      current_lng: position ? position.longitude : -17.4583,
      battery_level: position?.attributes?.batteryLevel ?? 100,
      fuel_level: position?.attributes?.fuelLevel ?? position?.attributes?.fuel ?? null,
      engine_temp: position?.attributes?.temp1 ?? position?.attributes?.temp ?? null,
      engine_hours: null,
      ignition_on: !!position?.attributes?.ignition,
      engine_locked: false,
      odometer_km: position?.attributes?.totalDistance ? Number((position.attributes.totalDistance / 1000).toFixed(1)) : 0,
      last_position_time: position?.fixTime || device.lastUpdate || new Date().toISOString(),
      notes: `Traceur Traccar ID ${device.id} (${device.uniqueId})`,
    };
  };

  // Subscribe to simulator or traccar position stream
  useEffect(() => {
    if (isDemoMode) {
      const unsubVehicles = demoSimulator.subscribe((updatedVehicles) => {
        setVehicles([...updatedVehicles]);
        if (selectedVehicle) {
          const match = updatedVehicles.find((v) => v.id === selectedVehicle.id);
          if (match) setSelectedVehicle(match);
        }
      });

      const unsubAlerts = demoSimulator.subscribeAlerts((newAlert) => {
        setAlerts((prev) => [newAlert, ...prev]);
      });

      setAlerts(demoSimulator.getAlerts());

      return () => {
        unsubVehicles();
        unsubAlerts();
      };
    } else {
      // MODE LIVE: Sync exclusively with Traccar 6.5 REST API & WebSocket
      const syncTraccarLiveState = async () => {
        try {
          const traccarDevices = await traccarApi.getDevices();
          const traccarPositions = await traccarApi.getPositions();

          if (traccarDevices && traccarDevices.length > 0) {
            const liveVehicles: Vehicle[] = traccarDevices.map((device) => {
              const pos = traccarPositions?.find((p) => p.deviceId === device.id);
              const metierMatch = INITIAL_DEMO_VEHICLES.find(
                (v) =>
                  v.traccar_id === device.id ||
                  v.device_id === device.id.toString() ||
                  v.device_imei === device.uniqueId
              );
              return buildLiveVehicleFromTraccar(device, pos, metierMatch);
            });

            setVehicles(liveVehicles);
            if (selectedVehicle) {
              const match = liveVehicles.find((v) => v.traccar_id === selectedVehicle.traccar_id || v.device_imei === selectedVehicle.device_imei);
              if (match) setSelectedVehicle(match);
            }
          }
        } catch (err) {
          console.warn('Notice: Traccar REST API sync:', err);
        }
      };

      syncTraccarLiveState();

      // Subscribe to Traccar WebSocket real-time updates
      const unsubWs = traccarWs.subscribe((data) => {
        if ((data.positions && data.positions.length > 0) || (data.devices && data.devices.length > 0)) {
          setVehicles((prevVehicles) => {
            const updated = [...prevVehicles];

            if (data.devices) {
              data.devices.forEach((dev) => {
                const idx = updated.findIndex((v) => v.traccar_id === dev.id || v.device_imei === dev.uniqueId);
                if (idx !== -1) {
                  updated[idx] = {
                    ...updated[idx],
                    comm_status: dev.status === 'online' ? 'ONLINE' : 'OFFLINE',
                    status: dev.status === 'online' ? updated[idx].status : 'OFFLINE',
                  };
                }
              });
            }

            if (data.positions) {
              data.positions.forEach((pos) => {
                const idx = updated.findIndex((v) => v.traccar_id === pos.deviceId || v.device_id === pos.deviceId.toString());
                if (idx !== -1) {
                  const target = updated[idx];
                  const rawSpeed = pos.speed || 0;
                  const speedKmh = Math.round(rawSpeed * 1.852 * 10) / 10;
                  const isMoving = speedKmh >= 3.0 && (pos.attributes?.ignition || pos.attributes?.motion);
                  const effectiveSpeed = isMoving ? speedKmh : 0;
                  const effectiveStatus = target.engine_locked
                    ? 'STOPPED'
                    : isMoving
                    ? 'MOVING'
                    : 'STOPPED';

                  updated[idx] = {
                    ...target,
                    current_lat: pos.latitude,
                    current_lng: pos.longitude,
                    current_speed: effectiveSpeed,
                    current_heading: Math.round(pos.course || 0),
                    last_position_time: pos.fixTime || new Date().toISOString(),
                    status: effectiveStatus,
                    comm_status: 'ONLINE',
                    ignition_on: !!pos.attributes?.ignition,
                    battery_level: pos.attributes?.batteryLevel ?? target.battery_level,
                    fuel_level: pos.attributes?.fuelLevel ?? pos.attributes?.fuel ?? target.fuel_level,
                    engine_temp: pos.attributes?.temp1 ?? pos.attributes?.temp ?? target.engine_temp,
                  };
                }
              });
            }

            return updated;
          });
        }
      });

      return () => {
        unsubWs();
      };
    }
  }, [isDemoMode, selectedVehicle]);

  const logAuditAction = (action: string, details?: Record<string, any>) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      user_id: user?.id,
      user_email: user?.email || 'system@bcsfleet.sn',
      user_role: user?.role || 'VIEWER',
      action,
      details,
      created_at: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const addVehicle = (v: Partial<Vehicle>) => {
    const newV: Vehicle = {
      id: `veh-${Date.now()}`,
      name: v.name || 'Nouveau Véhicule',
      plate_number: v.plate_number || 'DK-0000-XX',
      brand: v.brand || 'Toyota',
      model: v.model || 'Standard',
      year: v.year || 2024,
      color: v.color || 'Blanc',
      vin: v.vin || `VIN${Date.now()}`,
      group_name: v.group_name || 'LIVRAISON',
      vehicle_type: v.vehicle_type || 'PICKUP',
      driver_id: v.driver_id || null,
      driver_name: v.driver_name || 'Non assigné',
      device_id: v.device_id || null,
      device_imei: v.device_imei || 'Non associé',
      status: 'STOPPED',
      comm_status: 'ONLINE',
      current_speed: 0,
      current_heading: 0,
      current_lat: 14.6937,
      current_lng: -17.4583,
      battery_level: 100,
      fuel_level: null,
      engine_temp: null,
      engine_hours: null,
      ignition_on: false,
      engine_locked: false,
      odometer_km: v.odometer_km || 0,
      last_position_time: new Date().toISOString(),
      notes: v.notes || '',
    };
    setVehicles((prev) => [...prev, newV]);
    logAuditAction('VEHICLE_ADD', { name: newV.name, plate: newV.plate_number });
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
    logAuditAction('VEHICLE_UPDATE', { id, updates });
  };

  const deleteVehicle = (id: string) => {
    const target = vehicles.find((v) => v.id === id);
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    logAuditAction('VEHICLE_DELETE', { id, plate: target?.plate_number });
  };

  const addDriver = (d: Partial<Driver>) => {
    const newD: Driver = {
      id: `drv-${Date.now()}`,
      first_name: d.first_name || '',
      last_name: d.last_name || '',
      phone: d.phone || '+221 77 000 00 00',
      email: d.email || '',
      license_number: d.license_number || 'SN-PERMIS-000',
      license_expiry_date: d.license_expiry_date || '2030-01-01',
      status: 'ACTIVE',
      notes: d.notes || '',
    };
    setDrivers((prev) => [...prev, newD]);
    logAuditAction('DRIVER_ADD', { name: `${newD.first_name} ${newD.last_name}` });
  };

  const updateDriver = (id: string, updates: Partial<Driver>) => {
    setDrivers((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
    logAuditAction('DRIVER_UPDATE', { id, updates });
  };

  const deleteDriver = (id: string) => {
    setDrivers((prev) => prev.filter((d) => d.id !== id));
    logAuditAction('DRIVER_DELETE', { id });
  };

  const addDevice = (d: Partial<Device>) => {
    const newDev: Device = {
      id: `dev-${Date.now()}`,
      name: d.name || 'Traceur GPS',
      imei: d.imei || `86${Date.now()}`,
      model: d.model || 'Teltonika FMB920',
      protocol: d.protocol || 'teltonika',
      sim_number: d.sim_number || '',
      status: 'ONLINE',
      last_communication: new Date().toISOString(),
    };
    setDevices((prev) => [...prev, newDev]);
    logAuditAction('DEVICE_ADD', { imei: newDev.imei, model: newDev.model });
  };

  const addGeofence = (g: Geofence) => {
    setGeofences((prev) => [...prev, g]);
    logAuditAction('GEOFENCE_CREATE', { name: g.name, type: g.type });
  };

  const deleteGeofence = (id: string) => {
    setGeofences((prev) => prev.filter((g) => g.id !== id));
    logAuditAction('GEOFENCE_DELETE', { id });
  };

  const markAlertRead = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
    );
  };

  const markAllAlertsRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
  };

  const toggleEngineImmobilizer = async (vehicleId: string, lock: boolean): Promise<boolean> => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return false;

    if (vehicle.current_speed > 0) {
      alert('SÉCURITÉ: Impossible d\'immobiliser un véhicule en mouvement!');
      return false;
    }

    if (isDemoMode) {
      demoSimulator.setVehicleEngineLocked(vehicleId, lock);
    } else if (vehicle.traccar_id) {
      await traccarApi.sendEngineCommand(vehicle.traccar_id, lock ? 'engineStop' : 'engineResume');
    }

    setVehicles((prev) =>
      prev.map((v) =>
        v.id === vehicleId
          ? {
              ...v,
              engine_locked: lock,
              status: lock ? 'STOPPED' : v.status,
              ignition_on: lock ? false : v.ignition_on,
            }
          : v
      )
    );

    logAuditAction(lock ? 'ENGINE_IMMOBILIZED' : 'ENGINE_RESTORED', {
      vehicle_id: vehicleId,
      plate: vehicle.plate_number,
      executed_by: user?.email,
    });

    return true;
  };

  const updateSettings = (newSettings: Partial<CompanySettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    logAuditAction('SETTINGS_UPDATED', newSettings);
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
        selectedVehicle,
        setSelectedVehicle,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        addDriver,
        updateDriver,
        deleteDriver,
        addDevice,
        addGeofence,
        deleteGeofence,
        markAlertRead,
        markAllAlertsRead,
        toggleEngineImmobilizer,
        logAuditAction,
        updateSettings,
      }}
    >
      {children}
    </FleetContext.Provider>
  );
};

export const useFleet = () => {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
};
