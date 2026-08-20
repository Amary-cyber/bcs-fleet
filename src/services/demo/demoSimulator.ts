import {
  Vehicle,
  Alert,
  Driver,
  Device,
  Geofence,
  Trip,
  CommunicationStatus,
  MaintenanceRecord,
  MaintenanceSchedule,
  VehicleDocument,
  Expense,
} from '../../types';

// Helper for status and comm_status computation
export const computeVehicleStatuses = (
  speedKmh: number,
  ignition: boolean,
  motion: boolean | undefined,
  lastPositionIso: string,
  engineLocked: boolean,
  currentStatus: Vehicle['status'],
  onlineSec = 120,
  delayedSec = 600,
  speedThresholdKmh = 3.0
): { status: Vehicle['status']; comm_status: CommunicationStatus; speed: number } => {
  const now = Date.now();
  const lastTime = new Date(lastPositionIso).getTime();
  const elapsedSec = Math.max(0, (now - lastTime) / 1000);

  let comm_status: CommunicationStatus = 'ONLINE';
  if (elapsedSec > delayedSec) {
    comm_status = 'OFFLINE';
  } else if (elapsedSec > onlineSec) {
    comm_status = 'DELAYED';
  }

  // Speed jitter suppression below threshold (0 - 2.9 km/h)
  let effectiveSpeed = speedKmh;
  if (effectiveSpeed < speedThresholdKmh) {
    effectiveSpeed = 0;
  }

  let status: Vehicle['status'] = 'STOPPED';

  if (comm_status === 'OFFLINE' || engineLocked) {
    status = 'OFFLINE';
    effectiveSpeed = 0;
  } else if (currentStatus === 'ALERT') {
    status = 'ALERT';
  } else if (effectiveSpeed >= speedThresholdKmh && (ignition || motion)) {
    status = 'MOVING';
  } else {
    status = 'STOPPED';
    effectiveSpeed = 0;
  }

  return { status, comm_status, speed: effectiveSpeed };
};

export const DAKAR_GEOFENCES: Geofence[] = [
  {
    id: 'geo-1',
    name: 'Agence Dakar (Point E)',
    category: 'Agence',
    type: 'CIRCLE',
    coordinates: { center: [14.6937, -17.4583], radius: 400 },
    color: '#10B981',
    notify_on_enter: true,
    notify_on_exit: true,
  },
  {
    id: 'geo-2',
    name: 'Entrepôt Rufisque',
    category: 'Entrepôt',
    type: 'POLYGON',
    coordinates: [
      [14.7150, -17.2720],
      [14.7180, -17.2680],
      [14.7140, -17.2620],
      [14.7110, -17.2660],
    ],
    color: '#3B82F6',
    notify_on_enter: true,
    notify_on_exit: true,
  },
  {
    id: 'geo-3',
    name: 'Zone Portuaire & Plateau',
    category: 'Zone de livraison',
    type: 'POLYGON',
    coordinates: [
      [14.6780, -17.4350],
      [14.6850, -17.4280],
      [14.6720, -17.4220],
      [14.6650, -17.4300],
    ],
    color: '#8B5CF6',
    notify_on_enter: true,
    notify_on_exit: false,
  },
  {
    id: 'geo-4',
    name: 'Zone Restreinte - Aéroport DSS',
    category: 'Zone interdite',
    type: 'CIRCLE',
    coordinates: { center: [14.6710, -17.0730], radius: 1200 },
    color: '#EF4444',
    speed_limit: 50,
    notify_on_enter: true,
    notify_on_exit: true,
  },
];

