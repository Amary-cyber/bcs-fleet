import React, { useState } from 'react';
import { useFleet } from '../contexts/FleetContext';
import { useTraccar } from '../contexts/TraccarContext';
import { MapView } from '../components/map/MapView';
import { Vehicle } from '../types';
import {
  Search,
  Radio,
  Compass,
  Gauge,
  BatteryCharging,
  Clock,
  History,
  Lock,
  User,
  Shield,
  ChevronLeft,
  ChevronRight,
  Activity,
  Layers,
  MapPin,
  CheckCircle2,
  AlertTriangle,
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
  const { traccarConnected, wsStatus } = useTraccar();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isFollowMode, setIsFollowMode] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const activeVehicleId = selectedVehicleIdFromNav || selectedVehicle?.id || vehicles[0]?.id || null;
  const currentSelectedVehicle = vehicles.find((v) => v.id === activeVehicleId) || null;

  // Filter vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      v.name.toLowerCase().includes(q) ||
      v.plate_number.toLowerCase().includes(q) ||
      (v.driver_name && v.driver_name.toLowerCase().includes(q)) ||
      (v.device_imei && v.device_imei.includes(q));

    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Fleet live stats
  const movingCount = vehicles.filter((v) => v.status === 'MOVING').length;
  const stoppedCount = vehicles.filter((v) => v.status === 'STOPPED').length;
  const alertCount = vehicles.filter((v) => v.status === 'ALERT').length;
  const offlineCount = vehicles.filter((v) => v.status === 'OFFLINE').length;

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col space-y-3 relative overflow-hidden">
      {/* ============================================================ */}
      {/* 1. TOP CONSOLE BAR                                           */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between px-4 py-2.5 glass-panel rounded-xl border border-slate-800 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h1 className="text-sm font-bold text-white font-mono tracking-wider">
              SUPERVISION &amp; TRACKING LIVE
            </h1>
          </div>
          <span className="hidden sm:inline-block text-slate-600">|</span>
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                wsStatus === 'CONNECTED' ? 'bg-emerald-400 animate-ping' : traccarConnected ? 'bg-amber-400' : 'bg-rose-500'
              }`}
            />
            <span className={wsStatus === 'CONNECTED' ? 'text-emerald-400 font-semibold' : traccarConnected ? 'text-amber-400' : 'text-rose-400'}>
              {wsStatus === 'CONNECTED' ? 'Traccar 6.5 WebSocket Connecté' : traccarConnected ? 'Traccar Connecté (REST)' : 'Traccar Déconnecté'}
            </span>
          </div>
        </div>

        {/* Quick Fleet Pill Badges */}
        <div className="flex items-center space-x-2 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            {movingCount} en mvt
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
            {stoppedCount} à l'arrêt
          </span>
          {alertCount > 0 && (
            <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse">
              {alertCount} alertes
            </span>
          )}
          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400">
            {offlineCount} hors ligne
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. MAIN WORKSPACE: FLEET ROSTER + MAP                       */}
      {/* ============================================================ */}
      <div className="flex-1 flex gap-3 min-h-0 relative">
        {/* Left Fleet Panel (Traccar-Like Roster) */}
        <div
          className={`glass-panel p-3 rounded-2xl border border-slate-800 flex flex-col transition-all duration-300 z-10 ${
            isSidebarCollapsed ? 'w-12 items-center p-2' : 'w-full lg:w-80'
          }`}
        >
          {/* Header & Collapse Toggle */}
          <div className="flex items-center justify-between w-full mb-2">
            {!isSidebarCollapsed && (
              <span className="text-xs font-bold text-white font-mono uppercase">
                Véhicules ({filteredVehicles.length}/{vehicles.length})
              </span>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ml-auto"
              title={isSidebarCollapsed ? 'Déplier la liste' : 'Replier la liste'}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {!isSidebarCollapsed && (
            <>
              {/* Search Bar */}
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher nom, plaque, chauffeur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center space-x-1 mb-2 overflow-x-auto pb-1 scrollbar-none text-[10px] font-mono">
                {[
                  { id: 'ALL', label: 'Tous' },
                  { id: 'MOVING', label: '🟢 Mvt' },
                  { id: 'STOPPED', label: '🟠 Arrêt' },
                  { id: 'ALERT', label: '🔴 Alerte' },
                  { id: 'OFFLINE', label: '⚫ Hors ligne' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-2 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
                      statusFilter === tab.id
                        ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Vehicle Cards List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                {filteredVehicles.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    Aucun véhicule correspondant.
                  </div>
                ) : (
                  filteredVehicles.map((v) => {
                    const isSelected = v.id === activeVehicleId;
                    const statusBg =
                      v.status === 'MOVING'
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : v.status === 'STOPPED'
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : v.status === 'ALERT'
                        ? 'border-rose-500/40 bg-rose-500/5'
                        : 'border-slate-800 bg-slate-950/40';

                    const statusBadge =
                      v.status === 'MOVING'
                        ? 'text-emerald-400'
                        : v.status === 'STOPPED'
                        ? 'text-amber-400'
                        : v.status === 'ALERT'
                        ? 'text-rose-400'
                        : 'text-slate-400';

                    return (
                      <div
                        key={v.id}
                        onClick={() => {
                          setSelectedVehicle(v);
                        }}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${statusBg} ${
                          isSelected
                            ? 'border-cyan-400 shadow-lg shadow-cyan-950/60 ring-1 ring-cyan-400/50'
                            : 'hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white truncate max-w-[140px]">
                            {v.name}
                          </span>
                          <span className={`text-[10px] font-bold font-mono ${statusBadge}`}>
                            {v.status === 'MOVING' ? '🟢 EN MVT' : v.status === 'STOPPED' ? '🟠 ARRÊTÉ' : v.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
                          <span className="text-cyan-400 font-bold">{v.plate_number}</span>
                          <span className="text-slate-200 font-bold">{v.current_speed} km/h</span>
                        </div>

                        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
                          <span className="truncate max-w-[110px]">{v.driver_name || 'Non assigné'}</span>
                          <span className="flex items-center gap-1">
                            <Compass className="w-3 h-3 text-cyan-400" />
                            {v.current_heading || 0}°
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Center/Right Map Area */}
        <div className="flex-1 h-full min-w-0 relative">
          <MapView
            vehicles={vehicles}
            geofences={geofences}
            selectedVehicleId={activeVehicleId}
            onVehicleSelect={(v) => setSelectedVehicle(v)}
            onHistoryClick={(v) => onNavigateTab('replay', v.id)}
            onImmobilizeClick={(v) => onOpenImmobilizer(v)}
            isFollowMode={isFollowMode}
            onToggleFollowMode={(enabled) => setIsFollowMode(enabled)}
          />

          {/* Floating Selected Vehicle Telemetry HUD (Bottom Left overlay on Map) */}
          {currentSelectedVehicle && (
            <div className="absolute bottom-4 left-4 z-20 glass-card p-3 rounded-xl border border-slate-700/90 shadow-2xl max-w-sm hidden md:block backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2 mb-2">
                <div>
                  <h3 className="font-bold text-xs text-white font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    {currentSelectedVehicle.name}
                  </h3>
                  <p className="text-[10px] text-cyan-400 font-mono font-bold">
                    {currentSelectedVehicle.plate_number}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-white font-mono">
                    {currentSelectedVehicle.current_speed} km/h
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">
                    Cap: {currentSelectedVehicle.current_heading || 0}°
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFollowMode(!isFollowMode)}
                  className={`flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all border ${
                    isFollowMode
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                      : 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border-slate-700'
                  }`}
                >
                  {isFollowMode ? 'Arrêter Suivi' : 'Suivre en direct'}
                </button>
                <button
                  onClick={() => onNavigateTab('replay', currentSelectedVehicle.id)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] font-bold font-mono text-slate-200 border border-slate-700 transition-colors"
                >
                  Historique
                </button>
                <button
                  onClick={() => onOpenImmobilizer(currentSelectedVehicle)}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-[10px] font-bold font-mono text-rose-400 border border-rose-500/40 transition-colors"
                  title="Coupe-moteur / Relais"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
