import React, { useState, useMemo } from 'react';
import { useFleet } from '../contexts/FleetContext';
import { Alert, AlertSeverity, AlertType } from '../types';
import {
  BellRing,
  AlertTriangle,
  MapPin,
  Clock,
  Radio,
  CheckCheck,
  Filter,
  Search,
  BatteryCharging,
  ShieldAlert,
  Eye,
  History,
  Check,
  X,
  Info,
  Calendar,
  Car,
  FileSpreadsheet,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AlertsPageProps {
  onNavigateTab: (tabId: string, vehicleId?: string) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ onNavigateTab }) => {
  const { alerts, vehicles, acknowledgeAlert, markAllAlertsRead } = useFleet();
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterVehicleId, setFilterVehicleId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState<string>('');

  // Filtered Alerts List
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.vehicle_name.toLowerCase().includes(q) ||
        a.vehicle_plate.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        (a.title && a.title.toLowerCase().includes(q));

      const matchesSeverity =
        filterSeverity === 'ALL' ||
        (filterSeverity === 'UNACKNOWLEDGED' && !a.acknowledged) ||
        (filterSeverity === 'ACKNOWLEDGED' && a.acknowledged) ||
        (filterSeverity === 'CRITICAL' && a.severity === 'CRITICAL') ||
        (filterSeverity === 'WARNING' && a.severity === 'WARNING') ||
        (filterSeverity === 'INFO' && a.severity === 'INFO');

      const matchesType = filterType === 'ALL' || a.alert_type === filterType;
      const matchesVehicle = filterVehicleId === 'ALL' || a.vehicle_id === filterVehicleId;
      const matchesDate = !filterDate || a.timestamp.startsWith(filterDate);

      return matchesSearch && matchesSeverity && matchesType && matchesVehicle && matchesDate;
    });
  }, [alerts, searchQuery, filterSeverity, filterType, filterVehicleId, filterDate]);

  // KPI Calculations
  const kpiTotal = alerts.length;
  const kpiActive = alerts.filter((a) => !a.acknowledged).length;
  const kpiCritical = alerts.filter((a) => a.severity === 'CRITICAL' && !a.acknowledged).length;
  const kpiWarning = alerts.filter((a) => a.severity === 'WARNING' && !a.acknowledged).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const kpiToday = alerts.filter((a) => a.timestamp.startsWith(todayStr)).length;

  const getAlertSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
            🔴 CRITIQUE
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/20 text-amber-400 border border-amber-500/40">
            🟠 AVERTISSEMENT
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            🔵 INFORMATION
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white font-mono flex items-center gap-2">
              <BellRing className="w-6 h-6 text-rose-400" />
              CENTRE D'ALERTES &amp; ÉVÉNEMENTS TÉLÉMATIQUES
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
              Traccar 6.5 Live
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Traçabilité des anomalies en temps réel: excès de vitesse, déconnexions GPS, franchissements de géofences et alarmes de sécurité.
          </p>
        </div>

        {kpiActive > 0 && (
          <button
            onClick={markAllAlertsRead}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all shadow-lg flex items-center space-x-2 shrink-0"
          >
            <CheckCheck className="w-4 h-4" />
            <span>TOUT ACQUITTER ({kpiActive})</span>
          </button>
        )}
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Alertes Actives</div>
          <div className="text-xl font-black text-rose-400 font-mono mt-1">{kpiActive}</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">Critiques En Cours</div>
          <div className="text-xl font-black text-rose-400 font-mono mt-1">{kpiCritical}</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Avertissements</div>
          <div className="text-xl font-black text-amber-400 font-mono mt-1">{kpiWarning}</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">Aujourd'hui</div>
          <div className="text-xl font-black text-cyan-400 font-mono mt-1">{kpiToday}</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Historique</div>
          <div className="text-xl font-black text-slate-300 font-mono mt-1">{kpiTotal}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher véhicule, immatriculation, message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs w-full lg:w-auto">
            {/* Severity Tabs */}
            {[
              { id: 'ALL', label: 'Toutes' },
              { id: 'UNACKNOWLEDGED', label: `⚠️ En cours (${kpiActive})` },
              { id: 'CRITICAL', label: '🔴 Critiques' },
              { id: 'WARNING', label: '🟠 Avertissements' },
              { id: 'INFO', label: '🔵 Info' },
              { id: 'ACKNOWLEDGED', label: '✓ Acquittées' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterSeverity(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  filterSeverity === tab.id
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
          {/* Vehicle Filter */}
          <div className="flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterVehicleId}
              onChange={(e) => setFilterVehicleId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 font-mono text-xs"
            >
              <option value="ALL">Tous les véhicules</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.plate_number})
                </option>
              ))}
            </select>
          </div>

          {/* Type Select */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 text-xs"
            >
              <option value="ALL">Tous les types d'alertes</option>
              <option value="SPEEDING">⚡ Excès de Vitesse</option>
              <option value="GEOFENCE_ENTER">📍 Entrée Zone</option>
              <option value="GEOFENCE_EXIT">⚠️ Sortie Zone</option>
              <option value="GPS_OFFLINE">📡 GPS Hors Ligne</option>
              <option value="LOW_BATTERY">🔋 Batterie Faible</option>
              <option value="IGNITION">🔑 Contact Allumé/Coupé</option>
              <option value="SOS">🚨 Alarme SOS / Panique</option>
              <option value="UNAUTHORIZED_MOVEMENT">⚠️ Mouvement non autorisé</option>
            </select>
          </div>

          {/* Date Picker Filter */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-slate-200 focus:border-cyan-500 font-mono text-xs"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate('')}
                className="text-[10px] text-slate-400 hover:text-rose-400 underline"
              >
                Effacer date
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="glass-panel p-12 text-center text-slate-500 rounded-2xl border border-slate-800">
            <BellRing className="w-12 h-12 mx-auto mb-3 opacity-30 text-cyan-400" />
            <p className="text-sm font-medium">Aucune alerte enregistrée pour ces critères de recherche.</p>
            <p className="text-xs text-slate-600 mt-1">
              Les événements sont générés en temps réel d'après les réceptions Traccar 6.5.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alt) => (
            <div
              key={alt.id}
              className={`glass-panel p-5 rounded-2xl border transition-all ${
                alt.acknowledged
                  ? 'border-slate-800/80 bg-slate-900/60 opacity-75'
                  : alt.severity === 'CRITICAL'
                  ? 'border-rose-500/50 bg-slate-900 shadow-xl shadow-rose-950/30'
                  : 'border-amber-500/40 bg-slate-900 shadow-lg shadow-amber-950/20'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div
                    className={`p-3 rounded-xl border shrink-0 ${
                      alt.severity === 'CRITICAL'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : alt.severity === 'WARNING'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    }`}
                  >
                    <AlertTriangle className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-white text-sm font-mono">
                        {alt.title || alt.vehicle_name}
                      </h3>
                      <span className="font-mono text-xs text-cyan-400 font-bold">
                        ({alt.vehicle_plate})
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 font-medium">{alt.message}</p>

                    {alt.speed && alt.speed_limit && (
                      <div className="text-xs font-mono text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-lg inline-block">
                        Vitesse mesurée: <strong>{alt.speed} km/h</strong> (Limite autorisée: {alt.speed_limit} km/h)
                      </div>
                    )}

                    {alt.lat && alt.lng && (
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 pt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>Coordonnées GPS: {alt.lat.toFixed(5)}, {alt.lng.toFixed(5)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col md:items-end justify-between space-y-2 shrink-0 border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
                  <div className="flex items-center space-x-2">
                    {getAlertSeverityBadge(alt.severity)}
                    {alt.acknowledged ? (
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <Check className="w-3 h-3" /> Acquittée
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-mono">En cours</span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono">
                    {format(new Date(alt.timestamp), 'dd/MM/yyyy — HH:mm:ss', { locale: fr })}
                  </div>

                  {alt.acknowledged_by && (
                    <div className="text-[10px] text-slate-500 font-mono">
                      Acquitté par: {alt.acknowledged_by}
                    </div>
                  )}

                  <div className="flex items-center space-x-2 text-xs pt-1">
                    {!alt.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alt.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Acquitter</span>
                      </button>
                    )}

                    <button
                      onClick={() => onNavigateTab('tracking', alt.vehicle_id)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Localiser</span>
                    </button>

                    <button
                      onClick={() => onNavigateTab('replay', alt.vehicle_id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold flex items-center gap-1 transition-colors"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Replay</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