export const DEMO_DRIVERS: Driver[] = [
  {
    id: 'drv-1',
    first_name: 'Mamadou',
    last_name: 'Ndiaye',
    email: 'mamadou.ndiaye@bcsfleet.sn',
    phone: '+221 77 123 45 67',
    license_number: 'SN-PERMIS-88902',
    license_expiry_date: '2028-06-15',
    status: 'ACTIVE',
    notes: 'Chauffeur senior, 8 ans d\'expérience',
    assigned_vehicle_id: 'veh-1',
    assigned_vehicle_name: 'Toyota Hilux #1',
  },
  {
    id: 'drv-2',
    first_name: 'Ousmane',
    last_name: 'Diop',
    email: 'ousmane.diop@bcsfleet.sn',
    phone: '+221 78 234 56 78',
    license_number: 'SN-PERMIS-54321',
    license_expiry_date: '2027-11-20',
    status: 'ACTIVE',
    notes: 'Spécialiste de la livraison urbaine VDN',
    assigned_vehicle_id: 'veh-2',
    assigned_vehicle_name: 'Ford Ranger #2',
  },
  {
    id: 'drv-3',
    first_name: 'Ibrahima',
    last_name: 'Sall',
    email: 'ibrahima.sall@bcsfleet.sn',
    phone: '+221 76 345 67 89',
    license_number: 'SN-PERMIS-11223',
    license_expiry_date: '2026-09-30',
    status: 'ACTIVE',
    notes: 'Affecté aux transferts de marchandise Rufisque',
    assigned_vehicle_id: 'veh-3',
    assigned_vehicle_name: 'Renault Master #3',
  },
  {
    id: 'drv-4',
    first_name: 'Awa',
    last_name: 'Sow',
    email: 'awa.sow@bcsfleet.sn',
    phone: '+221 70 456 78 90',
    license_number: 'SN-PERMIS-99887',
    license_expiry_date: '2029-01-10',
    status: 'ACTIVE',
    notes: 'Superviseure logistique & conductrice d\'urgence',
    assigned_vehicle_id: 'veh-4',
    assigned_vehicle_name: 'Mercedes Sprinter #4',
  },
];

export const DEMO_DEVICES: Device[] = [
  {
    id: 'dev-1',
    traccar_id: 1,
    name: 'iPhone Amary (Traccar Client)',
    imei: '70493225',
    model: 'Apple iPhone (Traccar Client)',
    protocol: 'osmand',
    sim_number: '+221 77 000 11 22',
    status: 'ONLINE',
    last_communication: new Date().toISOString(),
    assigned_vehicle_name: 'Toyota Hilux #1',
  },

  {
    id: 'dev-2',
    traccar_id: 102,
    name: 'Concox GT06N - Ranger',
    imei: '865412093817263',
    model: 'Concox GT06N',
    protocol: 'gt06',
    sim_number: '+221 78 000 22 33',
    status: 'ONLINE',
    last_communication: new Date().toISOString(),
    assigned_vehicle_name: 'Ford Ranger #2',
  },
  {
    id: 'dev-3',
    traccar_id: 103,
    name: 'Queclink GV300 - Master',
    imei: '861928374650192',
    model: 'Queclink GV300',
    protocol: 'queclink',
    sim_number: '+221 76 000 33 44',
    status: 'ONLINE',
    last_communication: new Date().toISOString(),
    assigned_vehicle_name: 'Renault Master #3',
  },
  {
    id: 'dev-4',
    traccar_id: 104,
    name: 'Sinotrack ST-901 - Sprinter',
    imei: '869012345678901',
    model: 'Sinotrack ST-901',
    protocol: 'h02',
    sim_number: '+221 70 000 44 55',
    status: 'OFFLINE',
    last_communication: new Date(Date.now() - 3600000 * 4).toISOString(),
    assigned_vehicle_name: 'Mercedes Sprinter #4',
  },
];

