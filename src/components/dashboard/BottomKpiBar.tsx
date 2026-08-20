import React from 'react';
import { Vehicle, Alert } from '../../types';
import { Car, Activity, Clock, Radio, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface BottomKpiBarProps {
  vehicles: Vehicle[];
  alerts: Alert[];
  onNavigateTab?: (tabId: string) => void;
}

export const BottomKpiBar: React.FC<BottomKpiBarProps> = ({ vehicles, alerts, onNavigateTab }) => {
  const totalCount = vehicles.length;
  const movingCount = vehicles.filter((v) => v.status === 'MOVING').length;
  const stoppedCount = vehicles.filter((v) => v.status === 'STOPPED').length;
  const offlineCount = vehicles.filter((v) => v.status === 'OFFLINE' || v.comm_status === 'OFFLINE').length;
  const onlineCount = totalCount - offlineCount;
  const unreadAlertsCount = alerts.filter((a) => !a.is_read).length;

  return (
    <footer className="h-12 bg-slate-900/95 border-t border-slate-800 px-4 flex items-center justify-between shadow-2xl text-xs font-mono shrink-0 select-none">
      <div className="flex items-center space-x-4 overflow-x-auto scrollbar-none py-1">
        {/* Total */}
        <div className="flex items-center space-x-1.5 text-slate-300">
          <Car className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-400 font-sans">TOTAL:</span>
          <span className="font-bold text-white text-sm">{totalCount}</span>
        </div>

        <span className="text-slate-800">|</span>

        {/* Online */}
        <div className="flex items-center space-x-1.5 text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-slate-400 font-sans">EN LIGNE:</span>
          <span className="font-bold text-emerald-400 text-sm">{onlineCount}</span>
        </div>

        <span className="text-slate-800">|</span>

        {/* Moving */}
        <div className="flex items-center space-x-1.5 text-emerald-400">
          <Activity className="w-4 h-4 animate-pulse" />
          <span className="text-slate-400 font-sans">EN MOUVEMENT:</span>
          <span className="font-bold text-emerald-400 text-sm">{movingCount}</span>
        </div>

        <span className="text-slate-800">|</span>

        {/* Stopped */}
        <div className="flex items-center space-x-1.5 text-amber-400">
          <Clock className="w-4 h-4" />
          <span className="text-slate-400 font-sans">ARRÊTÉS:</span>
          <span className="font-bold text-amber-400 text-sm">{stoppedCount}</span>
        </div>

        <span className="text-slate-800">|</span>

        {/* Offline */}
        <div className="flex items-center space-x-1.5 text-slate-400">
          <Radio className="w-4 h-4 text-slate-500" />
          <span className="text-slate-400 font-sans">HORS LIGNE:</span>
          <span className="font-bold text-slate-400 text-sm">{offlineCount}</span>
        </div>

        <span className="text-slate-800">|</span>

        {/* Alerts */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('alerts')}
          className="flex items-center space-x-1.5 text-rose-400 cursor-pointer hover:underline"
        >
          <AlertTriangle className="w-4 h-4 animate-bounce" />
          <span className="text-slate-400 font-sans">ALERTES:</span>
          <span className="font-bold text-rose-400 text-sm">{unreadAlertsCount}</span>
        </div>
      </div>

      <div className="hidden md:flex items-center space-x-2 text-[10px] text-slate-500">
        <span>Mise à jour temps réel:</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
      </div>
    </footer>
  );
};
