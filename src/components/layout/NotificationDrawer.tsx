import React, { useState, useMemo } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { useFleet } from '../../contexts/FleetContext';
import { Alert } from '../../types';
import {
  X,
  CheckCheck,
  AlertTriangle,
  Info,
  Bell,
  MapPin,
  Check,
  Eye,
  History,
  ShieldAlert,
  Search,
  ExternalLink,
  Flame,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface NotificationDrawerProps {
  onSelectVehicleLocation?: (vehicleId: string) => void;
  onNavigateTab?: (tabId: string, vehicleId?: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  onSelectVehicleLocation,
  onNavigateTab,
}) => {
  const { isDrawerOpen, setDrawerOpen } = useNotifications();
  const { alerts, markAlertRead, markAllAlertsRead, acknowledgeAlert } = useFleet();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'CRITICAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const unreadCount = useMemo(() => alerts.filter((a) => !a.acknowledged).length, [alerts]);
  const criticalCount = useMemo(
    () => alerts.filter((a) => a.severity === 'CRITICAL' && !a.acknowledged).length,
    [alerts]
  );

  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      // Tab filter
      if (activeFilter === 'UNREAD' && item.acknowledged) return false;
      if (activeFilter === 'CRITICAL' && item.severity !== 'CRITICAL') return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesMsg = item.message?.toLowerCase().includes(query);
        const matchesVeh = item.vehicle_name?.toLowerCase().includes(query);
        const matchesPlate = item.vehicle_plate?.toLowerCase().includes(query);
        const matchesType = item.alert_type?.toLowerCase().includes(query);
        if (!matchesMsg && !matchesVeh && !matchesPlate && !matchesType) return false;
      }

      return true;
    });
  }, [alerts, activeFilter, searchQuery]);

  if (!isDrawerOpen) return null;

  const getAlertSeverityBadge = (severity: Alert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            CRITIQUE
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            AVERTISSEMENT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            INFO
          </span>
        );
    }
  };

  const getAlertIcon = (type: Alert['alert_type'], severity: Alert['severity']) => {
    if (severity === 'CRITICAL') {
      return <Flame className="w-4 h-4 text-rose-400" />;
    }
    switch (type) {
      case 'SPEEDING':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'GEOFENCE_ENTER':
      case 'GEOFENCE_EXIT':
        return <MapPin className="w-4 h-4 text-cyan-400" />;
      default:
        return <Info className="w-4 h-4 text-amber-400" />;
    }
  };

  const handleNavigateToLiveMap = (vehicleId: string) => {
    setDrawerOpen(false);
    if (onSelectVehicleLocation) {
      onSelectVehicleLocation(vehicleId);
    } else if (onNavigateTab) {
      onNavigateTab('tracking', vehicleId);
    }
  };

  const handleNavigateToReplay = (vehicleId: string) => {
    setDrawerOpen(false);
    if (onNavigateTab) {
      onNavigateTab('history', vehicleId);
    }
  };

  const handleNavigateToAllAlerts = () => {
    setDrawerOpen(false);
    if (onNavigateTab) {
      onNavigateTab('alerts');
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden">
      {/* Dark backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
        onClick={() => setDrawerOpen(false)}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10 z-[10001]">
        <div className="w-screen max-w-md sm:max-w-lg bg-slate-900 border-l border-slate-700/80 shadow-2xl flex flex-col h-full text-slate-100">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-white tracking-wide">
                    CENTRE DE NOTIFICATIONS
                  </h2>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                      {unreadCount} NON LUES
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Supervision des événements et alertes de la flotte
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAlertsRead}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-cyan-400 transition-all text-xs font-bold flex items-center gap-1.5"
                  title="Tout acquitter"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tout lire</span>
                </button>
              )}
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Filters Bar & Search */}
          <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 space-y-2.5">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                  activeFilter === 'ALL'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Toutes ({alerts.length})
              </button>

              <button
                onClick={() => setActiveFilter('UNREAD')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                  activeFilter === 'UNREAD'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Non lues ({unreadCount})
              </button>

              <button
                onClick={() => setActiveFilter('CRITICAL')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                  activeFilter === 'CRITICAL'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Critiques ({criticalCount})
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filtrer par véhicule, plaque, événement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List of Alerts */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-16 text-slate-500 space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center text-slate-600">
                  <Bell className="w-7 h-7" />
                </div>
                <div className="text-sm font-bold text-slate-400">
                  {searchQuery
                    ? 'Aucun résultat correspondant à la recherche'
                    : activeFilter === 'UNREAD'
                    ? 'Toutes les notifications sont acquittées'
                    : activeFilter === 'CRITICAL'
                    ? 'Aucune alerte critique enregistrée'
                    : 'Aucune notification'}
                </div>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Les alertes télématiques (excès de vitesse, entrée/sortie de zone, déconnexion) apparaîtront ici en temps réel.
                </p>
              </div>
            ) : (
              filteredAlerts.map((item) => {
                const isUnread = !item.acknowledged;
                const isCritical = item.severity === 'CRITICAL';

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      isCritical && isUnread
                        ? 'bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-950/30'
                        : isUnread
                        ? 'bg-slate-800/80 border-cyan-500/40 shadow-md shadow-cyan-950/20'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-400 opacity-90'
                    }`}
                  >
                    {/* Card Top: Type & Severity & Time */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`p-1.5 rounded-lg border ${
                            isCritical
                              ? 'bg-rose-500/20 border-rose-500/40'
                              : 'bg-slate-950 border-slate-700'
                          }`}
                        >
                          {getAlertIcon(item.alert_type, item.severity)}
                        </div>
                        {getAlertSeverityBadge(item.severity)}
                      </div>

                      <span className="text-[11px] font-mono text-slate-400">
                        {format(new Date(item.timestamp), 'dd MMM HH:mm:ss', { locale: fr })}
                      </span>
                    </div>

                    {/* Vehicle Identification */}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        {item.vehicle_name || 'Véhicule'}
                        {item.vehicle_plate && (
                          <span className="text-slate-400">({item.vehicle_plate})</span>
                        )}
                      </span>

                      {item.speed !== undefined && (
                        <span className="text-slate-300 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 font-bold">
                          {item.speed} km/h
                          {item.speed_limit && (
                            <span className="text-rose-400 ml-1 text-[10px]">
                              / max {item.speed_limit}
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Message Body */}
                    <p className="text-xs text-slate-200 leading-relaxed font-medium">
                      {item.message}
                    </p>

                    {/* Action Buttons Footer */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 text-xs">
                      {/* Acknowledge Button */}
                      {isUnread ? (
                        <button
                          onClick={() => {
                            acknowledgeAlert(item.id);
                            markAlertRead(item.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700 transition-all font-semibold flex items-center gap-1 text-[11px]"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Acquitter</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3 text-slate-500" />
                          Acquittée
                        </span>
                      )}

                      {/* Map & Replay Actions */}
                      <div className="flex items-center space-x-1.5">
                        {item.vehicle_id && (
                          <>
                            <button
                              onClick={() => handleNavigateToReplay(item.vehicle_id)}
                              className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all text-[11px] font-medium flex items-center gap-1"
                              title="Voir l'historique et le replay"
                            >
                              <History className="w-3 h-3 text-amber-400" />
                              <span>Replay</span>
                            </button>

                            <button
                              onClick={() => handleNavigateToLiveMap(item.vehicle_id)}
                              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold transition-all text-[11px] flex items-center gap-1 shadow-sm hover:from-cyan-400 hover:to-teal-400"
                              title="Centrer sur la carte en temps réel"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Carte</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Bottom Bar */}
          <div className="p-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">
              Total: <strong className="text-white">{alerts.length}</strong> événements
            </span>

            <button
              onClick={handleNavigateToAllAlerts}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 hover:text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <span>Journal Complet</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
