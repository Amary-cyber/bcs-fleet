import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTraccar } from '../../contexts/TraccarContext';
import { useFleet } from '../../contexts/FleetContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Vehicle, UserRole } from '../../types';
import {
  Search,
  Radio,
  Bell,
  Sun,
  Moon,
  Shield,
  LogOut,
  SlidersHorizontal,
  Flame,
  CheckCircle2,
  AlertCircle,
  Car,
  User,
  MapPin,
  Sparkles,
  Command,
} from 'lucide-react';

interface TelematicsHeaderProps {
  onVehicleSelect: (vehicle: Vehicle) => void;
  onMobileMenuToggle: () => void;
}

export const TelematicsHeader: React.FC<TelematicsHeaderProps> = ({
  onVehicleSelect,
  onMobileMenuToggle,
}) => {
  const { user, role, logout, switchRole } = useAuth();
  const { isDemoMode, toggleDemoMode, traccarConnected } = useTraccar();
  const { vehicles, alerts } = useFleet();
  const { theme, toggleTheme } = useTheme();
  const { setDrawerOpen } = useNotifications();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const unreadAlertsCount = alerts.filter((a) => !a.is_read).length;

  // Instant global search filtering
  const searchResults = searchQuery.trim()
    ? vehicles.filter((v) => {
        const query = searchQuery.toLowerCase();
        return (
          v.name.toLowerCase().includes(query) ||
          v.plate_number.toLowerCase().includes(query) ||
          (v.driver_name && v.driver_name.toLowerCase().includes(query)) ||
          (v.device_imei && v.device_imei.toLowerCase().includes(query)) ||
          (v.last_address && v.last_address.toLowerCase().includes(query))
        );
      })
    : [];

  // Hotkey listener (Ctrl+K or / to focus search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/90 dark:bg-slate-900/90 light:bg-white/95 backdrop-blur-xl border-b border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 px-4 lg:px-6 flex items-center justify-between shadow-lg transition-colors">
      {/* Left: Hamburger (mobile) + Brand Title + LIVE Indicator */}
      <div className="flex items-center space-x-3 lg:space-x-4">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Menu Mobile"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>

        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 p-0.5 shadow-md shadow-cyan-500/20 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Flame className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-black tracking-wider font-mono text-white dark:text-white light:text-slate-900 leading-tight">
                BCS <span className="text-cyan-400">FLEET</span>
              </span>
              <span className="hidden xl:inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                PRO SaaS
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-medium tracking-wider hidden sm:block">
              SUPERVISION TÉLÉMATIQUE
            </p>
          </div>
        </div>

        {/* LIVE / DEMO Indicator Pill */}
        <div className="hidden sm:flex items-center pl-2 border-l border-slate-800/80">
          {isDemoMode ? (
            <button
              onClick={() => toggleDemoMode(false)}
              className="group flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all shadow-sm"
              title="Cliquer pour basculer en MODE LIVE (Traccar 6.5)"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>MODE DEMO</span>
              <span className="text-[10px] text-amber-300/80 font-normal hidden md:inline">
                (Dakar Sim)
              </span>
            </button>
          ) : (
            <button
              onClick={() => toggleDemoMode(true)}
              className="group flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all shadow-sm shadow-emerald-950/40"
              title="Cliquer pour basculer en MODE DEMO"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="tracking-wide">● LIVE</span>
              <span className="text-[10px] font-mono text-emerald-300/90 hidden lg:inline">
                {traccarConnected ? 'Traccar Connecté' : 'En attente...'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div ref={searchRef} className="relative flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher véhicule, plaque, chauffeur, IMEI..."
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            className="w-full pl-9 pr-14 py-2 bg-slate-950/70 dark:bg-slate-950/70 light:bg-slate-100 border border-slate-800 dark:border-slate-800 light:border-slate-300 rounded-xl text-xs text-white dark:text-white light:text-slate-900 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner"
          />
          <div className="absolute right-3 top-2 flex items-center space-x-1 text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
            <span>⌘K</span>
          </div>
        </div>

        {/* Instant Search Results Dropdown */}
        {isSearchOpen && searchResults.length > 0 && (
          <div className="absolute top-11 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-800/60 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2">
            {searchResults.map((v) => (
              <div
                key={v.id}
                onClick={() => {
                  onVehicleSelect(v);
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                className="p-3 hover:bg-slate-800/80 cursor-pointer transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-slate-950 text-cyan-400 border border-slate-800 group-hover:border-cyan-500/40 transition-colors">
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {v.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Plaque: <span className="text-cyan-400 font-bold">{v.plate_number}</span> •{' '}
                      {v.driver_name || 'Sans chauffeur'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-emerald-400 block">
                    {v.current_speed} km/h
                  </span>
                  <span className="text-[9px] text-slate-500 flex items-center gap-1 justify-end">
                    <MapPin className="w-2.5 h-2.5" /> Voir sur carte
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Quick Tools (Role Switcher, Notifications, Theme, Profile) */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Role Switcher Pill (Dev / Admin Utility) */}
        <div className="hidden xl:flex items-center space-x-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-[10px]">
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
          title="Centre de notifications & alertes"
        >
          <Bell className="w-5 h-5" />
          {unreadAlertsCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-rose-500 text-white text-[10px] font-black animate-bounce shadow-lg shadow-rose-950">
              {unreadAlertsCount}
            </span>
          )}
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors focus:outline-none"
          title={theme === 'dark' ? 'Passer en Mode Clair' : 'Passer en Mode Sombre'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-cyan-400" />
          )}
        </button>

        {/* User Profile Avatar & Card */}
        <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-800/80">
          <img
            src={
              user?.avatar_url ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
            }
            alt={user?.full_name}
            className="w-8 h-8 rounded-full border border-slate-700 object-cover ring-2 ring-cyan-500/20"
          />
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-white dark:text-white light:text-slate-900 truncate max-w-[120px]">
              {user?.full_name}
            </div>
            <div className="text-[9px] font-mono font-semibold text-cyan-400">{role}</div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
            title="Se déconnecter de BCS Fleet"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
