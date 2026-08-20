import React, { useState, useEffect } from 'react';
import { useFleet } from '../contexts/FleetContext';
import { useAuth } from '../contexts/AuthContext';
import { useTraccar } from '../contexts/TraccarContext';
import { Vehicle, VehicleType, TraccarDevice } from '../types';
import { traccarApi } from '../services/traccar/traccarApi';
import {
  Car,
  Plus,
  Search,
  Edit,
  Trash2,
  Radio,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  Eye,
  History,
  LayoutGrid,
  List,
  Battery,
  Zap,
  Clock,
  ShieldCheck,
  Power,
  SlidersHorizontal,
  ChevronRight,
  Info,
} from 'lucide-react';

interface VehiclesPageProps {
  onNavigateTab: (tabId: string, vehicleId?: string) => void;
  onOpenImmobilizer: (vehicle: Vehicle) => void;
}

export const VehiclesPage: React.FC<VehiclesPageProps> = ({
  onNavigateTab,
  onOpenImmobilizer,
}) => {
  const { vehicles, drivers, addVehicle, updateVehicle, deleteVehicle } = useFleet();
  const { role } = useAuth();
  const { traccarConnected } = useTraccar();

  // Layout View Mode & Selection
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('TABLE');
  const [selectedDetailVehicle, setSelectedDetailVehicle] = useState<Vehicle | null>(null);

  // Unassociated Traccar Devices
  const [traccarLiveDevices, setTraccarLiveDevices] = useState<TraccarDevice[]>([]);
  const [isLoadingTraccarDevices, setIsLoadingTraccarDevices] = useState<boolean>(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [driverFilter, setDriverFilter] = useState<string>('ALL');

  // Modals State
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formPlate, setFormPlate] = useState('');
  const [formBrand, setFormBrand] = useState('Toyota');
  const [formModel, setFormModel] = useState('');
  const [formYear, setFormYear] = useState(2024);
  const [formColor, setFormColor] = useState('Blanc');
  const [formVin, setFormVin] = useState('');
  const [formType, setFormType] = useState<VehicleType>('PICKUP');
  const [formGroup, setFormGroup] = useState('LIVRAISON');
  const [formDriverId, setFormDriverId] = useState('');
  const [formTraccarId, setFormTraccarId] = useState<string>('');
  const [formImei, setFormImei] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formOdometer, setFormOdometer] = useState(0);

  const isAdminOrManager = role === 'ADMIN' || role === 'MANAGER';

  // Fetch Traccar devices for picker & unassociated devices banner
  const fetchLiveTraccarDevices = async () => {
    setIsLoadingTraccarDevices(true);
    try {
      const liveDevs = await traccarApi.getDevices();
      if (liveDevs) {
        setTraccarLiveDevices(liveDevs);
      }
    } catch (err) {
      console.warn('Notice: Traccar devices fetch:', err);
    } finally {
      setIsLoadingTraccarDevices(false);
    }
  };

  useEffect(() => {
    fetchLiveTraccarDevices();
  }, [traccarConnected]);

  // Compute Unassociated Traccar Devices
  const unassociatedDevices = traccarLiveDevices.filter((tDev) => {
    return !vehicles.some(
      (v) =>
        v.traccar_id === tDev.id ||
        v.device_id === tDev.id.toString() ||
        v.device_imei === tDev.uniqueId ||
        v.plate_number === tDev.uniqueId
    );
  });

  // Filtered Vehicles List
  const activeVehicles = vehicles.filter((v) => v.active !== false);

  const filteredVehicles = activeVehicles.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.plate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.device_imei && v.device_imei.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (v.driver_name && v.driver_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'MOVING' && v.status === 'MOVING') ||
      (statusFilter === 'STOPPED' && v.status === 'STOPPED') ||
      (statusFilter === 'OFFLINE' && v.comm_status === 'OFFLINE') ||
      (statusFilter === 'ONLINE' && v.comm_status === 'ONLINE') ||
      (statusFilter === 'NO_DEVICE' && (!v.device_imei || v.device_imei === 'Non associé'));

    const matchesType = typeFilter === 'ALL' || v.vehicle_type === typeFilter;
    const matchesGroup = groupFilter === 'ALL' || v.group_name === groupFilter;

    const matchesDriver =
      driverFilter === 'ALL' ||
      (driverFilter === 'ASSIGNED' && v.driver_id) ||
      (driverFilter === 'UNASSIGNED' && !v.driver_id);

    return matchesSearch && matchesStatus && matchesType && matchesGroup && matchesDriver;
  });

  // KPI Calculations
  const kpiTotal = activeVehicles.length;
  const kpiOnline = activeVehicles.filter((v) => v.comm_status === 'ONLINE').length;
  const kpiMoving = activeVehicles.filter((v) => v.status === 'MOVING').length;
  const kpiStopped = activeVehicles.filter((v) => v.status === 'STOPPED').length;
  const kpiOffline = activeVehicles.filter((v) => v.comm_status === 'OFFLINE').length;

  // Open Modal for Creation
  const openCreateModalWithDevice = (tDev?: TraccarDevice) => {
    setEditingVehicle(null);
    setFormName(tDev ? tDev.name : '');
    setFormPlate(tDev ? tDev.uniqueId : '');
    setFormBrand('Toyota');
    setFormModel('');
    setFormYear(2024);
    setFormColor('Blanc');
    setFormVin('');
    setFormType('PICKUP');
    setFormGroup('LIVRAISON');
    setFormDriverId('');
    setFormTraccarId(tDev ? tDev.id.toString() : '');
    setFormImei(tDev ? tDev.uniqueId : '');
    setFormNotes(tDev ? `Traceur Traccar ID ${tDev.id} (${tDev.uniqueId})` : '');
    setFormOdometer(0);
    setIsVehicleModalOpen(true);
  };

  // Open Modal for Edit
  const openEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormName(v.name);
    setFormPlate(v.plate_number);
    setFormBrand(v.brand);
    setFormModel(v.model);
    setFormYear(v.year);
    setFormColor(v.color);
    setFormVin(v.vin || '');
    setFormType(v.vehicle_type);
    setFormGroup(v.group_name || 'LIVRAISON');
    setFormDriverId(v.driver_id || '');
    setFormTraccarId(v.traccar_id ? v.traccar_id.toString() : '');
    setFormImei(v.device_imei || '');
    setFormNotes(v.notes || '');
    setFormOdometer(v.odometer_km);
    setIsVehicleModalOpen(true);
  };

  // Save Vehicle Handler
  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedDriver = drivers.find((d) => d.id === formDriverId);
    const selectedTraccarDev = traccarLiveDevices.find((d) => d.id.toString() === formTraccarId);

    const vehicleData: Partial<Vehicle> = {
      name: formName,
      plate_number: formPlate,
      brand: formBrand,
      model: formModel,
      year: Number(formYear),
      color: formColor,
      vin: formVin,
      group_name: formGroup,
      vehicle_type: formType,
      driver_id: formDriverId || null,
      driver_name: assignedDriver ? `${assignedDriver.first_name} ${assignedDriver.last_name}` : 'Non assigné',
      driver_phone: assignedDriver?.phone,
      device_id: formTraccarId || null,
      device_imei: formImei || selectedTraccarDev?.uniqueId || 'Non associé',
      traccar_id: formTraccarId ? Number(formTraccarId) : undefined,
      traccar_unique_id: formImei || selectedTraccarDev?.uniqueId,
      odometer_km: Number(formOdometer),
      notes: formNotes,
      active: true,
    };

    if (editingVehicle) {
      updateVehicle(editingVehicle.id, vehicleData);
    } else {
      addVehicle(vehicleData);
    }

    setIsVehicleModalOpen(false);
    fetchLiveTraccarDevices();
  };

  // Soft Delete Handler (Désactivation logique)
  const handleSoftDeleteVehicle = (v: Vehicle) => {
    if (confirm(`Voulez-vous désactiver le véhicule ${v.name} (${v.plate_number}) ?\nL'historique et les liaisons GPS seront conservés.`)) {
      updateVehicle(v.id, { active: false });
      if (selectedDetailVehicle?.id === v.id) {
        setSelectedDetailVehicle(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white font-mono flex items-center gap-2">
            <Car className="w-6 h-6 text-cyan-400" />
            GESTION DU PARC AUTOMOBILE &amp; TÉLÉMATIQUE
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Données métier BCS Fleet synchronisées en temps réel avec le serveur Traccar 6.5.
          </p>
        </div>

        {isAdminOrManager && (
          <button
            onClick={() => openCreateModalWithDevice()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg flex items-center space-x-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>AJOUTER UN VÉHICULE</span>
          </button>
        )}
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Flotte</div>
          <div className="text-xl font-black text-white font-mono mt-1">{kpiTotal} <span className="text-xs text-slate-500 font-normal">véhicules</span></div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">En Ligne</div>
          <div className="text-xl font-black text-emerald-400 font-mono mt-1">{kpiOnline}</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">En Mouvement</div>
          <div className="text-xl font-black text-cyan-400 font-mono mt-1">{kpiMoving}</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">À l'arrêt</div>
          <div className="text-xl font-black text-amber-400 font-mono mt-1">{kpiStopped}</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Hors Ligne</div>
          <div className="text-xl font-black text-slate-400 font-mono mt-1">{kpiOffline}</div>
        </div>
      </div>

      {/* Banner for Unassociated Traccar Devices in Production */}
      {unassociatedDevices.length > 0 && (
        <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs font-mono">
              <Radio className="w-4 h-4 animate-pulse" />
              <span>TRACEURS TRACCAR DÉTECTÉS NON ASSOCIÉS ({unassociatedDevices.length})</span>
            </div>
            <span className="text-[10px] text-slate-400">Cliquez pour associer directement à une fiche véhicule</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {unassociatedDevices.map((tDev) => (
              <div
                key={tDev.id}
                className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/20 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span className={tDev.status === 'online' ? 'text-emerald-400' : 'text-slate-500'}>●</span>
                    {tDev.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">IMEI: {tDev.uniqueId} | ID: {tDev.id}</div>
                </div>

                {isAdminOrManager && (
                  <button
                    onClick={() => openCreateModalWithDevice(tDev)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] border border-amber-500/40 transition-all flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Associer
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters Controls */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search Field */}
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Recherche (Nom, Plaque, IMEI, Chauffeur)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="ONLINE">🟢 En Ligne</option>
            <option value="MOVING">⚡ En Mouvement</option>
            <option value="STOPPED">🟠 À l'arrêt</option>
            <option value="OFFLINE">⚫ Hors Ligne</option>
            <option value="NO_DEVICE">⚠️ Sans Traceur</option>
          </select>

          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500"
          >
            <option value="ALL">Tous les groupes</option>
            <option value="DIRECTION">DIRECTION</option>
            <option value="LIVRAISON">LIVRAISON</option>
            <option value="TECHNIQUE">TECHNIQUE</option>
            <option value="FLOTTE LIVE">FLOTTE LIVE</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-cyan-500"
          >
            <option value="ALL">Tous les types</option>
            <option value="PICKUP">Pick-up</option>
            <option value="VAN">Fourgon</option>
            <option value="TRUCK">Camion</option>
            <option value="SEDAN">Berline</option>
          </select>

          {/* View Switcher Buttons */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'TABLE' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
              title="Vue Tableau"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('GRID')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'GRID' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
              title="Vue Cartes"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Table or Grid View */}
      {viewMode === 'TABLE' ? (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                <tr>
                  <th className="p-4">Véhicule Métier</th>
                  <th className="p-4">Plaque</th>
                  <th className="p-4">Marque / Modèle</th>
                  <th className="p-4">Chauffeur</th>
                  <th className="p-4">Traceur Traccar (IMEI)</th>
                  <th className="p-4">Statut Télématique</th>
                  <th className="p-4">Dernier Signal</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredVehicles.map((v) => {
                  const statusBadge =
                    v.status === 'MOVING' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        🟢 En mouvement ({v.current_speed} km/h)
                      </span>
                    ) : v.status === 'STOPPED' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        🟠 À l'arrêt
                      </span>
                    ) : v.status === 'ALERT' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        🔴 Alerte ({v.current_speed} km/h)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        ⚫ Hors ligne
                      </span>
                    );

                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedDetailVehicle(v)}
                    >
                      <td className="p-4 font-bold text-white">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 shrink-0">
                            <Car className="w-4 h-4" />
                          </div>
                          <div>
                            <div>{v.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{v.group_name || 'GROUPE GENERAL'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono font-bold text-cyan-400">{v.plate_number}</td>
                      <td className="p-4 text-slate-200">{v.brand} {v.model} ({v.year})</td>
                      <td className="p-4 text-slate-300">{v.driver_name || 'Non assigné'}</td>
                      <td className="p-4 font-mono">
                        {v.device_imei && v.device_imei !== 'Non associé' ? (
                          <span className="text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 text-[11px]">
                            {v.device_imei}
                          </span>
                        ) : (
                          <span className="text-amber-400 text-[10px]">Non associé</span>
                        )}
                      </td>
                      <td className="p-4">{statusBadge}</td>
                      <td className="p-4 text-slate-400 text-[11px] font-mono">
                        {new Date(v.last_position_time).toLocaleTimeString()}
                      </td>
                      <td className="p-4 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedDetailVehicle(v)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                          title="Fiche détaillée 360°"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onNavigateTab('tracking', v.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400"
                          title="Voir sur la carte"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdminOrManager && (
                          <button
                            onClick={() => openEditModal(v)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onOpenImmobilizer(v)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          title="Immobiliser le moteur"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                        {isAdminOrManager && (
                          <button
                            onClick={() => handleSoftDeleteVehicle(v)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                            title="Désactiver"
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((v) => (
            <div
              key={v.id}
              onClick={() => setSelectedDetailVehicle(v)}
              className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer space-y-4 shadow-xl"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{v.name}</h3>
                    <p className="text-xs text-slate-400">{v.brand} {v.model} ({v.year})</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                  {v.plate_number}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80 font-mono">
                <div>
                  <span className="text-slate-500 text-[10px] block">Vitesse</span>
                  <span className="text-white font-bold">{v.current_speed} km/h</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Chauffeur</span>
                  <span className="text-slate-300 truncate block">{v.driver_name || 'Non assigné'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">IMEI Traceur</span>
                  <span className="text-cyan-400 text-[11px]">{v.device_imei || 'Non associé'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Batterie GPS</span>
                  <span className="text-emerald-400">{v.battery_level !== null && v.battery_level !== undefined ? `${v.battery_level}%` : 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs">
                <span className={v.comm_status === 'ONLINE' ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {v.comm_status === 'ONLINE' ? '● En ligne' : '● Hors ligne'}
                </span>
                <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onNavigateTab('tracking', v.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Voir sur la carte"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onNavigateTab('history', v.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Replay Historique"
                  >
                    <History className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 360° Vehicle Details Sheet Drawer / Modal */}
      {selectedDetailVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSelectedDetailVehicle(null)} />
          <div className="relative w-full max-w-lg h-full max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 z-10 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white font-mono">{selectedDetailVehicle.name}</h3>
                <p className="text-xs text-cyan-400 font-mono font-bold">{selectedDetailVehicle.plate_number}</p>
              </div>
              <button onClick={() => setSelectedDetailVehicle(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section 1: Identité Métier */}
            <div className="space-y-2 glass-panel p-4 rounded-xl border border-slate-800 text-xs">
              <h4 className="text-slate-400 font-mono uppercase font-bold text-[10px] text-cyan-400">1. Identité Métier BCS Fleet</h4>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div><span className="text-slate-500 block">Marque / Modèle:</span> {selectedDetailVehicle.brand} {selectedDetailVehicle.model}</div>
                <div><span className="text-slate-500 block">Année &amp; Couleur:</span> {selectedDetailVehicle.year} ({selectedDetailVehicle.color})</div>
                <div><span className="text-slate-500 block">Groupe Affecté:</span> {selectedDetailVehicle.group_name || 'GÉNÉRAL'}</div>
                <div><span className="text-slate-500 block">Numéro VIN:</span> <span className="font-mono text-slate-200">{selectedDetailVehicle.vin || 'Non renseigné'}</span></div>
              </div>
            </div>

            {/* Section 2: Chauffeur */}
            <div className="space-y-2 glass-panel p-4 rounded-xl border border-slate-800 text-xs">
              <h4 className="text-slate-400 font-mono uppercase font-bold text-[10px] text-emerald-400">2. Chauffeur Assigné</h4>
              <div className="text-white font-bold text-sm">{selectedDetailVehicle.driver_name || 'Aucun chauffeur assigné'}</div>
              {selectedDetailVehicle.driver_phone && (
                <div className="text-slate-400">Téléphone: <span className="font-mono text-cyan-300">{selectedDetailVehicle.driver_phone}</span></div>
              )}
            </div>

            {/* Section 3: Liaison Traccar */}
            <div className="space-y-2 glass-panel p-4 rounded-xl border border-slate-800 text-xs">
              <h4 className="text-slate-400 font-mono uppercase font-bold text-[10px] text-amber-400">3. Boîtier &amp; Serveur Traccar 6.5</h4>
              <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono">
                <div><span className="text-slate-500 block">Traccar Device ID:</span> {selectedDetailVehicle.traccar_id || selectedDetailVehicle.device_id || 'N/A'}</div>
                <div><span className="text-slate-500 block">Code IMEI / UniqueID:</span> {selectedDetailVehicle.device_imei || 'Non associé'}</div>
                <div><span className="text-slate-500 block">Statut Serveur:</span> <span className={selectedDetailVehicle.comm_status === 'ONLINE' ? 'text-emerald-400' : 'text-slate-500'}>{selectedDetailVehicle.comm_status}</span></div>
                <div><span className="text-slate-500 block">Dernier Signal:</span> {new Date(selectedDetailVehicle.last_position_time).toLocaleTimeString()}</div>
              </div>
            </div>

            {/* Section 4: Télémétrie & Capteurs */}
            <div className="space-y-2 glass-panel p-4 rounded-xl border border-slate-800 text-xs">
              <h4 className="text-slate-400 font-mono uppercase font-bold text-[10px] text-purple-400">4. Télémétrie &amp; Capteurs GPS</h4>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div><span className="text-slate-500 block">Vitesse Instantanée:</span> <span className="text-white font-bold">{selectedDetailVehicle.current_speed} km/h</span></div>
                <div><span className="text-slate-500 block">Cap / Orient. (°):</span> <span className="text-white font-bold">{selectedDetailVehicle.current_heading}°</span></div>
                <div><span className="text-slate-500 block">Odomètre Télématique:</span> <span className="text-cyan-400 font-bold">{selectedDetailVehicle.odometer_km ? `${selectedDetailVehicle.odometer_km.toLocaleString()} km` : 'Indisponible'}</span></div>
                <div><span className="text-slate-500 block">Niveau Batterie:</span> <span className="text-emerald-400">{selectedDetailVehicle.battery_level !== null && selectedDetailVehicle.battery_level !== undefined ? `${selectedDetailVehicle.battery_level}%` : 'Non disponible'}</span></div>
              </div>
            </div>

            {/* Section 5: Maintenance & Documents */}
            <div className="space-y-3 glass-panel p-4 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-mono uppercase font-bold text-[10px] text-amber-400">5. Maintenance &amp; Échéances</h4>
                <button
                  onClick={() => {
                    const id = selectedDetailVehicle.id;
                    setSelectedDetailVehicle(null);
                    onNavigateTab('maintenance', id);
                  }}
                  className="text-amber-400 hover:text-amber-300 font-bold text-[11px] underline"
                >
                  Ouvrir Module Maintenance →
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] block">Odomètre Réel:</span>
                  <span className="font-mono font-bold text-white">
                    {selectedDetailVehicle.odometer_km ? `${selectedDetailVehicle.odometer_km.toLocaleString()} km` : 'Non disponible'}
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] block">Visite Technique:</span>
                  <span className="font-mono font-bold text-emerald-400">Valide (CTTD)</span>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  const id = selectedDetailVehicle.id;
                  setSelectedDetailVehicle(null);
                  onNavigateTab('tracking', id);
                }}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>VOIR SUR LA CARTE (LIVE TRACKING)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const id = selectedDetailVehicle.id;
                    setSelectedDetailVehicle(null);
                    onNavigateTab('history', id);
                  }}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center space-x-1"
                >
                  <History className="w-4 h-4" />
                  <span>Historique</span>
                </button>

                <button
                  onClick={() => {
                    const v = selectedDetailVehicle;
                    setSelectedDetailVehicle(null);
                    openEditModal(v);
                  }}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center space-x-1"
                >
                  <Edit className="w-4 h-4" />
                  <span>Modifier</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Add / Edit Modal with Live Traccar Device Picker */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsVehicleModalOpen(false)} />
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-mono">
                {editingVehicle ? 'MODIFIER LA FICHE VÉHICULE' : 'AJOUTER UN VÉHICULE À LA FLOTTE'}
              </h3>
              <button onClick={() => setIsVehicleModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Nom du Véhicule *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Toyota Hilux #1"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Plaque d'immatriculation *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: DK-1234-AB"
                    value={formPlate}
                    onChange={(e) => setFormPlate(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Marque *</label>
                  <input
                    type="text"
                    required
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Modèle *</label>
                  <input
                    type="text"
                    required
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Année</label>
                  <input
                    type="number"
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Traccar Live Device Picker */}
              <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-2">
                <label className="block text-cyan-400 font-mono font-bold text-[11px] flex items-center justify-between">
                  <span>SÉLECTION DU TRACEUR TRACCAR 6.5 *</span>
                  <span className="text-[10px] text-emerald-400">● En direct du serveur</span>
                </label>

                {traccarLiveDevices.length > 0 ? (
                  <select
                    value={formTraccarId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setFormTraccarId(selId);
                      const matchDev = traccarLiveDevices.find((d) => d.id.toString() === selId);
                      if (matchDev) {
                        setFormImei(matchDev.uniqueId);
                      }
                    }}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:border-cyan-500 text-xs"
                  >
                    <option value="">-- Aucun traceur Traccar associé --</option>
                    {traccarLiveDevices.map((tDev) => (
                      <option key={tDev.id} value={tDev.id}>
                        {tDev.name} — IMEI: {tDev.uniqueId} (ID: {tDev.id}) [{tDev.status === 'online' ? '🟢 En ligne' : '⚫ Hors ligne'}]
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Code IMEI ou ID Traccar..."
                    value={formImei}
                    onChange={(e) => setFormImei(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:border-cyan-500"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Groupe Affecté</label>
                  <select
                    value={formGroup}
                    onChange={(e) => setFormGroup(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="DIRECTION">DIRECTION</option>
                    <option value="LIVRAISON">LIVRAISON</option>
                    <option value="TECHNIQUE">TECHNIQUE</option>
                    <option value="FLOTTE LIVE">FLOTTE LIVE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Chauffeur Assigné</label>
                  <select
                    value={formDriverId}
                    onChange={(e) => setFormDriverId(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Aucun chauffeur assigné</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.first_name} {d.last_name} ({d.phone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                >
                  {editingVehicle ? 'Mettre à jour' : 'Créer le véhicule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
