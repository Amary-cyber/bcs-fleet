export type UserRole = 'ADMIN' | 'MANAGER' | 'DRIVER' | 'VIEWER';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  created_at?: string;
}

export type VehicleStatus = 'MOVING' | 'STOPPED' | 'OFFLINE' | 'ALERT';
export type CommunicationStatus = 'ONLINE' | 'DELAYED' | 'OFFLINE';
export type VehicleType = 'SEDAN' | 'PICKUP' | 'TRUCK' | 'VAN' | 'MOTORCYCLE';

export interface Vehicle {
  id: string;
  name: string;
  plate_number: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  vin?: string;
  group_name?: string; // 'DIRECTION', 'LIVRAISON', 'TECHNIQUE'
  vehicle_type: VehicleType;
  driver_id?: string | null;
  driver_name?: string;
  driver_phone?: string;
  device_id?: string | null;
  device_imei?: string;
  traccar_id?: number;
  traccar_unique_id?: string;
  active?: boolean;
  status: VehicleStatus;


  comm_status: CommunicationStatus;
  current_speed: number; // in km/h
  current_heading: number; // degrees 0-360
  current_lat: number;
  current_lng: number;
  // Sensors: null when missing/not transmitted by tracker
  battery_level?: number | null; // 0-100% or null
  fuel_level?: number | null; // 0-100% or null
  engine_temp?: number | null; // e.g. 88 °C or null
  engine_hours?: number | null; // e.g. 1420 h or null
  ignition_on: boolean;
  motion_detected?: boolean;
  engine_locked: boolean;
  odometer_km: number;
  last_position_time: string;
  last_address?: string;
  notes?: string;
}

export interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  license_number: string;
  license_expiry_date: string;
  photo_url?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  notes?: string;
  assigned_vehicle_id?: string;
  assigned_vehicle_name?: string;
}

export interface Device {
  id: string;
  traccar_id?: number;
  name: string;
  imei: string;
  model: string;
  protocol?: string;
  sim_number?: string;
  status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
  last_communication?: string;
  assigned_vehicle_name?: string;
}

export type GeofenceType = 'CIRCLE' | 'POLYGON';

export interface Geofence {
  id: string;
  name: string;
  category: string;
  type: GeofenceType;
  coordinates: [number, number][] | { center: [number, number]; radius: number };
  color: string;
  speed_limit?: number;
  notify_on_enter: boolean;
  notify_on_exit: boolean;
}

export type AlertType =
  | 'SPEEDING'
  | 'GEOFENCE_ENTER'
  | 'GEOFENCE_EXIT'
  | 'PROLONGED_STOP'
  | 'GPS_OFFLINE'
  | 'UNAUTHORIZED_MOVEMENT'
  | 'LOW_BATTERY';

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface Alert {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  vehicle_plate: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  message: string;
  speed?: number;
  speed_limit?: number;
  lat: number;
  lng: number;
  geofence_id?: string;
  is_read: boolean;
  timestamp: string;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  speed: number;
  timestamp: string;
  heading: number;
}

export interface Trip {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  vehicle_plate: string;
  start_time: string;
  end_time: string;
  distance_km: number;
  duration_seconds: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  stops_count: number;
  stop_duration_seconds: number;
  route_points: RoutePoint[];
  start_address?: string;
  end_address?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email: string;
  user_role: UserRole;
  action: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface CompanySettings {
  company_name: string;
  company_logo_url?: string;
  company_phone: string;
  company_email: string;
  company_address: string;
  distance_unit: 'km';
  speed_unit: 'km/h';
  currency: 'FCFA';
  timezone: 'Africa/Dakar';
  // Configurable communication threshold seconds
  online_threshold_sec: number; // default 120 (2 min)
  delayed_threshold_sec: number; // default 600 (10 min)
  speed_movement_threshold_kmh: number; // default 3.0 km/h tolerance
}

export interface TraccarPosition {
  id: number;
  deviceId: number;
  protocol: string;
  serverTime: string;
  deviceTime: string;
  fixTime: string;
  valid: boolean;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  course: number;
  address?: string;
  attributes: {
    batteryLevel?: number;
    fuelLevel?: number;
    fuel?: number;
    ignition?: boolean;
    motion?: boolean;
    blocked?: boolean;
    distance?: number;
    totalDistance?: number;
    temp1?: number;
    temp?: number;
    hours?: number;
  };

}

export interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status: string;
  lastUpdate: string;
  positionId: number;
  disabled: boolean;
}
