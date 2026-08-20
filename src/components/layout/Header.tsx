import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTraccar } from '../../contexts/TraccarContext';
import { useFleet } from '../../contexts/FleetContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { UserRole } from '../../types';
import {
  Bell,
  Radio,
  Shield,
  LogOut,
  SlidersHorizontal,
  Sun,
  Moon,
} from 'lucide-react';

export const Header: React.FC<{ onMobileMenuToggle: () => void }> = ({ onMobileMenuToggle }) => {
  const { user, role, logout, switchRole } = useAuth();
  const { traccarConnected, reconnect } = useTraccar();
  const { alerts } = useFleet();
  const { setDrawerOpen } = useNotifications();
  const { theme, toggleTheme } = useTheme();

  const unreadAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/90 dark:bg-slate-900/90 light:bg-white/95 backdrop-blur-xl border-b border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 px-4 lg:px-6 flex items-center justify-between shadow-lg transition-colors">
      {/* Left section: Hamburger mobile button & Brand Title */}
      <div className="flex items-center space-x-3 lg:space-x-4">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
          aria-label="Ouvrir le menu"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>

        {/* Traccar Status Pill */}
        <div className="flex items-center space-x-2">
          {traccarConnected ? (
            <span
              className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm"
              title="Serveur Traccar 6.5 connecté et opérationnel"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>● TRACCAR CONNECTÉ</span>
            </span>
          ) : (
            <button
              onClick={reconnect}
              className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-all shadow-sm"
              title="Cliquer pour reconnecter le serveur Traccar"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>● TRACCAR HORS LIGNE</span>
            </button>
          )}
        </div>
      </div>

      {/* Right section: Role switcher, Notifications & Profile */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Quick Role Switcher */}
        <div className="hidden md:flex items-center space-x-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-[10px]">
          <Shield className="w-3.5 h-3.5 text-cyan-400 ml-1.5" />
          <span className="font-medium text-slate-400 mr-1">Rôle:</span>
          {(['ADMIN', 'MANAGER', 'DRIVER', 'VIEWER'] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => switchRole(r)}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                role === r
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Notifications Bell Button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors focus:outline-none"
          title="Centre de notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadAlertsCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-rose-500 text-white text-[10px] font-black animate-bounce shadow-md">
              {unreadAlertsCount}
            </span>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors focus:outline-none"
          title={theme === 'dark' ? 'Mode Clair' : 'Mode Sombre'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-cyan-400" />
          )}
        </button>

        {/* User Profile Card */}
        <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-800">
          <img
            src={
              user?.avatar_url ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
            }
            alt={user?.full_name}
            className="w-8 h-8 rounded-full border border-slate-700 object-cover ring-2 ring-cyan-500/20"
          />
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-slate-200 truncate max-w-[140px]">
              {user?.full_name}
            </div>
            <div className="text-[10px] font-mono text-cyan-400 font-semibold">{role}</div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
