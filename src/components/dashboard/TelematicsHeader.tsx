import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTraccar } from '../../contexts/TraccarContext';
import { useFleet } from '../../contexts/FleetContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Vehicle } from '../../types';
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

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

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
    <header className="sticky top-0 z-30 h-16 bg-slate-900/95 dark:bg-slate-900/95 light:bg-white/95 backdrop-blur-md border-b border-slate-800 dark:border-slate-800 light:border-slate-200 px-4 lg:px-6 flex items-center justify-between shadow-lg">
      {/* Brand Title & Mode Indicator */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Menu Mobile"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 p-0.5 shadow-md shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Flame className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider font-mono text-white dark:text-white light:text-slate-900 leading-tight">
              BCS <span className="text-cyan-400">FLEET</span>
            </h1>
            <p className="text-[9px] text-slate-400 font-semibold tracking-wider">SUPERVISION TÉLÉMATIQUE</p>
          </div>
        </div>

        {/* Dynamic Mode Badge */}
        <div className="hidden sm:flex items-center space-x-2 pl-2">
          {isDemoMode ? (
            <span
              onClick={() => toggleDemoMode(false)}
              className="cursor-pointer flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all"
              title="Cliquer pour basculer en MODE LIVE"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>● MODE DEMO</span>
              <span className="text-[9px] text-amber-300/80">(Simulateur Dakar)</span>
            </span>
          ) : (
            <span
              onClick={() => toggleDemoMode(true)}
              className="cursor-pointer flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
              title="Cliquer pour repasser en MODE DEMO"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>● MODE LIVE</span>
            </span>
          )}
        </div>

        {/* Server Status Indicator */}
        <div className="hidden md:flex items-center space-x-1.5 text-[11px] font-mono text-slate-400 pl-2 border-l border-slate-800">
          <span className="text-slate-500">Traccar:</span>
          {traccarConnected ? (
            <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 inline" />
              <span>CONNECTED</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span>STANDBY (DEMO)</span>
            </span>
          )}
        </div>
      </div>

      {/* Global Instant Search Bar */}
      <div ref={searchRef} className="relative flex-1 max-w-md mx-4 hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="🔍 Rechercher un véhicule, une plaque, un chauffeur, IMEI ou adresse..."
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            className="w-full pl-9 pr-8 py-2 bg-slate-950/80 dark:bg-slate-950/80 light:bg-slate-100 border border-slate-800 dark:border-slate-800 light:border-slate-300 rounded-xl text-xs text-white dark:text-white light:text-slate-900 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && searchResults.length > 0 && (
          <div className="absolute top-11 left-0 right-0 bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-300 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-800 max-h-80 overflow-y-auto">
            {searchResults.map((v) => (
              <div
                key={v.id}
                onClick={() => {
                  onVehicleSelect(v);
                  setIsSearchOpen(false);
                }}
                className="p-3 hover:bg-slate-800/80 dark:hover:bg-slate-800/80 light:hover:bg-slate-100 cursor-pointer transition-colors flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-slate-950 text-cyan-400 border border-slate-800">
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white dark:text-white light:text-slate-900">
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

      {/* Right Tools: Role Switcher, Theme Toggle, Profile */}
      <div className="flex items-center space-x-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
          title={theme === 'dark' ? 'Passer en Mode Light' : 'Passer en Mode Dark'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* User Profile */}
        <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-800">
          <img
            src={
              user?.avatar_url ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
            }
            alt={user?.full_name}
            className="w-8 h-8 rounded-full border border-slate-700 object-cover ring-2 ring-cyan-500/20"
          />
          <div className="hidden md:block text-left">
            <div className="text-xs font-bold text-white dark:text-white light:text-slate-900 truncate max-w-[130px]">
              {user?.full_name}
            </div>
            <div className="text-[10px] font-mono text-cyan-400 font-semibold">{role}</div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
