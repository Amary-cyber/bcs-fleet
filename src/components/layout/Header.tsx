import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTraccar } from '../../contexts/TraccarContext';
import { useFleet } from '../../contexts/FleetContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { UserRole } from '../../types';
import {
  Bell,
  Radio,
  Shield,
  LogOut,
  SlidersHorizontal,
  Activity,
  UserCheck,
} from 'lucide-react';

export const Header: React.FC<{ onMobileMenuToggle: () => void }> = ({ onMobileMenuToggle }) => {
  const { user, role, logout, switchRole } = useAuth();
  const { isDemoMode, toggleDemoMode, traccarConnected } = useTraccar();
  const { alerts } = useFleet();
  const { setDrawerOpen } = useNotifications();

  const unreadAlertsCount = alerts.filter((a) => !a.is_read).length;

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-6 flex items-center justify-between shadow-lg">
      {/* Left section: Hamburger mobile button & Brand Title */}
      <div className="flex items-center space-x-3 lg:space-x-4">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
          aria-label="Ouvrir le menu"
        >
          <SlidersHorizontal className="w-6 h-6" />
        </button>

        {/* Status Mode Badge */}
        <div className="flex items-center space-x-2">
          {isDemoMode ? (
            <span
              onClick={() => toggleDemoMode(false)}
              className="cursor-pointer group flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all"
              title="Cliquer pour basculer en MODE LIVE avec Traccar"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>MODE DEMO</span>
              <span className="hidden sm:inline text-[10px] text-amber-300 opacity-70 group-hover:opacity-100">
                (Simulateur Dakar)
              </span>
            </span>
          ) : (
            <span
              onClick={() => toggleDemoMode(true)}
              className="cursor-pointer group flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
              title="Cliquer pour repasser en MODE DEMO"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>MODE LIVE</span>
              <span className="hidden sm:inline text-[10px] text-emerald-300 opacity-70">
                {traccarConnected ? 'Traccar Connecté' : 'Traccar En attente'}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Right section: Role switcher, Notifications & Profile */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Quick Role Switcher (Dev & Demo Tester Tool) */}
        <div className="hidden md:flex items-center space-x-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
          <Shield className="w-3.5 h-3.5 text-cyan-400 ml-1.5" />
          <span className="text-[11px] font-medium text-slate-400 mr-1">Rôle:</span>
          {(['ADMIN', 'MANAGER', 'DRIVER', 'VIEWER'] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => switchRole(r)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                role === r
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Notifications Bell Button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
          title="Centre de notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadAlertsCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-bounce shadow-md">
              {unreadAlertsCount}
            </span>
          )}
        </button>

        {/* User Profile Card */}
        <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
          <img
            src={
              user?.avatar_url ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
            }
            alt={user?.full_name}
            className="w-8 h-8 rounded-full border border-slate-700 object-cover ring-2 ring-cyan-500/20"
          />
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">
              {user?.full_name}
            </div>
            <div className="flex items-center space-x-1 text-[10px] font-mono text-cyan-400">
              <UserCheck className="w-3 h-3 inline" />
              <span>{role}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
