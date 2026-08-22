import React from 'react';
import { LayoutDashboard, MapPin, Car, Menu, BellRing, SlidersHorizontal } from 'lucide-react';
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
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 z-40 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around text-slate-400 select-none">
      {/* Dashboard */}
      <button
        onClick={() => onTabSelect('dashboard')}
        className={`flex flex-col items-center gap-0.5 p-1 rounded-xl transition-all ${
          currentTab === 'dashboard' ? 'text-cyan-400 font-bold' : 'hover:text-slate-200'
        }`}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-[9px]">Dashboard</span>
      </button>

      {/* Live GPS Tracking */}
      <button
        onClick={() => onTabSelect('tracking')}
        className={`flex flex-col items-center gap-0.5 p-1 rounded-xl transition-all relative ${
          currentTab === 'tracking' ? 'text-cyan-400 font-bold' : 'hover:text-slate-200'
        }`}
      >
        <MapPin className="w-5 h-5" />
        <span className="text-[9px]">Live GPS</span>
        {movingVehicles > 0 && (
          <span className="absolute -top-1 right-1 bg-emerald-500 text-slate-950 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
            {movingVehicles}
          </span>
        )}
      </button>

      {/* Center Quick Live Tracking Floating Button */}
      <button
        type="button"
        onClick={() => onTabSelect('tracking')}
        className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-teal-400 text-slate-950 flex items-center justify-center shadow-xl shadow-cyan-500/40 transform -translate-y-3.5 border-2 border-slate-950 active:scale-90 transition-all cursor-pointer touch-manipulation z-50 shrink-0"
        title="Ouvrir la Carte GPS en Direct"
      >
        <MapPin className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* Vehicles */}
      <button
        onClick={() => onTabSelect('vehicles')}
        className={`flex flex-col items-center gap-0.5 p-1 rounded-xl transition-all ${
          currentTab === 'vehicles' ? 'text-cyan-400 font-bold' : 'hover:text-slate-200'
        }`}
      >
        <Car className="w-5 h-5" />
        <span className="text-[9px]">Flotte</span>
      </button>

      {/* Menu / Drawer */}
      <button
        onClick={onOpenMenu}
        className="flex flex-col items-center gap-0.5 p-1 rounded-xl hover:text-slate-200 transition-all relative"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[9px]">Menu</span>
        {unreadAlerts > 0 && (
          <span className="absolute -top-1 right-1 bg-rose-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse">
            !
          </span>
        )}
      </button>
    </div>
  );
};