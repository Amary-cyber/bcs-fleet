import React, { useEffect } from 'react';
import { useFleet } from '../../contexts/FleetContext';
import { AlertTriangle, Bell, X, Eye, Check } from 'lucide-react';

interface AlertToastContainerProps {
  onNavigateTab: (tabId: string, vehicleId?: string) => void;
}

export const AlertToastContainer: React.FC<AlertToastContainerProps> = ({ onNavigateTab }) => {
  const { toastNotification, clearToast, acknowledgeAlert } = useFleet();

  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => {
        clearToast();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification, clearToast]);

  if (!toastNotification) return null;

  const isCritical = toastNotification.severity === 'CRITICAL';

  return (
    <div className="fixed top-20 right-4 z-50 max-w-md w-full animate-bounce-short">
      <div
        className={`p-4 rounded-2xl border backdrop-blur-xl shadow-2xl space-y-3 ${
          isCritical
            ? 'bg-slate-900/95 border-rose-500/80 shadow-rose-950/40 text-rose-200'
            : 'bg-slate-900/95 border-amber-500/80 shadow-amber-950/40 text-amber-200'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                isCritical
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-sm font-mono flex items-center gap-2">
                <span>{toastNotification.title || 'NOUVELLE ALERTE SÉCURITÉ'}</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">{toastNotification.message}</p>
            </div>
          </div>

          <button onClick={clearToast} className="text-slate-400 hover:text-white shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {toastNotification.speed && toastNotification.speed_limit && (
          <div className="text-xs font-mono bg-slate-950/80 p-2 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Vitesse Mesurée:</span>
            <span className="text-rose-400 font-bold">{toastNotification.speed} km/h (Limite: {toastNotification.speed_limit} km/h)</span>
          </div>
        )}

        <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-800 text-xs">
          <button
            onClick={() => {
              acknowledgeAlert(toastNotification.id);
              clearToast();
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 font-semibold"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Acquitter</span>
          </button>

          <button
            onClick={() => {
              const vehId = toastNotification.vehicle_id;
              clearToast();
              onNavigateTab('tracking', vehId);
            }}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Voir sur la carte</span>
          </button>
        </div>
      </div>
    </div>
  );
};
