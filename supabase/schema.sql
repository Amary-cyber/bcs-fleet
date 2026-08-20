-- ========================================================
-- BCS FLEET DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- Enterprise Single-Tenant Fleet Management System
-- ========================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'DRIVER', 'VIEWER');
CREATE TYPE vehicle_status AS ENUM ('MOVING', 'STOPPED', 'OFFLINE', 'ALERT');
CREATE TYPE vehicle_type AS ENUM ('SEDAN', 'PICKUP', 'TRUCK', 'VAN', 'MOTORCYCLE');
CREATE TYPE alert_type AS ENUM ('SPEEDING', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT', 'PROLONGED_STOP', 'GPS_OFFLINE', 'UNAUTHORIZED_MOVEMENT', 'LOW_BATTERY');
CREATE TYPE alert_severity AS ENUM ('CRITICAL', 'WARNING', 'INFO');
CREATE TYPE geofence_type AS ENUM ('CIRCLE', 'POLYGON');
CREATE TYPE device_status AS ENUM ('ONLINE', 'OFFLINE', 'UNKNOWN');

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'VIEWER',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CHAUFFEURS (DRIVERS) TABLE
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    license_number TEXT UNIQUE NOT NULL,
    license_expiry_date DATE NOT NULL,
    photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, SUSPENDED
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. GPS DEVICES TABLE
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    traccar_id BIGINT UNIQUE,
    name TEXT NOT NULL,
    imei TEXT UNIQUE NOT NULL,
    model TEXT NOT NULL, -- e.g. Teltonika FMB920, Concox GT06
    protocol TEXT,
    sim_number TEXT,
    status device_status NOT NULL DEFAULT 'UNKNOWN',
    last_communication TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. VEHICLES TABLE
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- e.g. Toyota Hilux #1
    plate_number TEXT UNIQUE NOT NULL, -- e.g. DK-1234-AB
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INT,
    color TEXT,
    vin TEXT UNIQUE,
    vehicle_type vehicle_type NOT NULL DEFAULT 'PICKUP',
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    status vehicle_status NOT NULL DEFAULT 'OFFLINE',
    current_speed DOUBLE PRECISION DEFAULT 0.0,
    current_heading DOUBLE PRECISION DEFAULT 0.0,
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    battery_level INT DEFAULT 100,
    fuel_level INT DEFAULT 100,
    ignition_on BOOLEAN DEFAULT FALSE,
    engine_locked BOOLEAN DEFAULT FALSE,
    odometer_km DOUBLE PRECISION DEFAULT 0.0,
    last_position_time TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. GEOFENCES TABLE
CREATE TABLE IF NOT EXISTS public.geofences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- e.g. Agency, Warehouse, Delivery Zone, Restricted Area
    type geofence_type NOT NULL DEFAULT 'POLYGON',
    coordinates JSONB NOT NULL, -- Polygon [[lat,lng],...] or Circle {center: [lat,lng], radius: meters}
    color TEXT NOT NULL DEFAULT '#3B82F6',
    speed_limit INT DEFAULT 90,
    notify_on_enter BOOLEAN DEFAULT TRUE,
    notify_on_exit BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TRIPS TABLE (HISTORIQUE DES TRAJETS)
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    distance_km DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    duration_seconds INT NOT NULL DEFAULT 0,
    avg_speed_kmh DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    max_speed_kmh DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    stops_count INT NOT NULL DEFAULT 0,
    stop_duration_seconds INT NOT NULL DEFAULT 0,
    route_points JSONB NOT NULL, -- Array of {lat, lng, speed, timestamp, heading}
    start_address TEXT,
    end_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. ALERTS TABLE
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    alert_type alert_type NOT NULL,
    severity alert_severity NOT NULL DEFAULT 'WARNING',
    message TEXT NOT NULL,
    speed DOUBLE PRECISION,
    speed_limit DOUBLE PRECISION,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    geofence_id UUID REFERENCES public.geofences(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    alert_id UUID REFERENCES public.alerts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    user_role user_role NOT NULL,
    action TEXT NOT NULL, -- e.g. VEHICLE_CREATE, ENGINE_IMMOBILIZE, GEOFENCE_DELETE
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
    id INT PRIMARY KEY DEFAULT 1,
    company_name TEXT NOT NULL DEFAULT 'BCS Fleet',
    company_logo_url TEXT,
    company_phone TEXT DEFAULT '+221 33 800 00 00',
    company_email TEXT DEFAULT 'contact@bcsfleet.sn',
    company_address TEXT DEFAULT 'Route de la Corniche Ouest, Dakar, Sénégal',
    distance_unit TEXT DEFAULT 'km',
    speed_unit TEXT DEFAULT 'km/h',
    currency TEXT DEFAULT 'FCFA',
    timezone TEXT DEFAULT 'Africa/Dakar',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES FOR FAST RECOVERY
CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON public.vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_device ON public.vehicles(device_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_date ON public.trips(vehicle_id, start_time);
CREATE INDEX IF NOT EXISTS idx_alerts_vehicle_time ON public.alerts(vehicle_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR ENTERPRISE SINGLE-TENANT (Authenticated Users can read; Admins/Managers can write)
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can update profiles" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY "Vehicles viewable by authenticated users" ON public.vehicles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins and Managers can insert/update vehicles" ON public.vehicles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
);

CREATE POLICY "Drivers viewable by authenticated users" ON public.drivers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins and Managers can manage drivers" ON public.drivers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
);

CREATE POLICY "Devices viewable by authenticated users" ON public.devices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins and Managers can manage devices" ON public.devices FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
);

CREATE POLICY "Geofences viewable by authenticated users" ON public.geofences FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins and Managers can manage geofences" ON public.geofences FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
);

CREATE POLICY "Trips viewable by authenticated users" ON public.trips FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Alerts viewable by authenticated users" ON public.alerts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Notifications viewable by owner" ON public.notifications FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Audit logs viewable by authenticated users" ON public.audit_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Audit logs insertable by system" ON public.audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Settings viewable by authenticated users" ON public.settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Settings editable by Admin" ON public.settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- INITIAL SEED DATA FOR SETTINGS
INSERT INTO public.settings (id, company_name, company_phone, company_email, company_address)
VALUES (1, 'BCS Fleet Dakar', '+221 33 800 00 00', 'contact@bcsfleet.sn', 'Route de la Corniche Ouest, Dakar, Sénégal')
ON CONFLICT (id) DO NOTHING;
