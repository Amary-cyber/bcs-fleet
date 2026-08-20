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
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AlertsPageProps {
  onNavigateTab: (tabId: string, vehicleId?: string) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ onNavigateTab }) => {
  const { alerts, markAlertRead, markAllAlertsRead } = useFleet();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAlerts = alerts.filter((a) => {
    const matchesSearch =
      a.vehicle_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.vehicle_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'ALL' || a.alert_type === filterType;
    return matchesSearch && matchesType;
  });

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
            Historique complet des événements de sécurité: excès de vitesse, sorties de zone et anomalies.
          </p>
        </div>

        <button
          onClick={markAllAlertsRead}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all shadow-lg flex items-center space-x-2 shrink-0"
        >
          <CheckCheck className="w-4 h-4" />
          <span>TOUT MARQUER COMME LU</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher véhicule, immatriculation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1">
          {[
            { id: 'ALL', label: 'Toutes les alertes' },
            { id: 'SPEEDING', label: '⚡ Excès de Vitesse' },
            { id: 'GEOFENCE_ENTER', label: '📍 Entrée Zone' },
            { id: 'GEOFENCE_EXIT', label: '📍 Sortie Zone' },
            { id: 'GPS_OFFLINE', label: '📡 GPS Hors Ligne' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterType === tab.id
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="glass-panel p-12 text-center text-slate-500 rounded-2xl">
            <BellRing className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucune alerte enregistrée pour ces critères.</p>
          </div>
        ) : (
          filteredAlerts.map((alt) => (
            <div
              key={alt.id}
              onClick={() => markAlertRead(alt.id)}
              className={`glass-panel p-5 rounded-2xl border transition-all cursor-pointer ${
                alt.is_read
                  ? 'border-slate-800/80 bg-slate-900/60 opacity-80'
                  : 'border-rose-500/40 bg-slate-900 shadow-xl shadow-rose-950/20'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                    <AlertTriangle className="w-6 h-6 text-rose-400" />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-white text-sm">{alt.vehicle_name}</h3>
                      <span className="font-mono text-xs text-cyan-400 font-bold">
                        ({alt.vehicle_plate})
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 font-medium mt-1">{alt.message}</p>

                    {alt.speed && alt.speed_limit && (
                      <div className="text-xs font-mono text-rose-300 mt-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-lg inline-block">
                        Vitesse enregistrée: <strong>{alt.speed} km/h</strong> (Limite autorisée: {alt.speed_limit} km/h)
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:items-end justify-between space-y-2 shrink-0 border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
                  {getAlertSeverityBadge(alt.severity)}
                  <div className="text-[11px] text-slate-400 font-mono">
                    {format(new Date(alt.timestamp), 'dd/MM/yyyy — HH:mm', { locale: fr })}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateTab('tracking', alt.vehicle_id);
                    }}
                    className="text-xs text-cyan-400 hover:underline font-semibold"
                  >
                    Localiser sur la carte →
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
