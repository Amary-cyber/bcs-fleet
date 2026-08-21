import React from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { useFleet } from '../../contexts/FleetContext';
import { Alert } from '../../types';
import { X, CheckCheck, AlertTriangle, Info, Bell, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const NotificationDrawer: React.FC<{ onSelectVehicleLocation?: (vehicleId: string) => void }> = ({
  onSelectVehicleLocation,
}) => {
  const { isDrawerOpen, setDrawerOpen } = useNotifications();
  const { alerts, markAlertRead, markAllAlertsRead } = useFleet();

  if (!isDrawerOpen) return null;

  const getAlertIcon = (type: Alert['alert_type']) => {
    switch (type) {
      case 'SPEEDING':
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
      case 'GEOFENCE_ENTER':
      case 'GEOFENCE_EXIT':
        return <MapPin className="w-5 h-5 text-cyan-400" />;
      default:
        return <Info className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={() => setDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white">Centre de Notifications</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
                {alerts.length}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={markAllAlertsRead}
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                title="Tout me marquer comme lu"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List of Alerts */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Aucune notification enregistrée</p>
              </div>
            ) : (
              alerts.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    markAlertRead(item.id);
                    setDrawerOpen(false);
                    if (onSelectVehicleLocation) {
                      onSelectVehicleLocation(item.vehicle_id);
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    item.is_read
                      ? 'bg-slate-800/40 border-slate-800/80 text-slate-400'
                      : 'bg-slate-800/90 border-cyan-500/40 text-slate-100 shadow-md shadow-cyan-950/20'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-700/60 shrink-0">
                      {getAlertIcon(item.alert_type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-400 truncate">
                          {item.vehicle_name} ({item.vehicle_plate})
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {format(new Date(item.timestamp), 'HH:mm', { locale: fr })}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-slate-200 mt-1 leading-snug">
                        {item.message}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/40 text-[10px] text-slate-400">
                        <span>Severity: {item.severity}</span>
                        <span className="text-cyan-400 hover:underline flex items-center gap-1">
                          Voir sur la carte →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