export const INITIAL_DEMO_VEHICLES: Vehicle[] = [
  {
    id: 'veh-1',
    name: 'Toyota Hilux #1',
    plate_number: 'DK-1234-AB',
    brand: 'Toyota',
    model: 'Hilux 2.8 D-4D',
    year: 2023,
    color: 'Blanc',
    vin: 'MHF11394850293817',
    group_name: 'DIRECTION',
    vehicle_type: 'PICKUP',
    driver_id: 'drv-1',
    driver_name: 'Mamadou Ndiaye',
    driver_phone: '+221 77 123 45 67',
    device_id: 'dev-1',
    device_imei: '70493225',
    traccar_id: 1,
    status: 'MOVING',

    comm_status: 'ONLINE',
    current_speed: 67,
    current_heading: 320,
    current_lat: 14.6850,
    current_lng: -17.4620,
    battery_level: 98,
    fuel_level: 82, // Transmitted sensor
    engine_temp: 88,
    engine_hours: 1420,
    ignition_on: true,
    motion_detected: true,
    engine_locked: false,
    odometer_km: 42350.5,
    last_position_time: new Date().toISOString(),
    last_address: 'Route de la Corniche Ouest, Fann, Dakar',
    notes: 'Véhicule de patrouille et suivi chantiers',
  },
  {
    id: 'veh-2',
    name: 'Ford Ranger #2',
    plate_number: 'DK-5678-CD',
    brand: 'Ford',
    model: 'Ranger Wildtrak',
    year: 2022,
    color: 'Gris Anthracite',
    vin: 'WF0XX112948501928',
    group_name: 'DIRECTION',
    vehicle_type: 'PICKUP',
    driver_id: 'drv-2',
    driver_name: 'Ousmane Diop',
    driver_phone: '+221 78 234 56 78',
    device_id: 'dev-2',
    device_imei: '865412093817263',
    status: 'MOVING',
    comm_status: 'ONLINE',
    current_speed: 74,
    current_heading: 45,
    current_lat: 14.7120,
    current_lng: -17.4510,
    battery_level: 100,
    fuel_level: null, // NO FUEL SENSOR INSTALLED -> Displays "Non disponible"
    engine_temp: null,
    engine_hours: 890,
    ignition_on: true,
    motion_detected: true,
    engine_locked: false,
    odometer_km: 68120.2,
    last_position_time: new Date().toISOString(),
    last_address: 'Voie Dégagement Nord (VDN), Sacré Cœur, Dakar',
    notes: 'Liaisons rapides VDN / Almadies',
  },
  {
    id: 'veh-3',
    name: 'Renault Master #3',
    plate_number: 'DK-9012-EF',
    brand: 'Renault',
    model: 'Master L2H2',
    year: 2021,
    color: 'Bleu BCS',
    vin: 'VF1MA000948301928',
    group_name: 'LIVRAISON',
    vehicle_type: 'VAN',
    driver_id: 'drv-3',
    driver_name: 'Ibrahima Sall',
    driver_phone: '+221 76 345 67 89',
    device_id: 'dev-3',
    device_imei: '861928374650192',
    status: 'STOPPED',
    comm_status: 'ONLINE',
    current_speed: 0,
    current_heading: 180,
    current_lat: 14.6937,
    current_lng: -17.4583,
    battery_level: 95,
    fuel_level: 48,
    engine_temp: 78,
    engine_hours: null,
    ignition_on: false,
    motion_detected: false,
    engine_locked: false,
    odometer_km: 112400.0,
    last_position_time: new Date(Date.now() - 45000).toISOString(), // 45 sec ago -> ONLINE
    last_address: 'Agence BCS Fleet, Point E, Dakar',
    notes: 'Chargement de matériel en cours à l\'Agence',
  },
  {
    id: 'veh-4',
    name: 'Mercedes Sprinter #4',
    plate_number: 'DK-3456-GH',
    brand: 'Mercedes-Benz',
    model: 'Sprinter 519 CDI',
    year: 2024,
    color: 'Noir Pro',
    vin: 'WDB90611294850293',
    group_name: 'LIVRAISON',
    vehicle_type: 'TRUCK',
    driver_id: 'drv-4',
    driver_name: 'Awa Sow',
    driver_phone: '+221 70 456 78 90',
    device_id: 'dev-4',
    device_imei: '869012345678901',
    status: 'OFFLINE',
    comm_status: 'OFFLINE', // > 10 min ago -> OFFLINE
    current_speed: 0,
    current_heading: 90,
    current_lat: 14.7160,
    current_lng: -17.2650,
    battery_level: 15,
    fuel_level: 90,
    engine_temp: null,
    engine_hours: 2100,
    ignition_on: false,
    motion_detected: false,
    engine_locked: false,
    odometer_km: 18450.8,
    last_position_time: new Date(Date.now() - 3600000 * 3.5).toISOString(),
    last_address: 'Entrepôt Logistique, Rufisque, Dakar',
    notes: 'Maintenance GPS programmée',
  },
  {
    id: 'veh-5',
    name: 'Peugeot Partner #5',
    plate_number: 'DK-7890-IJ',
    brand: 'Peugeot',
    model: 'Partner Maxi',
    year: 2023,
    color: 'Blanc',
    vin: 'VF37A110984738201',
    group_name: 'TECHNIQUE',
    vehicle_type: 'SEDAN',
    driver_id: null,
    driver_name: 'Non assigné',
    device_id: null,
    device_imei: 'Non configuré',
    status: 'ALERT',
    comm_status: 'ONLINE',
    current_speed: 112,
    current_heading: 110,
    current_lat: 14.7350,
    current_lng: -17.3100,
    battery_level: null, // Simple OBD tracker without sensors
    fuel_level: null,
    engine_temp: null,
    engine_hours: null,
    ignition_on: true,
    motion_detected: true,
    engine_locked: false,
    odometer_km: 29800.4,
    last_position_time: new Date().toISOString(),
    last_address: 'Autoroute à Péage km 18, Thiaroye, Dakar',
    notes: 'Dépassement de vitesse détecté sur l\'Autoroute à Péage',
  },
];

