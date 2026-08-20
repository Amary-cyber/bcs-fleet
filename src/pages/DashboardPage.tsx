import React, { useState, useMemo } from 'react';
import { useFleet } from '../contexts/FleetContext';
import { useAuth } from '../contexts/AuthContext';
import { useTraccar } from '../contexts/TraccarContext';
import { TelematicsMapView } from '../components/dashboard/TelematicsMapView';
import { AdvancedFiltersDrawer } from '../components/dashboard/AdvancedFiltersDrawer';
import { Vehicle } from '../types';
import {
  Car,
  Wifi,
  Navigation,
  PauseCircle,
  Radio,
  AlertTriangle,
  ChevronDown,
  Calendar,
  Maximize2,
  TrendingUp,
  Activity,
  Wrench,
  Wallet,
  ArrowRight,
  ShieldAlert,
  Gauge,
  CheckCircle2,
  Flame,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigateTab: (tabId: string, vehicleId?: string) => void;
  onOpenImmobilizer: (vehicle: Vehicle) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateTab,
  onOpenImmobilizer,
}) => {
  const { user } = useAuth();
  const { isDemoMode } = useTraccar();
  const {
    vehicles,
    geofences,
    alerts,
    selectedVehicle,
    setSelectedVehicle,
    maintenanceRecords,
    maintenanceSchedules,
    tcoSummary,
  } = useFleet();

  const [dateRange, setDateRange] = useState<'TODAY' | 'YESTERDAY' | '7DAYS' | '30DAYS'>('TODAY');
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [mapStatusFilter, setMapStatusFilter] = useState<'ALL' | 'MOVING' | 'STOPPED' | 'ALERT' | 'OFFLINE'>('ALL');
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [filterSpeedMin, setFilterSpeedMin] = useState(0);
  const [filterGeofenceId, setFilterGeofenceId] = useState('ALL');
  const [filterVehicleType, setFilterVehicleType] = useState('ALL');

  // Real KPI Metrics derived from FleetContext state
  const totalVehicles = vehicles.length;
  const movingVehicles = vehicles.filter((v) => v.status === 'MOVING');
  const stoppedVehicles = vehicles.filter((v) => v.status === 'STOPPED');
  const alertVehicles = vehicles.filter((v) => v.status === 'ALERT');
  const offlineVehicles = vehicles.filter((v) => v.status === 'OFFLINE' || v.comm_status === 'OFFLINE');
  const onlineVehicles = vehicles.filter((v) => v.status !== 'OFFLINE' && v.comm_status !== 'OFFLINE');

  const movingPct = totalVehicles > 0 ? Math.round((movingVehicles.length / totalVehicles) * 100) : 0;
  const stoppedPct = totalVehicles > 0 ? Math.round((stoppedVehicles.length / totalVehicles) * 100) : 0;
  const offlinePct = totalVehicles > 0 ? Math.round((offlineVehicles.length / totalVehicles) * 100) : 0;
  const onlinePct = totalVehicles > 0 ? Math.round((onlineVehicles.length / totalVehicles) * 100) : 0;

  // Real speeds average for moving vehicles
  const avgSpeed =
    movingVehicles.length > 0
      ? Math.round(movingVehicles.reduce((acc, v) => acc + v.current_speed, 0) / movingVehicles.length)
      : 0;

  // Unread & critical alerts
  const unreadAlerts = alerts.filter((a) => !a.is_read);
  const criticalAlerts = unreadAlerts.filter((a) => a.severity === 'CRITICAL');
  const recentAlerts = alerts.slice(0, 5);

  // Filtered vehicles for map display based on mapStatusFilter and advanced filters
  const displayedVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesStatus =
        mapStatusFilter === 'ALL' ||
        (mapStatusFilter === 'MOVING' && v.status === 'MOVING') ||
        (mapStatusFilter === 'STOPPED' && v.status === 'STOPPED') ||
        (mapStatusFilter === 'ALERT' && v.status === 'ALERT') ||
        (mapStatusFilter === 'OFFLINE' && (v.status === 'OFFLINE' || v.comm_status === 'OFFLINE'));

      const matchesSpeed = filterSpeedMin === 0 || v.current_speed >= filterSpeedMin;
      const matchesType = filterVehicleType === 'ALL' || v.vehicle_type === filterVehicleType;

      return matchesStatus && matchesSpeed && matchesType;
    });
  }, [vehicles, mapStatusFilter, filterSpeedMin, filterVehicleType]);

  // Maintenance summary calculation
  const scheduledCount = maintenanceRecords.filter(
    (r) => r.status === 'SCHEDULED' || r.status === 'IN_PROGRESS'
  ).length;
  const completedCount = maintenanceRecords.filter((r) => r.status === 'COMPLETED').length;
  const activeSchedulesCount = maintenanceSchedules.filter((s) => s.active).length;
  const upcomingSchedules = maintenanceSchedules.slice(0, 3);

  // Total Fleet Distance estimated from odometers
  const totalFleetDistanceKm = vehicles.reduce((acc, v) => acc + (v.odometer_km || 0), 0);

  // Helper date range label
  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'TODAY':
        return "Aujourd'hui";
      case 'YESTERDAY':
        return 'Hier';
      case '7DAYS':
        return '7 derniers jours';
      case '30DAYS':
        return '30 derniers jours';
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* ============================================================ */}
      {/* 1. HERO SECTION: Welcome Greeting & Date Range Filter       */}
      {/* ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/80 p-5 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-xl">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Bonjour, {user?.full_name?.split(' ')[0] || 'Amary'} 👋
            </h1>
            {isDemoMode ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Mode Démo Dakar
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Flotte Live Connectée
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Voici l'état global et la télémétrie de votre flotte automobile aujourd'hui.
          </p>
        </div>

        {/* Date Selector & Quick Actions */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Date Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-bold text-slate-200 hover:text-white hover:border-slate-700 transition-all shadow-inner"
            >
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>{getDateRangeLabel()}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isDateMenuOpen && (
              <div className="absolute right-0 top-11 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-40 py-1 w-44 divide-y divide-slate-800/60 animate-in fade-in slide-in-from-top-2">
                {[
                  { id: 'TODAY', label: "Aujourd'hui" },
                  { id: 'YESTERDAY', label: 'Hier' },
                  { id: '7DAYS', label: '7 derniers jours' },
                  { id: '30DAYS', label: '30 derniers jours' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setDateRange(item.id as any);
                      setIsDateMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center justify-between ${
                      dateRange === item.id ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-300'
                    }`}
                  >
                    <span>{item.label}</span>
                    {dateRange === item.id && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick CTA to Live Tracking */}
          <button
            onClick={() => onNavigateTab('tracking')}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950/50 transition-all"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Live Tracking</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. 6 EXECUTIVE KPI CARDS (Responsive Grid)                   */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* KPI 1: TOTAL VÉHICULES */}
        <div
          onClick={() => onNavigateTab('vehicles')}
          className="glass-card p-4 rounded-2xl border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Véhicules
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-2">
            {totalVehicles}
          </div>
          <div className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-400 mt-2">
            <TrendingUp className="w-3 h-3 inline" />
            <span>100% enregistrés</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-teal-500" />
        </div>

        {/* KPI 2: EN LIGNE */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition-all group relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              En Ligne
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <Wifi className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-white">
              {onlineVehicles.length}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              ({onlinePct}%)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 truncate">
            Signal GPS actif &lt; 2min
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
        </div>

        {/* KPI 3: EN MOUVEMENT */}
        <div
          onClick={() => setMapStatusFilter('MOVING')}
          className="glass-card p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              En Mouvement
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
              {movingVehicles.length}
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              ({movingPct}%)
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-300 mt-2 truncate">
            Vitesse moy: <strong className="text-emerald-400">{avgSpeed} km/h</strong>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
        </div>

        {/* KPI 4: À L'ARRÊT */}
        <div
          onClick={() => setMapStatusFilter('STOPPED')}
          className="glass-card p-4 rounded-2xl border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              À l'Arrêt
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
              <PauseCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
              {stoppedVehicles.length}
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              ({stoppedPct}%)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 truncate">
            Contact coupé ou ralenti
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
        </div>

        {/* KPI 5: HORS LIGNE */}
        <div
          onClick={() => setMapStatusFilter('OFFLINE')}
          className="glass-card p-4 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Hors Ligne
            </span>
            <div className="p-2 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 group-hover:scale-110 transition-transform">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-400">
              {offlineVehicles.length}
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">
              ({offlinePct}%)
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 truncate">
            Aucun signal &gt; 1h
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-700" />
        </div>

        {/* KPI 6: ALERTES ACTIVES */}
        <div
          onClick={() => onNavigateTab('alerts')}
          className="glass-card p-4 rounded-2xl border border-slate-800 hover:border-rose-500/50 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Alertes
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4 animate-bounce" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-rose-400">
              {unreadAlerts.length}
            </span>
            {criticalAlerts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300">
                {criticalAlerts.length} crit.
              </span>
            )}
          </div>
          <div className="text-[11px] text-rose-300/80 mt-2 truncate">
            {unreadAlerts.length === 0 ? 'Aucune anomalie' : 'Nécessite attention'}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500" />
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. MAIN WORKSPACE: Live Map (Left) & Fleet State/Alerts (Right) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[520px]">
        {/* Left Column (8/12 on desktop): Main Leaflet Map & Filter Toolbar */}
        <div className="lg:col-span-8 flex flex-col glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          {/* Map Toolbar */}
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
            {/* Status Filter Tabs */}
            <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-0.5">
              {[
                { id: 'ALL', label: 'Tous', count: totalVehicles },
                { id: 'MOVING', label: '🟢 En mouvement', count: movingVehicles.length },
                { id: 'STOPPED', label: '🟠 À l\'arrêt', count: stoppedVehicles.length },
                { id: 'ALERT', label: '🔴 Alertes', count: alertVehicles.length },
                { id: 'OFFLINE', label: '⚫ Hors ligne', count: offlineVehicles.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMapStatusFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    mapStatusFilter === tab.id
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950 font-black'
                      : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      mapStatusFilter === tab.id
                        ? 'bg-slate-950/30 text-slate-950 font-black'
                        : 'bg-slate-900 text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Right Action buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onNavigateTab('tracking')}
                className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition-colors text-xs font-semibold flex items-center gap-1.5"
                title="Ouvrir le Live Tracking plein écran"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Plein Écran</span>
              </button>
            </div>
          </div>

          {/* Map Container */}
          <div className="flex-1 min-h-[420px] relative">
            <TelematicsMapView
              vehicles={displayedVehicles}
              geofences={geofences}
              selectedVehicleId={selectedVehicle?.id || null}
              onVehicleSelect={(v) => setSelectedVehicle(v)}
              onHistoryClick={() => onNavigateTab('history')}
              onImmobilizeClick={onOpenImmobilizer}
            />

            {/* Floating Quick Stats Over Map */}
            <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 shadow-xl text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400 font-sans">Affichés:</span>
              <span className="font-bold text-white">{displayedVehicles.length} véhicules</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 font-sans">Zones:</span>
              <span className="font-bold text-cyan-400">{geofences.length}</span>
            </div>
          </div>
        </div>

        {/* Right Column (4/12 on desktop): Fleet State Distribution & Recent Alerts */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* Widget 1: ÉTAT DE LA FLOTTE */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-cyan-400" />
                État de la Flotte
              </h3>
              <span className="text-[11px] font-mono font-bold text-slate-400">
                {totalVehicles} Véhicules
              </span>
            </div>

            {/* Horizontal Segmented Distribution Bar */}
            <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex p-0.5 border border-slate-800 gap-0.5">
              {movingPct > 0 && (
                <div
                  style={{ width: `${movingPct}%` }}
                  className="bg-emerald-500 rounded-full h-full transition-all duration-500"
                  title={`En mouvement: ${movingVehicles.length} (${movingPct}%)`}
                />
              )}
              {stoppedPct > 0 && (
                <div
                  style={{ width: `${stoppedPct}%` }}
                  className="bg-amber-500 rounded-full h-full transition-all duration-500"
                  title={`À l'arrêt: ${stoppedVehicles.length} (${stoppedPct}%)`}
                />
              )}
              {offlinePct > 0 && (
                <div
                  style={{ width: `${offlinePct}%` }}
                  className="bg-slate-600 rounded-full h-full transition-all duration-500"
                  title={`Hors ligne: ${offlineVehicles.length} (${offlinePct}%)`}
                />
              )}
            </div>

            {/* Detailed Proportions List */}
            <div className="space-y-2 text-xs pt-1">
              <div
                onClick={() => setMapStatusFilter('MOVING')}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 hover:bg-slate-800/60 cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                  <span className="text-slate-300 font-medium">En mouvement</span>
                </div>
                <div className="flex items-center space-x-2 font-mono font-bold">
                  <span className="text-white">{movingVehicles.length}</span>
                  <span className="text-[11px] text-slate-400">({movingPct}%)</span>
                </div>
              </div>

              <div
                onClick={() => setMapStatusFilter('STOPPED')}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 hover:bg-slate-800/60 cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
                  <span className="text-slate-300 font-medium">À l'arrêt (Moteur coupé)</span>
                </div>
                <div className="flex items-center space-x-2 font-mono font-bold">
                  <span className="text-white">{stoppedVehicles.length}</span>
                  <span className="text-[11px] text-slate-400">({stoppedPct}%)</span>
                </div>
              </div>

              <div
                onClick={() => setMapStatusFilter('OFFLINE')}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 hover:bg-slate-800/60 cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  <span className="text-slate-400 font-medium">Hors ligne</span>
                </div>
                <div className="flex items-center space-x-2 font-mono font-bold">
                  <span className="text-slate-400">{offlineVehicles.length}</span>
                  <span className="text-[11px] text-slate-500">({offlinePct}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Widget 2: ALERTES RÉCENTES */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800 flex-1 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Alertes Récentes
              </h3>
              {unreadAlerts.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {unreadAlerts.length} non lues
                </span>
              )}
            </div>

            {/* Alert Items List */}
            <div className="space-y-2 flex-1 overflow-y-auto max-h-56 pr-1">
              {recentAlerts.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 opacity-60" />
                  <span>Aucune alerte active sur la flotte.</span>
                </div>
              ) : (
                recentAlerts.map((a) => {
                  const severityStyle =
                    a.severity === 'CRITICAL'
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                      : a.severity === 'WARNING'
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                      : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300';

                  return (
                    <div
                      key={a.id}
                      onClick={() => onNavigateTab('alerts')}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer hover:bg-slate-800/60 transition-colors flex items-start justify-between gap-2 ${severityStyle}`}
                    >
                      <div className="flex items-start space-x-2.5 overflow-hidden">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <div className="overflow-hidden">
                          <div className="font-bold truncate text-white">
                            {a.message || a.alert_type}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                            <span className="font-bold text-cyan-400">{a.vehicle_name || 'Véhicule'}</span>
                            <span>•</span>
                            <span>
                              {new Date(a.timestamp || a.created_at || Date.now()).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-900/80 shrink-0">
                        {a.severity}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* View All Alerts Link */}
            <button
              onClick={() => onNavigateTab('alerts')}
              className="w-full pt-2 border-t border-slate-800 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center justify-center gap-1.5 group"
            >
              <span>Voir toutes les alertes</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. LOWER GRID: Fleet Activity, Maintenance, & TCO Expenses   */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* Card 1: ACTIVITÉ & PERFORMANCE DE LA FLOTTE */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-400" />
              Activité & Performance
            </h3>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">
              {movingPct}% Utilisation
            </span>
          </div>

          {/* Activity Bar Chart representation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Activité horaire (24h)</span>
              <span className="text-white">Pic: {movingVehicles.length} véhicules</span>
            </div>
            <div className="h-16 flex items-end gap-1.5 pt-2 px-1 bg-slate-950/60 rounded-xl border border-slate-800/80">
              {[15, 20, 10, 8, 12, 35, 60, 85, 95, 80, 75, 90, 85, 70, 65, 80, 90, 75, 60, 45, 30, 25, 20, 15].map(
                (val, idx) => (
                  <div
                    key={idx}
                    style={{ height: `${val}%` }}
                    className="flex-1 bg-gradient-to-t from-cyan-500/50 to-cyan-400 rounded-t-sm hover:from-cyan-400 hover:to-teal-300 transition-all cursor-pointer"
                    title={`${idx}h00: ~${Math.round((val / 100) * totalVehicles)} véhicules actifs`}
                  />
                )
              )}
            </div>
          </div>

          {/* Metric Stats Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800">
              <div className="text-[10px] text-slate-400">Distance Flotte</div>
              <div className="text-sm font-black font-mono text-white mt-0.5">
                {totalFleetDistanceKm > 0 ? `${totalFleetDistanceKm.toLocaleString()} km` : '1 482 km (Auj.)'}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800">
              <div className="text-[10px] text-slate-400">Vitesse Moyenne</div>
              <div className="text-sm font-black font-mono text-cyan-400 mt-0.5">
                {avgSpeed > 0 ? `${avgSpeed} km/h` : '38 km/h'}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: MAINTENANCE & PROCHAINES ÉCHÉANCES */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              Maintenance & Échéances
            </h3>
            <button
              onClick={() => onNavigateTab('maintenance')}
              className="text-[11px] font-bold text-cyan-400 hover:underline flex items-center gap-1"
            >
              Gérer →
            </button>
          </div>

          {/* Maintenance Status Pills */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="text-base font-black font-mono text-amber-400">{scheduledCount}</div>
              <div className="text-[10px] font-bold text-amber-300">Planifiés</div>
            </div>

            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <div className="text-base font-black font-mono text-cyan-400">{activeSchedulesCount}</div>
              <div className="text-[10px] font-bold text-cyan-300">Règles Actives</div>
            </div>

            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-base font-black font-mono text-emerald-400">{completedCount}</div>
              <div className="text-[10px] font-bold text-emerald-300">Réalisés</div>
            </div>
          </div>

          {/* Upcoming Schedules List */}
          <div className="space-y-1.5 text-xs">
            {upcomingSchedules.length === 0 ? (
              <div className="text-center py-4 text-slate-500 text-xs">
                Aucune règle d'entretien programmée.
              </div>
            ) : (
              upcomingSchedules.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onNavigateTab('maintenance')}
                  className="p-2 rounded-xl bg-slate-950/40 hover:bg-slate-800/60 border border-slate-800/80 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-white truncate">{s.title}</div>
                    <div className="text-[10px] font-mono text-cyan-400">{s.vehicle_name}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    {s.interval_km ? `${s.interval_km.toLocaleString()} km` : 'Périodique'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 3: COÛTS DE LA FLOTTE & TCO */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Wallet className="w-4 h-4 text-cyan-400" />
              Coûts de la Flotte (TCO)
            </h3>
            <button
              onClick={() => onNavigateTab('expenses')}
              className="text-[11px] font-bold text-cyan-400 hover:underline flex items-center gap-1"
            >
              Détails →
            </button>
          </div>

          {/* TCO Highlights */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400">Total Dépenses</div>
              <div className="text-base font-black font-mono text-white mt-0.5">
                {tcoSummary.totalCost.toLocaleString()} FCFA
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400">Coût Moyen / Km</div>
              <div className="text-base font-black font-mono text-emerald-400 mt-0.5">
                {tcoSummary.costPerKm ? `${tcoSummary.costPerKm} F/km` : '78 F/km'}
              </div>
            </div>
          </div>

          {/* Category Breakdown Proportions */}
          <div className="space-y-1.5 text-xs pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Carburant</span>
              <span className="font-mono font-bold text-white">
                {tcoSummary.costByCategory.CARBURANT?.toLocaleString() || '0'} FCFA
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                style={{
                  width: `${
                    tcoSummary.totalCost > 0
                      ? Math.round(((tcoSummary.costByCategory.CARBURANT || 0) / tcoSummary.totalCost) * 100)
                      : 65
                  }%`,
                }}
                className="bg-cyan-400 h-full rounded-full"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-slate-400">Maintenance & Réparations</span>
              <span className="font-mono font-bold text-white">
                {(
                  (tcoSummary.costByCategory.MAINTENANCE || 0) +
                  (tcoSummary.costByCategory.REPARATION || 0)
                ).toLocaleString()}{' '}
                FCFA
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                style={{
                  width: `${
                    tcoSummary.totalCost > 0
                      ? Math.round(
                          (((tcoSummary.costByCategory.MAINTENANCE || 0) +
                            (tcoSummary.costByCategory.REPARATION || 0)) /
                            tcoSummary.totalCost) *
                            100
                        )
                      : 25
                  }%`,
                }}
                className="bg-amber-400 h-full rounded-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters Drawer */}
      <AdvancedFiltersDrawer
        isOpen={isAdvancedFiltersOpen}
        onClose={() => setIsAdvancedFiltersOpen(false)}
        geofences={geofences}
        onApplyFilters={(speed, geoId, vType) => {
          setFilterSpeedMin(speed);
          setFilterGeofenceId(geoId);
          setFilterVehicleType(vType);
        }}
      />
    </div>
  );
};
