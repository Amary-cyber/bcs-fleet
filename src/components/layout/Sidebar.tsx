import React, { useState } from 'react';
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
  Wrench,
  Wallet,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Apple,
  Command
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  shortcut?: string;
  badge?: number | string;
  badgeColor?: string;
  allowedRoles?: string[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  currentTab: string;
  onTabSelect: (tabId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabSelect }) => {
  const { alerts, vehicles, drivers, maintenanceRecords, geofences } = useFleet();
  const { role } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const unreadAlerts = alerts.filter((a) => !a.is_read).length;
  const movingVehicles = vehicles.filter((v) => v.status === 'MOVING').length;
  const scheduledMaintenance = maintenanceRecords.filter(
    (r) => r.status === 'SCHEDULED' || r.status === 'IN_PROGRESS'
  ).length;

  const sections: NavSection[] = [
    {
      title: 'SUPERVISION',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: '⌘1' },
        {
          id: 'tracking',
          label: 'Live Tracking',
          icon: MapPin,
          shortcut: '⌘2',
          badge: `${movingVehicles}/${vehicles.length}`,
          badgeColor: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
        },
      ],
    },
    {
      title: 'FLOTTE & ZONES',
      items: [
        { id: 'vehicles', label: 'Véhicules', icon: Car, shortcut: '⌘3', badge: vehicles.length },
        { id: 'drivers', label: 'Chauffeurs', icon: Users, shortcut: '⌘4', badge: drivers.length },
        { id: 'geofences', label: 'Géofences', icon: CircleDot, badge: geofences.length },
      ],
    },
    {
      title: 'OPÉRATIONS',
      items: [
        {
          id: 'alerts',
          label: 'Alertes',
          icon: BellRing,
          shortcut: '⌘6',
          badge: unreadAlerts > 0 ? unreadAlerts : undefined,
          badgeColor: 'bg-rose-500 text-white font-black animate-pulse shadow-md shadow-rose-950',
        },
        {
          id: 'maintenance',
          label: 'Maintenance',
          icon: Wrench,
          shortcut: '⌘7',
          badge: scheduledMaintenance > 0 ? scheduledMaintenance : undefined,
          badgeColor: 'bg-amber-500 text-slate-950 font-bold',
        },
        { id: 'expenses', label: 'Dépenses & TCO', icon: Wallet, shortcut: '⌘8' },
        { id: 'history', label: 'Historique Trajets', icon: History, shortcut: '⌘5' },
      ],
    },
    {
      title: 'ANALYTIQUE',
      items: [
        { id: 'reports', label: 'Rapports & Stats', icon: FileSpreadsheet, shortcut: '⌘9' },
        { id: 'devices', label: 'Traceurs GPS', icon: Radio, allowedRoles: ['ADMIN', 'MANAGER'] },
      ],
    },
    {
      title: 'CONFIGURATION',
      items: [
        { id: 'alert-rules', label: 'Règles d\'Alertes', icon: SlidersHorizontal, allowedRoles: ['ADMIN', 'MANAGER'] },
        { id: 'users', label: 'Utilisateurs', icon: UserCheck, allowedRoles: ['ADMIN', 'MANAGER'] },
        { id: 'audit', label: 'Journal d\'Activité', icon: ClipboardList, allowedRoles: ['ADMIN', 'MANAGER'] },
        { id: 'settings', label: 'Paramètres', icon: Settings },
      ],
    },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-slate-900/95 dark:bg-slate-900/95 light:bg-slate-900 border-r border-slate-800/80 flex flex-col h-screen shrink-0 select-none transition-all duration-300 relative z-20 backdrop-blur-xl`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Flame className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-base font-black text-white tracking-wider font-mono leading-tight flex items-center gap-1.5">
                <span>BCS</span>
                <span className="text-cyan-400">FLEET</span>
              </h1>
              <p className="text-[9px] text-slate-400 font-semibold tracking-wider truncate">
                SUPERVISION TÉLÉMATIQUE
              </p>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Déplier la barre latérale (⌘B)' : 'Replier la barre latérale (⌘B)'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto scrollbar-thin">
        {sections.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.allowedRoles || item.allowedRoles.includes(role)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-bold text-slate-500 tracking-wider uppercase font-mono">
                  {section.title}
                </div>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onTabSelect(item.id)}
                    title={isCollapsed ? `${item.label} ${item.shortcut ? `(${item.shortcut})` : ''}` : undefined}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2'
                    } rounded-xl font-medium text-xs transition-all duration-200 group relative ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/20 via-teal-500/10 to-transparent text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-950/40 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-cyan-400 rounded-r-full shadow-lg shadow-cyan-400/80" />
                    )}

                    <div className="flex items-center space-x-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 transition-transform duration-200 shrink-0 ${
                          isActive
                            ? 'text-cyan-400 scale-110'
                            : 'text-slate-400 group-hover:text-slate-200 group-hover:scale-105'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isCollapsed && (
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {item.badge !== undefined && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                              item.badgeColor || 'bg-slate-800 text-slate-300 border border-slate-700/80'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        {item.shortcut && (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-mono text-slate-500 bg-slate-950 px-1 rounded border border-slate-800">
                            {item.shortcut}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-center">
        {!isCollapsed ? (
          <div>
            <div className="text-[11px] font-bold text-slate-300 flex items-center justify-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              BCS Fleet Mac Pro
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5 font-mono">v1.3.0 • Dakar, SN</div>
          </div>
        ) : (
          <div className="w-2 h-2 mx-auto rounded-full bg-emerald-400 animate-pulse" title="Système Opérationnel" />
        )}
      </div>
    </aside>
  );
};