export const INITIAL_DEMO_ALERTS: Alert[] = [
  {
    id: 'alt-1',
    vehicle_id: 'veh-5',
    vehicle_name: 'Peugeot Partner #5',
    vehicle_plate: 'DK-7890-IJ',
    alert_type: 'SPEEDING',
    severity: 'CRITICAL',
    message: 'Excès de vitesse majeur détecté: 112 km/h (Limite: 90 km/h)',
    speed: 112,
    speed_limit: 90,
    lat: 14.7350,
    lng: -17.3100,
    is_read: false,
    timestamp: new Date().toISOString(),
  },
  {
    id: 'alt-2',
    vehicle_id: 'veh-4',
    vehicle_name: 'Mercedes Sprinter #4',
    vehicle_plate: 'DK-3456-GH',
    alert_type: 'GPS_OFFLINE',
    severity: 'WARNING',
    message: 'Perte de communication GPS depuis plus de 3 heures',
    lat: 14.7160,
    lng: -17.2650,
    is_read: false,
    timestamp: new Date(Date.now() - 3600000 * 3.5).toISOString(),
  },
  {
    id: 'alt-3',
    vehicle_id: 'veh-1',
    vehicle_name: 'Toyota Hilux #1',
    vehicle_plate: 'DK-1234-AB',
    alert_type: 'GEOFENCE_ENTER',
    severity: 'INFO',
    message: 'Entrée dans la zone Agence Dakar (Point E)',
    lat: 14.6937,
    lng: -17.4583,
    geofence_id: 'geo-1',
    is_read: true,
    timestamp: new Date(Date.now() - 1800000).toISOString(),
  },
];

export const MOCK_TRIP: Trip = {
  id: 'trip-101',
  vehicle_id: 'veh-1',
  vehicle_name: 'Toyota Hilux #1',
  vehicle_plate: 'DK-1234-AB',
  start_time: '2026-08-20T08:00:00Z',
  end_time: '2026-08-20T09:45:00Z',
  distance_km: 42.8,
  duration_seconds: 6300,
  avg_speed_kmh: 48.5,
  max_speed_kmh: 88.0,
  stops_count: 3,
  stop_duration_seconds: 900,
  start_address: 'Port Autonome de Dakar, Sénégal',
  end_address: 'Les Almadies, Dakar, Sénégal',
  route_points: [
    { lat: 14.6750, lng: -17.4320, speed: 15, heading: 270, timestamp: '2026-08-20T08:00:00Z' },
    { lat: 14.6790, lng: -17.4410, speed: 45, heading: 290, timestamp: '2026-08-20T08:05:00Z' },
    { lat: 14.6860, lng: -17.4520, speed: 62, heading: 310, timestamp: '2026-08-20T08:15:00Z' },
    { lat: 14.6937, lng: -17.4583, speed: 0, heading: 180, timestamp: '2026-08-20T08:30:00Z' },
    { lat: 14.7050, lng: -17.4640, speed: 58, heading: 340, timestamp: '2026-08-20T08:50:00Z' },
    { lat: 14.7200, lng: -17.4720, speed: 75, heading: 330, timestamp: '2026-08-20T09:10:00Z' },
    { lat: 14.7450, lng: -17.5210, speed: 64, heading: 260, timestamp: '2026-08-20T09:30:00Z' },
    { lat: 14.7480, lng: -17.5250, speed: 0, heading: 220, timestamp: '2026-08-20T09:45:00Z' },
  ],
};

