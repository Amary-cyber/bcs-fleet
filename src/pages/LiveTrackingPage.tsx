import React, { useState } from 'react';
import { useFleet } from '../contexts/FleetContext';
import { MapView } from '../components/map/MapView';
import { Vehicle, VehicleStatus } from '../types';
import {
  Search,
  Filter,
  Compass,
  Navigation,
  Car,
  History,
  Lock,
  User,
  BatteryCharging,
  Gauge,
  Clock,
  Radio,
  Maximize2,
} from 'lucide-react';

interface LiveTrackingPageProps {
  selectedVehicleIdFromNav?: string | null;
  onNavigateTab: (tabId: string, vehicleId?: string) => void;
  onOpenImmobilizer: (vehicle: Vehicle) => void;
}

export const LiveTrackingPage: React.FC<LiveTrackingPageProps> = ({
  selectedVehicleIdFromNav,
  onNavigateTab,
  onOpenImmobilizer,
}) => {
  const { vehicles, geofences, selectedVehicle, setSelectedVehicle } = useFleet();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const activeVehicleId = selectedVehicleIdFromNav || selectedVehicle?.id || null;

  // Filter vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.plate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.driver_name && v.driver_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const currentSelectedVehicle = vehicles.find((v) => v.id === activeVehicleId) || null;

  // Helper compass direction
  const getCompassDirection = (heading: number): string => {
    const directions = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'];
    return directions[Math.round(heading / 45) % 8];
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-4 relative overflow-hidden">
      {/* Left Filter & Vehicles Roster Panel */}
      <div className="w-full lg:w-80 glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col shrink-0 h-64 lg:h-full z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            Flotte de Véhicules
          </h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
            {filteredVehicles.length}/{vehicles.length}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher nom, plaque..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 mb-3 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'ALL', label: 'Tous' },
            { id: 'MOVING', label: '🟢 Mouvement' },
            { id: 'STOPPED', label: '🟠 Arrêt' },
            { id: 'ALERT', label: '🔴 Alerte' },
            { id: 'OFFLINE', label: '⚫ Hors ligne' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Vehicle Cards Roster */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredVehicles.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Aucun véhicule ne correspond aux filtres.
            </div>
          ) : (
            filteredVehicles.map((v) => {
              const isSelected = v.id === activeVehicleId;
              const statusColor =
                v.status === 'MOVING'
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                  : v.status === 'STOPPED'
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  : v.status === 'ALERT'
                  ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                  : 'text-slate-400 bg-slate-800 border-slate-700';

              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVehicle(v)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-950/60 to-slate-900 border-cyan-500 shadow-lg shadow-cyan-950/50 scale-[1.01]'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white truncate max-w-[150px]">
                      {v.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${statusColor}`}>
                      {v.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span className="font-mono text-cyan-400 font-semibold">{v.plate_number}</span>
                    <span className="font-mono text-slate-300 font-bold">{v.current_speed} km/h</span>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      {v.driver_name || 'Non assigné'}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Compass className="w-3 h-3 text-slate-500" />
                      {getCompassDirection(v.current_heading)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Map Container */}
      <div className="flex-1 h-full rounded-2xl overflow-hidden relative border border-slate-800 shadow-2xl">
        <MapView
          vehicles={filteredVehicles}
          geofences={geofences}
          selectedVehicleId={activeVehicleId}
          onVehicleSelect={(v) => setSelectedVehicle(v)}
          onHistoryClick={(v) => onNavigateTab('history')}
          onImmobilizeClick={onOpenImmobilizer}
        />

        {/* Selected Vehicle Floating Info Drawer */}
        {currentSelectedVehicle && (
          <div className="absolute bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-96 glass-card p-4 rounded-2xl border border-slate-700/80 shadow-2xl z-20 space-y-4 backdrop-blur-xl animate-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <div>
                <h3 className="text-base font-black text-white font-mono flex items-center gap-2">
                  {currentSelectedVehicle.name}
                  {currentSelectedVehicle.engine_locked && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/40">
                      MOTEUR IMMOBILISÉ
                    </span>
                  )}
                </h3>
                <p className="text-xs text-cyan-400 font-mono font-semibold">
                  Plaque: {currentSelectedVehicle.plate_number}
                </p>
              </div>

              <button
                onClick={() => setSelectedVehicle(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Live Telemetry Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Vitesse
                </div>
                <div className="text-sm font-bold font-mono text-white mt-1">
                  {currentSelectedVehicle.current_speed} km/h
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-teal-400" /> Direction
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {getCompassDirection(currentSelectedVehicle.current_heading)} ({currentSelectedVehicle.current_heading}°)
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-amber-400" /> Chauffeur
                </div>
                <div className="text-xs font-semibold text-white mt-1 truncate">
                  {currentSelectedVehicle.driver_name || 'Non assigné'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" /> Mise à jour
                </div>
                <div className="text-xs font-mono text-slate-300 mt-1">
                  {new Date(currentSelectedVehicle.last_position_time).toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Quick Control Action Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => onNavigateTab('vehicles')}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 border border-slate-700 transition-colors"
              >
                Détails
              </button>

              <button
                onClick={() => onNavigateTab('history')}
                className="px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-[11px] font-bold text-cyan-400 border border-cyan-500/30 transition-colors flex items-center justify-center gap-1"
              >
                <History className="w-3.5 h-3.5" />
                Historique
              </button>

              <button
                onClick={() => onOpenImmobilizer(currentSelectedVehicle)}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-[11px] font-bold text-rose-400 border border-rose-500/30 transition-colors flex items-center justify-center gap-1"
              >
                <Lock className="w-3.5 h-3.5" />
                Immobiliser
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
