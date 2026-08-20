import React, { useState } from 'react';
import { Vehicle } from '../../types';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Folder,
  User,
  Compass,
  Radio,
  Clock,
  Car,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface FleetListPanelProps {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onVehicleSelect: (vehicle: Vehicle) => void;
  onOpenAdvancedFilters: () => void;
}

export const FleetListPanel: React.FC<FleetListPanelProps> = ({
  vehicles,
  selectedVehicleId,
  onVehicleSelect,
  onOpenAdvancedFilters,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusTab, setActiveStatusTab] = useState<string>('ALL');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    DIRECTION: true,
    LIVRAISON: true,
    TECHNIQUE: true,
    'Non Groupé': true,
  });

  // Calculate Status Counts strictly from active vehicle list
  const totalCount = vehicles.length;
  const movingCount = vehicles.filter((v) => v.status === 'MOVING').length;
  const stoppedCount = vehicles.filter((v) => v.status === 'STOPPED').length;
  const offlineCount = vehicles.filter((v) => v.status === 'OFFLINE' || v.comm_status === 'OFFLINE').length;
  const alertCount = vehicles.filter((v) => v.status === 'ALERT').length;

  // Filter vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      v.name.toLowerCase().includes(query) ||
      v.plate_number.toLowerCase().includes(query) ||
      (v.driver_name && v.driver_name.toLowerCase().includes(query));

    const matchesStatus =
      activeStatusTab === 'ALL' ||
      (activeStatusTab === 'MOVING' && v.status === 'MOVING') ||
      (activeStatusTab === 'STOPPED' && v.status === 'STOPPED') ||
      (activeStatusTab === 'OFFLINE' && (v.status === 'OFFLINE' || v.comm_status === 'OFFLINE')) ||
      (activeStatusTab === 'ALERT' && v.status === 'ALERT');

    return matchesSearch && matchesStatus;
  });

  // Group vehicles by group_name
  const groupedVehicles: Record<string, Vehicle[]> = {};
  filteredVehicles.forEach((v) => {
    const grp = v.group_name || 'Non Groupé';
    if (!groupedVehicles[grp]) groupedVehicles[grp] = [];
    groupedVehicles[grp].push(v);
  });

  const toggleGroup = (grp: string) => {
    setExpandedGroups((prev) => ({ ...prev, [grp]: !prev[grp] }));
  };

  const getCompassArrow = (heading: number) => {
    return (
      <span
        className="inline-block transition-transform duration-300 font-bold"
        style={{ transform: `rotate(${heading}deg)` }}
      >
        ↑
      </span>
    );
  };

  const getStatusBadge = (v: Vehicle) => {
    if (v.status === 'ALERT') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-rose-400 animate-bounce" />
          <span>🔴 ALERTE</span>
        </span>
      );
    }
    if (v.status === 'MOVING') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>🟢 EN MOUVEMENT</span>
        </span>
      );
    }
    if (v.status === 'STOPPED') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>🟠 ARRÊTÉ</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
        <Radio className="w-3 h-3 text-slate-500" />
        <span>⚫ HORS LIGNE</span>
      </span>
    );
  };

  return (
    <div className="w-full lg:w-80 glass-panel p-3.5 rounded-2xl border border-slate-800 flex flex-col shrink-0 h-full select-none shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Car className="w-4 h-4 text-cyan-400" />
            Flotte de Supervision
          </h2>
          <span className="text-[10px] text-slate-400 font-mono">
            {filteredVehicles.length} / {totalCount} véhicules affichés
          </span>
        </div>

        <button
          onClick={onOpenAdvancedFilters}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-colors"
          title="Filtres avancés"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Local Search Input */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Filtrer flotte, nom, plaque..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Status Counter Filter Tabs */}
      <div className="grid grid-cols-2 gap-1 mb-3 text-[10px] font-bold">
        <button
          onClick={() => setActiveStatusTab('ALL')}
          className={`px-2 py-1.5 rounded-lg transition-all flex items-center justify-between ${
            activeStatusTab === 'ALL'
              ? 'bg-cyan-500 text-slate-950 shadow-md'
              : 'bg-slate-800/60 text-slate-400 hover:text-white'
          }`}
        >
          <span>Tous</span>
          <span className="px-1.5 py-0.2 rounded bg-slate-900/40 text-[9px]">{totalCount}</span>
        </button>

        <button
          onClick={() => setActiveStatusTab('MOVING')}
          className={`px-2 py-1.5 rounded-lg transition-all flex items-center justify-between ${
            activeStatusTab === 'MOVING'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
          }`}
        >
          <span>🟢 Mouvement</span>
          <span className="px-1.5 py-0.2 rounded bg-slate-900/40 text-[9px]">{movingCount}</span>
        </button>

        <button
          onClick={() => setActiveStatusTab('STOPPED')}
          className={`px-2 py-1.5 rounded-lg transition-all flex items-center justify-between ${
            activeStatusTab === 'STOPPED'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
          }`}
        >
          <span>🟠 Arrêtés</span>
          <span className="px-1.5 py-0.2 rounded bg-slate-900/40 text-[9px]">{stoppedCount}</span>
        </button>

        <button
          onClick={() => setActiveStatusTab('OFFLINE')}
          className={`px-2 py-1.5 rounded-lg transition-all flex items-center justify-between ${
            activeStatusTab === 'OFFLINE'
              ? 'bg-slate-700 text-white shadow-md'
              : 'bg-slate-800/60 text-slate-400 hover:text-white'
          }`}
        >
          <span>⚫ Hors ligne</span>
          <span className="px-1.5 py-0.2 rounded bg-slate-900/40 text-[9px]">{offlineCount}</span>
        </button>

        <button
          onClick={() => setActiveStatusTab('ALERT')}
          className={`col-span-2 px-2 py-1.5 rounded-lg transition-all flex items-center justify-between ${
            activeStatusTab === 'ALERT'
              ? 'bg-rose-500 text-white shadow-md animate-pulse'
              : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
          }`}
        >
          <span>🔴 Alertes Actives</span>
          <span className="px-1.5 py-0.2 rounded bg-slate-900/40 text-[9px]">{alertCount}</span>
        </button>
      </div>

      {/* Grouped Vehicles Accordion List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {Object.keys(groupedVehicles).length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Aucun véhicule ne correspond au filtre.
          </div>
        ) : (
          Object.entries(groupedVehicles).map(([grpName, groupList]) => {
            const isExpanded = expandedGroups[grpName] ?? true;
            return (
              <div key={grpName} className="space-y-1.5">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(grpName)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <Folder className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-mono">{grpName}</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-400 font-mono">
                    {groupList.length}
                  </span>
                </button>

                {/* Group Vehicle Cards */}
                {isExpanded && (
                  <div className="space-y-2 pl-2">
                    {groupList.map((v) => {
                      const isSelected = v.id === selectedVehicleId;
                      const timeAgo = formatDistanceToNow(new Date(v.last_position_time), {
                        addSuffix: true,
                        locale: fr,
                      });

                      return (
                        <div
                          key={v.id}
                          onClick={() => onVehicleSelect(v)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-cyan-950/80 to-slate-900 border-cyan-500 shadow-lg shadow-cyan-950/50 scale-[1.01]'
                              : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-xs text-white truncate max-w-[140px]">
                              {v.name}
                            </span>
                            {getStatusBadge(v)}
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-cyan-400 font-bold">{v.plate_number}</span>
                            <span className="text-white font-bold flex items-center gap-1">
                              {v.current_speed} km/h {getCompassArrow(v.current_heading)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1 truncate max-w-[120px]">
                              <User className="w-3 h-3 text-slate-500" />
                              {v.driver_name || 'Non assigné'}
                            </span>
                            <span className="font-mono text-slate-500">{timeAgo}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