export class DakarFleetSimulator {
  private vehicles: Vehicle[] = [...INITIAL_DEMO_VEHICLES];
  private alerts: Alert[] = [...INITIAL_DEMO_ALERTS];
  private intervalId: NodeJS.Timeout | null = null;
  private listeners: Set<(vehicles: Vehicle[]) => void> = new Set();
  private alertListeners: Set<(alert: Alert) => void> = new Set();

  start() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.tick();
    }, 2000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick() {
    this.vehicles = this.vehicles.map((v) => {
      if (v.status === 'OFFLINE' || v.engine_locked) {
        return v;
      }

      if (v.status === 'STOPPED') {
        if (Math.random() < 0.1) {
          const rawSpeed = Math.floor(Math.random() * 30 + 35);
          const nowIso = new Date().toISOString();
          const { status, comm_status, speed } = computeVehicleStatuses(
            rawSpeed,
            true,
            true,
            nowIso,
            v.engine_locked,
            'MOVING'
          );
          return {
            ...v,
            status,
            comm_status,
            ignition_on: true,
            motion_detected: true,
            current_speed: speed,
            last_position_time: nowIso,
          };
        }
        return v;
      }

      const deltaLat = (Math.random() - 0.48) * 0.0006;
      const deltaLng = (Math.random() - 0.48) * 0.0006;

      const newLat = v.current_lat + deltaLat;
      const newLng = v.current_lng + deltaLng;

      const heading = (Math.atan2(deltaLng, deltaLat) * 180) / Math.PI;
      const normalizedHeading = (heading + 360) % 360;

      let rawSpeed = Math.min(120, Math.max(10, v.current_speed + Math.floor((Math.random() - 0.5) * 6)));
      const nowIso = new Date().toISOString();

      let targetStatus: Vehicle['status'] = rawSpeed > 90 ? 'ALERT' : 'MOVING';

      const { status, comm_status, speed } = computeVehicleStatuses(
        rawSpeed,
        true,
        true,
        nowIso,
        v.engine_locked,
        targetStatus
      );

      if (speed > 90) {
        if (Math.random() < 0.3) {
          this.triggerAlert({
            id: `alt-${Date.now()}`,
            vehicle_id: v.id,
            vehicle_name: v.name,
            vehicle_plate: v.plate_number,
            alert_type: 'SPEEDING',
            severity: 'CRITICAL',
            message: `Dépassement de vitesse: ${speed} km/h (Limite: 90 km/h)`,
            speed,
            speed_limit: 90,
            lat: newLat,
            lng: newLng,
            is_read: false,
            timestamp: nowIso,
          });
        }
      }

      return {
        ...v,
        current_lat: newLat,
        current_lng: newLng,
        current_speed: speed,
        current_heading: Math.round(normalizedHeading),
        status,
        comm_status,
        odometer_km: Number((v.odometer_km + (speed / 3600) * 2).toFixed(2)),
        last_position_time: nowIso,
      };
    });

    this.listeners.forEach((fn) => fn(this.vehicles));
  }

  private triggerAlert(alert: Alert) {
    this.alerts.unshift(alert);
    this.alertListeners.forEach((fn) => fn(alert));
  }

  getVehicles() {
    return this.vehicles;
  }

  getAlerts() {
    return this.alerts;
  }

  setVehicleEngineLocked(vehicleId: string, locked: boolean) {
    this.vehicles = this.vehicles.map((v) => {
      if (v.id === vehicleId) {
        return {
          ...v,
          engine_locked: locked,
          status: locked ? 'STOPPED' : v.status,
          current_speed: locked ? 0 : v.current_speed,
          ignition_on: locked ? false : v.ignition_on,
        };
      }
      return v;
    });
    this.listeners.forEach((fn) => fn(this.vehicles));
  }

  subscribe(listener: (vehicles: Vehicle[]) => void) {
    this.listeners.add(listener);
    listener(this.vehicles);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeAlerts(listener: (alert: Alert) => void) {
    this.alertListeners.add(listener);
    return () => {
      this.alertListeners.delete(listener);
    };
  }
}

export const demoSimulator = new DakarFleetSimulator();

