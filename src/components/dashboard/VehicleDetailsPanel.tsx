import React from 'react';
import { Vehicle } from '../../types';
import {
  X,
  Gauge,
  Compass,
  User,
  Phone,
  Radio,
  MapPin,
  Clock,
  Battery,
  Flame,
  Thermometer,
  Key,
  Lock,
  History,
  Eye,
  Crosshair,
  ShieldCheck,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface VehicleDetailsPanelProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  onNavigateTab: (tabId: string, vehicleId?: string) => void;
  onOpenImmobilizer: (vehicle: Vehicle) => void;
  onCenterMap: (vehicle: Vehicle) => void;
}

export const VehicleDetailsPanel: React.FC<VehicleDetailsPanelProps> = ({
  vehicle,
  onClose,
  onNavigateTab,
  onOpenImmobilizer,
  onCenterMap,
}) => {
  if (!vehicle) return null;

  const timeAgo = formatDistanceToNow(new Date(vehicle.last_position_time), {
    addSuffix: true,
    locale: fr,
  });

  const getCompassDirection = (heading: number): string => {
    const directions = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'];
    return directions[Math.round(heading / 45) % 8];
  };

  const getStatusBadge = () => {
    if (vehicle.status === 'ALERT') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
          🔴 ALERTE DE SÉCURITÉ
        </span>
      );
    }
    if (vehicle.status === 'MOVING') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
          🟢 EN MOUVEMENT
        </span>
      );
    }
    if (vehicle.status === 'STOPPED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
          🟠 ARRÊTÉ
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
        ⚫ HORS LIGNE
      </span>
    );
  };

  return (
    <div className="w-full lg:w-96 glass-card p-5 rounded-2xl border border-slate-800 shadow-2xl flex flex-col justify-between h-full select-none overflow-y-auto z-20">
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-black text-white font-mono flex items-center gap-2">
              {vehicle.name}
              {vehicle.engine_locked && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/40 font-mono">
                  IMMOBILISÉ
                </span>
              )}
            </h2>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs font-mono font-bold text-cyan-400">{vehicle.plate_number}</span>
              <span className="text-[11px] text-slate-400">• {vehicle.brand} {vehicle.model}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Badge & Speed/Heading Row */}
        <div className="flex items-center justify-between">
          {getStatusBadge()}
          <div className="text-xs font-mono text-slate-300 font-bold flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>{getCompassDirection(vehicle.current_heading)} ({vehicle.current_heading}°)</span>
          </div>
        </div>

        {/* Speed Card */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Vitesse Instantanée</div>
              <div className="text-lg font-black text-white font-mono">{vehicle.current_speed} km/h</div>
            </div>
          </div>
          <div className="text-right text-[11px] font-mono text-slate-400">
            Tolérance &ge; 3.0 km/h
          </div>
        </div>

        {/* Driver Card */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-amber-400" /> Chauffeur Assigné
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white">{vehicle.driver_name || 'Aucun chauffeur assigné'}</span>
            {vehicle.driver_phone && (
              <a
                href={`tel:${vehicle.driver_phone}`}
                className="text-cyan-400 hover:underline font-mono flex items-center gap-1"
              >
                <Phone className="w-3 h-3" /> {vehicle.driver_phone}
              </a>
            )}
          </div>
        </div>

        {/* GPS Communication Card */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
          <div className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-emerald-400" /> Boîtier GPS &amp; Connexion
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Code IMEI:</span>
            <span className="font-mono text-cyan-400 font-semibold">{vehicle.device_imei || 'Non associé'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Dernier Signal:</span>
            <span className="font-mono text-slate-300">{timeAgo}</span>
          </div>
        </div>

        {/* Telemetry Sensors Grid (Strict Data Integrity - Never invent values!) */}
        <div className="space-y-2">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Capteurs Télématiques
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Battery Level */}
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Battery className="w-3 h-3 text-emerald-400" /> Batterie GPS
              </div>
              <div className="font-mono font-bold text-white mt-1">
                {vehicle.battery_level !== null && vehicle.battery_level !== undefined
                  ? `${vehicle.battery_level}%`
                  : <span className="text-slate-500 font-normal">Non disponible</span>}
              </div>
            </div>

            {/* Fuel Level */}
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" /> Carburant
              </div>
              <div className="font-mono font-bold text-white mt-1">
                {vehicle.fuel_level !== null && vehicle.fuel_level !== undefined
                  ? `${vehicle.fuel_level}%`
                  : <span className="text-slate-500 font-normal">Non disponible</span>}
              </div>
            </div>

            {/* Engine Temp */}
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-rose-400" /> Température
              </div>
              <div className="font-mono font-bold text-white mt-1">
                {vehicle.engine_temp !== null && vehicle.engine_temp !== undefined
                  ? `${vehicle.engine_temp} °C`
                  : <span className="text-slate-500 font-normal">Non disponible</span>}
              </div>
            </div>

            {/* Ignition State */}
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Key className="w-3 h-3 text-cyan-400" /> Contact (Ignition)
              </div>
              <div className="font-mono font-bold mt-1">
                {vehicle.ignition_on ? (
                  <span className="text-emerald-400">ALLUMÉ (ON)</span>
                ) : (
                  <span className="text-slate-400">ÉTEINT (OFF)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Last Position Address */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-xs">
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-cyan-400" /> Coordonnées &amp; Adresse
          </div>
          <div className="text-white font-medium truncate">{vehicle.last_address || 'Dakar, Sénégal'}</div>
          <div className="font-mono text-[10px] text-slate-400">
            {vehicle.current_lat.toFixed(5)}, {vehicle.current_lng.toFixed(5)}
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs font-bold">
        <button
          onClick={() => onCenterMap(vehicle)}
          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1"
        >
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" /> Centrer
        </button>

        <button
          onClick={() => onNavigateTab('history')}
          className="px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center gap-1"
        >
          <History className="w-3.5 h-3.5" /> Historique
        </button>

        <button
          onClick={() => onNavigateTab('vehicles')}
          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1"
        >
          <Eye className="w-3.5 h-3.5" /> Détails
        </button>

        <button
          onClick={() => onOpenImmobilizer(vehicle)}
          className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center gap-1"
        >
          <Lock className="w-3.5 h-3.5" /> Immobiliser
        </button>
      </div>
    </div>
  );
};
