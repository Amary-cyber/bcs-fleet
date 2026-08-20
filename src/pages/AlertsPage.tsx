import React, { useState } from 'react';
import { useFleet } from '../contexts/FleetContext';
import { Alert, AlertType } from '../types';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AlertsPageProps {
  onNavigateTab: (tabId: string, vehicleId?: string) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ onNavigateTab }) => {
  const { alerts, acknowledgeAlert, markAllAlertsRead } = useFleet();
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlertForMap, setSelectedAlertForMap] = useState<Alert | null>(null);

  // Filtered Alerts List
  const filteredAlerts = alerts.filter((a) => {
    const matchesSearch =
      a.vehicle_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.vehicle_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.title && a.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSeverity =
      filterSeverity === 'ALL' ||
      (filterSeverity === 'UNREAD' && !a.is_read) ||
      (filterSeverity === 'CRITICAL' && a.severity === 'CRITICAL') ||
      (filterSeverity === 'WARNING' && a.severity === 'WARNING') ||
      (filterSeverity === 'INFO' && a.severity === 'INFO');

    const matchesType = filterType === 'ALL' || a.alert_type === filterType;
    return matchesSearch && matchesSeverity && matchesType;
  });

  // KPI Calculations
  const kpiTotal = alerts.length;
  const kpiUnread = alerts.filter((a) => !a.is_read).length;
  const kpiCritical = alerts.filter((a) => a.severity === 'CRITICAL' && !a.is_read).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const kpiToday = alerts.filter((a) => a.timestamp.startsWith(todayStr)).length;
  const kpiActive = alerts.filter((a) => !a.acknowledged).length;

  const getAlertSeverityBadge = (severity: Alert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
            🔴 CRITIQUE
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
            🟠 AVERTISSEMENT
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            🔵 INFORMATION
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white font-mono flex items-center gap-2">
            <BellRing className="w-6 h-6 text-rose-400" />
            JOURNAL ET GESTION DES ALERTES
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Traçabilité des anomalies télématiques: excès de vitesse, entrées/sorties de géofences, batterie et signaux SOS.
          </p>
        </div>

        <button
          onClick={markAllAlertsRead}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all shadow-lg flex items-center space-x-2 shrink-0"
        >
          <CheckCheck className="w-4 h-4" />
          <span>TOUT ACQUITTER &amp; MARQUER COMME LU</span>
        </button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Alertes</div>
          <div className="text-xl font-black text-white font-mono mt-1">{kpiTotal}</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Non Lues</div>
          <div className="text-xl font-black text-amber-400 font-mono mt-1">{kpiUnread}</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">Critiques Non Lues</div>
          <div className="text-xl font-black text-rose-400 font-mono mt-1">{kpiCritical}</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">Aujourd'hui</div>
          <div className="text-xl font-black text-cyan-400 font-mono mt-1">{kpiToday}</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">En Cours</div>
          <div className="text-xl font-black text-slate-300 font-mono mt-1">{kpiActive}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher véhicule, immatriculation, message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs w-full lg:w-auto">
          {/* Severity Tabs */}
          {[
            { id: 'ALL', label: 'Toutes' },
            { id: 'UNREAD', label: `⚠️ Non lues (${kpiUnread})` },
            { id: 'CRITICAL', label: '🔴 Critiques' },
            { id: 'WARNING', label: '🟠 Avertissements' },
            { id: 'INFO', label: '🔵 Info' },
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

          {/* Type Select */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:border-cyan-500"
          >
            <option value="ALL">Tous les types</option>
            <option value="SPEEDING">⚡ Excès de Vitesse</option>
            <option value="GEOFENCE_ENTER">📍 Entrée Zone</option>
            <option value="GEOFENCE_EXIT">📍 Sortie Zone</option>
            <option value="GPS_OFFLINE">📡 GPS Hors Ligne</option>
            <option value="LOW_BATTERY">🔋 Batterie Faible</option>
            <option value="IGNITION">🔑 Contact Allumé/Coupé</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="glass-panel p-12 text-center text-slate-500 rounded-2xl border border-slate-800">
            <BellRing className="w-12 h-12 mx-auto mb-3 opacity-30 text-cyan-400" />
            <p className="text-sm font-medium">Aucune alerte enregistrée pour ces critères de recherche.</p>
          </div>
        ) : (
          filteredAlerts.map((alt) => (
            <div
              key={alt.id}
              className={`glass-panel p-5 rounded-2xl border transition-all ${
                alt.is_read
                  ? 'border-slate-800/80 bg-slate-900/60 opacity-80'
                  : 'border-rose-500/40 bg-slate-900 shadow-xl shadow-rose-950/20'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                    <AlertTriangle className="w-6 h-6 text-rose-400" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-white text-sm">{alt.title || alt.vehicle_name}</h3>
                      <span className="font-mono text-xs text-cyan-400 font-bold">
                        ({alt.vehicle_plate})
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 font-medium">{alt.message}</p>

                    {alt.speed && alt.speed_limit && (
                      <div className="text-xs font-mono text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-lg inline-block">
                        Vitesse enregistrée: <strong>{alt.speed} km/h</strong> (Limite autorisée: {alt.speed_limit} km/h)
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col md:items-end justify-between space-y-2 shrink-0 border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
                  <div className="flex items-center space-x-2">
                    {getAlertSeverityBadge(alt.severity)}
                    {alt.is_read ? (
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <Check className="w-3 h-3" /> Acquittée
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-mono">En attente</span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono">
                    {format(new Date(alt.timestamp), 'dd/MM/yyyy — HH:mm:ss', { locale: fr })}
                  </div>

                  <div className="flex items-center space-x-2 text-xs pt-1">
                    {!alt.is_read && (
                      <button
                        onClick={() => acknowledgeAlert(alt.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3 h-3 text-emerald-400" /> Acquitter
                      </button>
                    )}

                    <button
                      onClick={() => onNavigateTab('tracking', alt.vehicle_id)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> Localiser
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