export const DEMO_MAINTENANCE_RECORDS: MaintenanceRecord[] = [
  {
    id: 'maint-1',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-1',
    vehicle_name: 'Toyota Hilux #1',
    vehicle_plate: 'DK-1234-AB',
    type: 'OIL_CHANGE',
    title: 'Vidange moteur 10 000 km + Filtres',
    description: 'Changement huile 5W30 synthèse, filtre à huile, filtre à carburant et filtre à air.',
    status: 'COMPLETED',
    priority: 'MEDIUM',
    provider: 'BCS Repair Dakar (Hann)',
    cost: 85000,
    currency: 'FCFA',
    odometer: 45200,
    engine_hours: 1240,
    scheduled_date: '2026-07-15',
    completed_date: '2026-07-15',
    next_due_date: '2026-10-15',
    next_due_odometer: 55200,
    next_due_engine_hours: 1440,
    invoice_number: 'FAC-BCSR-2026-089',
    notes: 'Huile Total Quartz 9000 utilisée. Prochaine vidange à 55 200 km.',
    created_at: '2026-07-15T09:00:00Z',
  },
  {
    id: 'maint-2',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-2',
    vehicle_name: 'Ford Ranger #2',
    vehicle_plate: 'DK-5678-CD',
    type: 'BRAKES',
    title: 'Remplacement plaquettes et disques avant',
    description: 'Remplacement du jeu de plaquettes avant et purge liquide de frein DOT4.',
    status: 'COMPLETED',
    priority: 'HIGH',
    provider: 'Total Auto Point E',
    cost: 145000,
    currency: 'FCFA',
    odometer: 62100,
    engine_hours: 1680,
    scheduled_date: '2026-08-05',
    completed_date: '2026-08-05',
    next_due_date: '2027-02-05',
    next_due_odometer: 82100,
    invoice_number: 'FAC-TOT-44912',
    notes: 'Plaquettes Bosch Heavy Duty installées.',
    created_at: '2026-08-05T14:30:00Z',
  },
  {
    id: 'maint-3',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-3',
    vehicle_name: 'Mitsubishi L200 #3',
    vehicle_plate: 'DK-9012-EF',
    type: 'TIRES',
    title: 'Remplacement 4 pneus tout-terrain',
    description: 'Montage et équilibrage de 4 pneumatiques Michelin LTX Trail 265/65 R17.',
    status: 'SCHEDULED',
    priority: 'HIGH',
    provider: 'Pneu Dakar Express (Yoff)',
    cost: 420000,
    currency: 'FCFA',
    odometer: 78500,
    scheduled_date: '2026-08-25',
    next_due_date: '2027-08-25',
    notes: 'Pneus arrière proches du témoin d\'usure (2 mm restants).',
    created_at: '2026-08-18T11:00:00Z',
  },
  {
    id: 'maint-4',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-4',
    vehicle_name: 'Isuzu D-Max #4',
    vehicle_plate: 'TH-3456-GH',
    type: 'OIL_CHANGE',
    title: 'Vidange & Révision périodique 30 000 km',
    description: 'Entretien complet huile, filtres et diagnostic électronique moteur.',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    provider: 'BCS Repair Dakar (Hann)',
    cost: 110000,
    currency: 'FCFA',
    odometer: 31200,
    scheduled_date: '2026-08-20',
    notes: 'Véhicule immobilisé pour la journée en atelier.',
    created_at: '2026-08-19T16:00:00Z',
  },
  {
    id: 'maint-5',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-5',
    vehicle_name: 'Toyota Land Cruiser #5',
    vehicle_plate: 'DK-7890-IJ',
    type: 'BATTERY',
    title: 'Contrôle alternateur & remplacement batterie 12V 95Ah',
    description: 'Test tension alternateur et pose d\'une batterie Varta Blue Dynamic 95Ah.',
    status: 'COMPLETED',
    priority: 'CRITICAL',
    provider: 'Garage Central Dakar',
    cost: 98000,
    currency: 'FCFA',
    odometer: 115000,
    scheduled_date: '2026-08-02',
    completed_date: '2026-08-02',
    next_due_date: '2028-08-02',
    invoice_number: 'FAC-GCD-2026-114',
    notes: 'Garantie batterie 24 mois.',
    created_at: '2026-08-02T10:15:00Z',
  },
];

