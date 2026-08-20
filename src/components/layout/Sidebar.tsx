import React from 'react';
import { useFleet } from '../../contexts/FleetContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  MapPin,
  Car,
  Users,
  Radio,
  History,
  CircleDot,
  BellRing,
  FileSpreadsheet,
  UserCheck,
  ClipboardList,
  SlidersHorizontal,
  Settings,
  Flame,
} from 'lucide-react';


export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
  allowedRoles?: string[];
}

interface SidebarProps {
  currentTab: string;
  onTabSelect: (tabId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabSelect }) => {
  const { alerts, vehicles, drivers } = useFleet();
  const { role } = useAuth();

  const unreadAlerts = alerts.filter((a) => !a.is_read).length;
  const movingVehicles = vehicles.filter((v) => v.status === 'MOVING').length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tracking', label: 'Live Tracking', icon: MapPin, badge: `${movingVehicles}/${vehicles.length}`, badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
    { id: 'vehicles', label: 'Véhicules', icon: Car, badge: vehicles.length },
    { id: 'drivers', label: 'Chauffeurs', icon: Users, badge: drivers.length },
    { id: 'devices', label: 'Traceurs GPS', icon: Radio, allowedRoles: ['ADMIN', 'MANAGER'] },
    { id: 'history', label: 'Historique', icon: History },
    { id: 'geofences', label: 'Géofences', icon: CircleDot },
    { id: 'alerts', label: 'Alertes', icon: BellRing, badge: unreadAlerts > 0 ? unreadAlerts : undefined, badgeColor: 'bg-rose-500 text-white animate-pulse' },
    { id: 'alert-rules', label: 'Règles d\'Alertes', icon: SlidersHorizontal, allowedRoles: ['ADMIN', 'MANAGER'] },
    { id: 'reports', label: 'Rapports', icon: FileSpreadsheet },
    { id: 'users', label: 'Utilisateurs & Accès', icon: UserCheck, allowedRoles: ['ADMIN', 'MANAGER'] },
    { id: 'audit', label: 'Journal d\'Activité', icon: ClipboardList, allowedRoles: ['ADMIN', 'MANAGER'] },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];


  const filteredNavItems = navItems.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(role)
  );

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center space-x-3 border-b border-slate-800 bg-slate-950/50">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Flame className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-wider font-mono">
            BCS <span className="text-cyan-400">FLEET</span>
          </h1>
          <p className="text-[10px] text-slate-400 tracking-wider">TRACKING GPS DAKAR</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 tracking-wider uppercase">
          Menu Principal
        </div>
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabSelect(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/10 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive
                      ? 'text-cyan-400 scale-110'
                      : 'text-slate-400 group-hover:text-slate-200 group-hover:scale-105'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    item.badgeColor || 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-center">
        <div className="text-[11px] font-semibold text-slate-400">BCS Fleet Senegal</div>
        <div className="text-[10px] text-slate-500 mt-0.5">v1.0.0 — Production Ready</div>
      </div>
    </aside>
  );
};
