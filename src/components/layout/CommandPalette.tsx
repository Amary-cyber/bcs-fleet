import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFleet } from '../../contexts/FleetContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTraccar } from '../../contexts/TraccarContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Vehicle, UserRole } from '../../types';
import {
  Search,
  LayoutDashboard,
  MapPin,
  Car,
  Users,
  CircleDot,
  BellRing,
  Wrench,
  Wallet,
  History,
  FileSpreadsheet,
  Radio,
  SlidersHorizontal,
  UserCheck,
  ClipboardList,
  Settings,
  Download,
  Moon,
  Sun,
  Shield,
  Zap,
  Flame,
  ArrowRight,
  Command,
  CornerDownLeft,
  Key,
  RefreshCw,
  Compass
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tabId: string, vehicleId?: string) => void;
  onOpenImmobilizer?: (v: Vehicle) => void;
  onOpenShortcutsModal?: () => void;
  onOpenInstallModal?: () => void;
}

interface PaletteItem {
  id: string;
  category: 'Navigation' | 'Véhicules' | 'Actions Rapides' | 'Système';
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  shortcut?: string;
  badge?: string;
  badgeColor?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenImmobilizer,
  onOpenShortcutsModal,
  onOpenInstallModal,
}) => {
  const { vehicles, alerts, maintenanceRecords } = useFleet();
  const { role, switchRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { traccarConnected, reconnect } = useTraccar();
  const { setDrawerOpen } = useNotifications();

  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Build searchable items
  const items: PaletteItem[] = useMemo(() => {
    const list: PaletteItem[] = [];

    // Navigation Items
    const navs = [
      { id: 'dashboard', title: 'Tableau de Bord Principal', icon: LayoutDashboard, shortcut: '⌘1' },
      { id: 'tracking', title: 'Live Tracking GPS en Direct', icon: MapPin, shortcut: '⌘2' },
      { id: 'vehicles', title: 'Flotte & Gestion des Véhicules', icon: Car, shortcut: '⌘3' },
      { id: 'drivers', title: 'Gestion des Chauffeurs', icon: Users, shortcut: '⌘4' },
      { id: 'history', title: 'Historique des Trajets & Replay', icon: History, shortcut: '⌘5' },
      { id: 'alerts', title: 'Centre d\'Alertes & Sécurité', icon: BellRing, shortcut: '⌘6' },
      { id: 'maintenance', title: 'Maintenance & Calendriers', icon: Wrench, shortcut: '⌘7' },
      { id: 'expenses', title: 'Dépenses & Analyse TCO', icon: Wallet, shortcut: '⌘8' },
      { id: 'reports', title: 'Rapports & Statistiques', icon: FileSpreadsheet, shortcut: '⌘9' },
      { id: 'geofences', title: 'Géofences & Zones Virtuelles', icon: CircleDot },
      { id: 'devices', title: 'Traceurs & Balises GPS IMEI', icon: Radio },
      { id: 'alert-rules', title: 'Règles de Détection & Seuils', icon: SlidersHorizontal },
      { id: 'users', title: 'Gestion des Utilisateurs & Rôles', icon: UserCheck },
      { id: 'audit', title: 'Journal d\'Audit & Activité', icon: ClipboardList },
      { id: 'settings', title: 'Paramètres & Configuration Flotte', icon: Settings },
    ];

    navs.forEach((nav) => {
      list.push({
        id: `nav-${nav.id}`,
        category: 'Navigation',
        title: nav.title,
        icon: nav.icon,
        shortcut: nav.shortcut,
        action: () => {
          onNavigateTab(nav.id);
          onClose();
        },
      });
    });

    // Quick Actions
    list.push({
      id: 'action-install-pwa',
      category: 'Actions Rapides',
      title: 'Installer l\'Application PWA sur Mac (Dock & Apps)',
      subtitle: 'Accès plein écran indépendant, performances natives',
      icon: Download,
      shortcut: '⌘I',
      badge: 'Mac & Mobile',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
      action: () => {
        onClose();
        if (onOpenInstallModal) onOpenInstallModal();
        else window.dispatchEvent(new CustomEvent('open-pwa-install-modal'));
      },
    });

    list.push({
      id: 'action-shortcuts-help',
      category: 'Actions Rapides',
      title: 'Afficher les Raccourcis Clavier macOS',
      subtitle: 'Guide complet des raccourcis Mac pour BCS Fleet',
      icon: Key,
      shortcut: '⌘/',
      action: () => {
        onClose();
        if (onOpenShortcutsModal) onOpenShortcutsModal();
      },
    });

    list.push({
      id: 'action-open-notifications',
      category: 'Actions Rapides',
      title: 'Ouvrir le Centre de Notifications',
      subtitle: `${alerts.filter((a) => !a.is_read).length} alerte(s) non lue(s)`,
      icon: BellRing,
      shortcut: '⌘N',
      action: () => {
        onClose();
        setDrawerOpen(true);
      },
    });

    list.push({
      id: 'action-toggle-theme',
      category: 'Actions Rapides',
      title: theme === 'dark' ? 'Passer en Mode Clair' : 'Passer en Mode Sombre (Télématique)',
      subtitle: `Thème actuel: ${theme === 'dark' ? 'Sombre' : 'Clair'}`,
      icon: theme === 'dark' ? Sun : Moon,
      action: () => {
        toggleTheme();
        onClose();
      },
    });

    list.push({
      id: 'action-reconnect-traccar',
      category: 'Actions Rapides',
      title: 'Forcer la Reconnexion Télématique Traccar 6.5',
      subtitle: traccarConnected ? 'Connecté (Streaming actif)' : 'Hors-ligne (Cliquer pour relancer)',
      icon: RefreshCw,
      action: () => {
        reconnect();
        onClose();
      },
    });

    // Vehicles list for instant telematics search
    vehicles.forEach((v) => {
      const isMoving = v.status === 'MOVING';
      list.push({
        id: `veh-${v.id}`,
        category: 'Véhicules',
        title: `${v.name} (${v.plate_number})`,
        subtitle: `${v.brand} ${v.model} • Chauffeur: ${v.driver_name || 'Non assigné'} • ${v.current_speed} km/h`,
        icon: Car,
        badge: isMoving ? 'En Mouvement' : v.status === 'STOPPED' ? 'À l\'arrêt' : 'Hors-ligne',
        badgeColor: isMoving
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
          : v.status === 'STOPPED'
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          : 'bg-slate-800 text-slate-400 border border-slate-700',
        action: () => {
          onNavigateTab('tracking', v.id);
          onClose();
        },
      });
    });

    return list;
  }, [
    vehicles,
    alerts,
    theme,
    traccarConnected,
    role,
    onNavigateTab,
    onClose,
    onOpenInstallModal,
    onOpenShortcutsModal,
    setDrawerOpen,
    toggleTheme,
    reconnect,
  ]);

  // Filter items based on user search input
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const query = search.toLowerCase().trim();
    return items.filter((item) => {
      return (
        item.title.toLowerCase().includes(query) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(query)) ||
        item.category.toLowerCase().includes(query) ||
        (item.shortcut && item.shortcut.toLowerCase().includes(query))
      );
    });
  }, [items, search]);

  // Handle keyboard navigation inside palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Auto-scroll to selected element
  useEffect(() => {
    if (listRef.current) {
      const selectedElem = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElem) {
        selectedElem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 animate-fadeIn">
      {/* Backdrop click */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Spotlight Window Card */}
      <div className="relative w-full max-w-2xl bg-slate-900/95 text-slate-100 rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden z-10 animate-slideUp flex flex-col max-h-[80vh] backdrop-blur-2xl ring-1 ring-cyan-500/20">
        
        {/* Mac Window Header / Titlebar bar */}
        <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block border border-rose-600"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block border border-amber-600"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block border border-emerald-600"></span>
            <span className="ml-2 text-[11px] font-mono font-bold text-slate-400">BCS Spotlight Command (macOS)</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
            <span className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">ESC</span>
            <span>pour fermer</span>
          </div>
        </div>

        {/* Search Input Box */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-950/40">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Tapez une commande, cherchez un véhicule, une page ou une action..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent pl-3 pr-8 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none font-medium"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
            >
              Effacer
            </button>
          )}
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 divide-y divide-slate-800/40 scrollbar-thin">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Compass className="w-8 h-8 mx-auto text-slate-600 animate-spin" />
              <p className="text-xs font-semibold">Aucun résultat trouvé pour "{search}"</p>
              <p className="text-[11px] text-slate-600">Essayez avec un nom de véhicule, une plaque ou une page</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-500/20 via-teal-500/10 to-transparent border border-cyan-500/40 text-white shadow-md'
                      : 'hover:bg-slate-800/50 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/30'
                          : 'bg-slate-950 text-cyan-400 border-slate-800 group-hover:border-slate-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate">{item.title}</span>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                              item.badgeColor || 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {item.shortcut ? (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-950 text-cyan-300 border border-slate-800 shadow-inner">
                        {item.shortcut}
                      </span>
                    ) : (
                      isSelected && (
                        <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                          <span>Ouvrir</span>
                          <CornerDownLeft className="w-3 h-3" />
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Palette Footer Help Bar */}
        <div className="px-4 py-2.5 bg-slate-950/90 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-mono select-none">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">↓</kbd>
              <span>pour naviguer</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">↵</kbd>
              <span>pour exécuter</span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-cyan-400">
            <Flame className="w-3.5 h-3.5 text-cyan-400" />
            <span>BCS Fleet Mac Pro Edition</span>
          </div>
        </div>
      </div>
    </div>
  );
};