export const DEMO_MAINTENANCE_SCHEDULES: MaintenanceSchedule[] = [
  {
    id: 'sched-1',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-1',
    vehicle_name: 'Toyota Hilux #1',
    vehicle_plate: 'DK-1234-AB',
    type: 'OIL_CHANGE',
    title: 'Vidange périodique (Tous les 10 000 km)',
    interval_km: 10000,
    interval_months: 6,
    last_performed_date: '2026-07-15',
    last_performed_odometer: 45200,
    active: true,
    created_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'sched-2',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-2',
    vehicle_name: 'Ford Ranger #2',
    vehicle_plate: 'DK-5678-CD',
    type: 'INSPECTION',
    title: 'Révision Générale & Filtres (Tous les 20 000 km)',
    interval_km: 20000,
    interval_months: 12,
    last_performed_date: '2026-03-10',
    last_performed_odometer: 50000,
    active: true,
    created_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'sched-3',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-3',
    vehicle_name: 'Mitsubishi L200 #3',
    vehicle_plate: 'DK-9012-EF',
    type: 'BRAKES',
    title: 'Contrôle système de freinage (Tous les 15 000 km)',
    interval_km: 15000,
    interval_months: 6,
    last_performed_date: '2026-02-20',
    last_performed_odometer: 65000,
    active: true,
    created_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'sched-4',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-4',
    vehicle_name: 'Isuzu D-Max #4',
    vehicle_plate: 'TH-3456-GH',
    type: 'OIL_CHANGE',
    title: 'Vidange moteur 5W30 (Toutes les 500 heures)',
    interval_engine_hours: 500,
    interval_km: 10000,
    last_performed_date: '2026-04-12',
    last_performed_odometer: 22000,
    active: true,
    created_at: '2026-01-10T00:00:00Z',
  },
];

export const DEMO_VEHICLE_DOCUMENTS: VehicleDocument[] = [
  {
    id: 'doc-1',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-1',
    vehicle_name: 'Toyota Hilux #1',
    vehicle_plate: 'DK-1234-AB',
    type: 'ASSURANCE',
    title: 'Police d\'Assurance Flotte Tous Risques',
    document_number: 'AXA-SN-FLOTTE-8921',
    provider_or_center: 'AXA Assurances Sénégal (Agence Plateau)',
    cost: 380000,
    issue_date: '2026-01-01',
    expiry_date: '2026-12-31',
    notes: 'Couverture responsabilité civile, vol, incendie et bris de glace.',
    created_at: '2026-01-02T10:00:00Z',
  },
  {
    id: 'doc-2',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-1',
    vehicle_name: 'Toyota Hilux #1',
    vehicle_plate: 'DK-1234-AB',
    type: 'VISITE_TECHNIQUE',
    title: 'Certificat de Contrôle Technique Poids & Sécurité',
    document_number: 'CTTD-DK-2026-78192',
    provider_or_center: 'Centre de Contrôle Technique CTTD Hann Maristes',
    cost: 25000,
    issue_date: '2025-09-10',
    expiry_date: '2026-09-10',
    notes: 'Rappel d\'expiration automatique 30 jours avant.',
    created_at: '2025-09-10T15:00:00Z',
  },
  {
    id: 'doc-3',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-2',
    vehicle_name: 'Ford Ranger #2',
    vehicle_plate: 'DK-5678-CD',
    type: 'VISITE_TECHNIQUE',
    title: 'Visite Technique Annuelle Automobile',
    document_number: 'CTTD-DK-2025-44102',
    provider_or_center: 'CTTD Hann Maristes Dakar',
    cost: 25000,
    issue_date: '2025-08-25',
    expiry_date: '2026-08-25',
    notes: 'Échéance imminente (moins de 7 jours).',
    created_at: '2025-08-25T11:00:00Z',
  },
  {
    id: 'doc-4',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-3',
    vehicle_name: 'Mitsubishi L200 #3',
    vehicle_plate: 'DK-9012-EF',
    type: 'ASSURANCE',
    title: 'Assurance Responsabilité Civile & Dommages',
    document_number: 'SONAM-FLOTTE-2026-331',
    provider_or_center: 'SONAM Assurances Dakar',
    cost: 320000,
    issue_date: '2026-03-01',
    expiry_date: '2027-02-28',
    created_at: '2026-03-01T08:00:00Z',
  },
  {
    id: 'doc-5',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-4',
    vehicle_name: 'Isuzu D-Max #4',
    vehicle_plate: 'TH-3456-GH',
    type: 'CARTE_GRISE',
    title: 'Certificat d\'Immatriculation (Carte Grise)',
    document_number: 'CG-SN-TH-88390',
    provider_or_center: 'Direction des Transports Routiers Dakar',
    issue_date: '2024-05-15',
    expiry_date: '2034-05-15',
    created_at: '2024-05-15T12:00:00Z',
  },
];

