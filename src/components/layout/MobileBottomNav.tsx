import React from 'react';
import { LayoutDashboard, MapPin, Car, Menu, BellRing, SlidersHorizontal, Radio } from 'lucide-react';
import { useFleet } from '../../contexts/FleetContext';

interface MobileBottomNavProps {
  currentTab: string;
  onTabSelect: (tabId: string) => void;
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onTabSelect,
  onOpenMenu,
}) => {
  const { vehicles, alerts } = useFleet();
  const movingVehicles = vehicles.filter((v) => v.status === 'MOVING').length;
  const unreadAlerts = alerts.filter((a) => !a.is_read).length;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/90 z-40 px-3 py-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around text-slate-400 select-none shadow-2xl ring-1 ring-cyan-500/10">
      {/* Dashboard */}
      <button
        onClick={() => onTabSelect('dashboard')}
        className={`flex-1 flex flex-col items-center gap-0.5 py-1 px-2 rounded-2xl transition-all active:scale-90 ${
          currentTab === 'dashboard'
            ? 'text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-500/20 shadow-sm'
            : 'hover:text-slate-200'
        }`}
      >
        <LayoutDashboard className="w-4 h-4" />
        <span className="text-[10px] tracking-tight">Dashboard</span>
      </button>

      {/* Flotte / Véhicules */}
      <button
        onClick={() => onTabSelect('vehicles')}
        className={`flex-1 flex flex-col items-center gap-0.5 py-1 px-2 rounded-2xl transition-all active:scale-90 relative ${
          currentTab === 'vehicles'
            ? 'text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-500/20 shadow-sm'
            : 'hover:text-slate-200'
        }`}
      >
        <Car className="w-4 h-4" />
        <span className="text-[10px] tracking-tight">Flotte ({vehicles.length})</span>
      </button>

      {/* Center Floating Live GPS Tracker Button with Radar Pulsing Ring */}
      <div className="flex-1 flex justify-center -translate-y-4">
        <button
          type="button"
          onClick={() => onTabSelect('tracking')}
          className="relative group cursor-pointer active:scale-90 transition-transform touch-manipulation focus:outline-none"
          title="Ouvrir la Carte GPS en Direct"
        >
          {/* Animated radar rings */}
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 opacity-60 blur-sm group-hover:opacity-100 animate-pulse"></span>
          
          <div className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 via-teal-400 to-emerald-400 text-slate-950 flex flex-col items-center justify-center shadow-2xl shadow-cyan-500/60 border-2 border-slate-950">
            <MapPin className="w-5 h-5 stroke-[2.5]" />
            {movingVehicles > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-mono font-black w-4 h-4 rounded-full flex items-center justify-center border border-slate-950 shadow-md">
                {movingVehicles}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Alerts */}
      <button
        onClick={() => onTabSelect('alerts')}
        className={`flex-1 flex flex-col items-center gap-0.5 py-1 px-2 rounded-2xl transition-all active:scale-90 relative ${
          currentTab === 'alerts'
            ? 'text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-500/20 shadow-sm'
            : 'hover:text-slate-200'
        }`}
      >
        <BellRing className="w-4 h-4" />
        <span className="text-[10px] tracking-tight">Alertes</span>
        {unreadAlerts > 0 && (
          <span className="absolute top-1 right-2 bg-rose-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center animate-bounce shadow-sm">
            {unreadAlerts}
          </span>
        )}
      </button>

      {/* Menu / Drawer */}
      <button
        onClick={onOpenMenu}
        className="flex-1 flex flex-col items-center gap-0.5 py-1 px-2 rounded-2xl hover:text-slate-200 transition-all active:scale-90"
      >
        <Menu className="w-4 h-4" />
        <span className="text-[10px] tracking-tight">Plus</span>
      </button>
    </div>
  );
};