export const DEMO_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-1',
    vehicle_name: 'Toyota Hilux #1',
    vehicle_plate: 'DK-1234-AB',
    driver_id: 'drv-1',
    driver_name: 'Mamadou Ndiaye',
    category: 'CARBURANT',
    amount: 55000,
    currency: 'FCFA',
    date: '2026-08-18',
    supplier: 'Station TotalEnergies Hann',
    liters: 73.3,
    price_per_liter: 750,
    odometer_at_expense: 45800,
    description: 'Plein Gazole 73.3L pour tournée VDN - Diamniadio',
    created_at: '2026-08-18T08:30:00Z',
  },
  {
    id: 'exp-2',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-1',
    vehicle_name: 'Toyota Hilux #1',
    vehicle_plate: 'DK-1234-AB',
    driver_id: 'drv-1',
    driver_name: 'Mamadou Ndiaye',
    category: 'PEAGE',
    amount: 6000,
    currency: 'FCFA',
    date: '2026-08-18',
    supplier: 'Autoroute de l\'Avenir (SECAA)',
    description: 'Passages péage Dakar - Diamniadio A/R (Badge Rapido)',
    created_at: '2026-08-18T10:15:00Z',
  },
  {
    id: 'exp-3',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-2',
    vehicle_name: 'Ford Ranger #2',
    vehicle_plate: 'DK-5678-CD',
    driver_id: 'drv-2',
    driver_name: 'Ousmane Diop',
    category: 'CARBURANT',
    amount: 60000,
    currency: 'FCFA',
    date: '2026-08-17',
    supplier: 'Station Shell Point E',
    liters: 80.0,
    price_per_liter: 750,
    odometer_at_expense: 62450,
    description: 'Plein carburant diesel',
    created_at: '2026-08-17T07:45:00Z',
  },
  {
    id: 'exp-4',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-2',
    vehicle_name: 'Ford Ranger #2',
    vehicle_plate: 'DK-5678-CD',
    category: 'MAINTENANCE',
    amount: 145000,
    currency: 'FCFA',
    date: '2026-08-05',
    supplier: 'Total Auto Point E',
    description: 'Remplacement plaquettes de frein avant',
    created_at: '2026-08-05T14:30:00Z',
  },
  {
    id: 'exp-5',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-3',
    vehicle_name: 'Mitsubishi L200 #3',
    vehicle_plate: 'DK-9012-EF',
    driver_id: 'drv-3',
    driver_name: 'Ibrahima Sall',
    category: 'CARBURANT',
    amount: 52000,
    currency: 'FCFA',
    date: '2026-08-19',
    supplier: 'Station Ola Energy Rufisque',
    liters: 69.3,
    price_per_liter: 750,
    odometer_at_expense: 78900,
    description: 'Plein Gazole transfert zone industrielle',
    created_at: '2026-08-19T09:10:00Z',
  },
  {
    id: 'exp-6',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-5',
    vehicle_name: 'Toyota Land Cruiser #5',
    vehicle_plate: 'DK-7890-IJ',
    category: 'MAINTENANCE',
    amount: 98000,
    currency: 'FCFA',
    date: '2026-08-02',
    supplier: 'Garage Central Dakar',
    description: 'Batterie Varta 12V 95Ah + pose',
    created_at: '2026-08-02T10:15:00Z',
  },
  {
    id: 'exp-7',
    organization_id: 'org-bcs-dakar',
    vehicle_id: 'veh-1',
    vehicle_name: 'Toyota Hilux #1',
    vehicle_plate: 'DK-1234-AB',
    category: 'ASSURANCE',
    amount: 380000,
    currency: 'FCFA',
    date: '2026-01-01',
    supplier: 'AXA Assurances Sénégal',
    description: 'Prime annuelle assurance flotte tous risques',
    created_at: '2026-01-02T10:00:00Z',
  },
];

