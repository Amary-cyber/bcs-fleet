import React, { useState } from 'react';
import { useFleet } from '../contexts/FleetContext';
import { useAuth } from '../contexts/AuthContext';
import { Expense, ExpenseCategory } from '../types';
import {
  Wallet,
  Fuel,
  Wrench,
  Receipt,
  Car,
  TrendingUp,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  DollarSign,
  Trash2,
  Calendar,
  Layers,
  ArrowUpRight,
  Shield,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { exportToExcel, exportToPdf } from '../utils/exportEngine';

export const ExpensesPage: React.FC = () => {
  const { vehicles, drivers, expenses, tcoSummary, addExpense, deleteExpense } = useFleet();
  const { role } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Form state
  const [formVehId, setFormVehId] = useState(vehicles[0]?.id || '');
  const [formDrvId, setFormDrvId] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('CARBURANT');
  const [formAmount, setFormAmount] = useState<number>(50000);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formSupplier, setFormSupplier] = useState('Station TotalEnergies Hann');
  const [formLiters, setFormLiters] = useState<number | ''>(66.6);
  const [formPricePerLiter, setFormPricePerLiter] = useState<number | ''>(750);
  const [formOdometer, setFormOdometer] = useState<number | ''>('');
  const [formDescription, setFormDescription] = useState('Plein de gazole pour tournée Dakar');

  const isAdminOrManager = role === 'ADMIN' || role === 'MANAGER';

  // Category Color Map & Labels
  const categoryConfig: Record<
    ExpenseCategory,
    { label: string; color: string; bg: string; border: string; icon: React.ElementType }
  > = {
    CARBURANT: {
      label: 'Carburant',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      icon: Fuel,
    },
    MAINTENANCE: {
      label: 'Maintenance',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      icon: Wrench,
    },
    REPARATION: {
      label: 'Réparation',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      icon: Wrench,
    },
    PNEUS: {
      label: 'Pneus & Roues',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      icon: Tag,
    },
    PEAGE: {
      label: 'Péages & Autoroute',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      icon: Layers,
    },
    ASSURANCE: {
      label: 'Assurances',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      icon: Shield,
    },
    AMENDES: {
      label: 'Amendes & Pénalités',
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      icon: AlertCircle,
    },
    AUTRE: {
      label: 'Autres Frais',
      color: 'text-slate-400',
      bg: 'bg-slate-800',
      border: 'border-slate-700',
      icon: Receipt,
    },
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchCategory = selectedCategory === 'ALL' || e.category === selectedCategory;
    const matchVehicle = selectedVehicleId === 'ALL' || e.vehicle_id === selectedVehicleId;
    const matchSearch =
      e.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      e.vehicle_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.vehicle_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.driver_name && e.driver_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchVehicle && matchSearch;
  });

  const handleOpenAddExpense = () => {
    const defaultVeh = vehicles[0];
    setFormVehId(defaultVeh?.id || '');
    setFormDrvId(defaultVeh?.driver_id || '');
    setFormCategory('CARBURANT');
    setFormAmount(55000);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormSupplier('Station TotalEnergies Hann');
    setFormLiters(73.3);
    setFormPricePerLiter(750);
    setFormOdometer(defaultVeh?.odometer_km || '');
    setFormDescription('Plein carburant diesel');
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const veh = vehicles.find((v) => v.id === formVehId);
    const drv = drivers.find((d) => d.id === formDrvId);

    addExpense({
      vehicle_id: formVehId,
      vehicle_name: veh?.name || 'Véhicule',
      vehicle_plate: veh?.plate_number || 'DK-0000-XX',
      driver_id: drv?.id,
      driver_name: drv ? `${drv.first_name} ${drv.last_name}` : undefined,
      category: formCategory,
      amount: Number(formAmount) || 0,
      currency: 'FCFA',
      date: formDate,
      supplier: formSupplier,
      liters: formCategory === 'CARBURANT' && formLiters !== '' ? Number(formLiters) : undefined,
      price_per_liter: formCategory === 'CARBURANT' && formPricePerLiter !== '' ? Number(formPricePerLiter) : undefined,
      odometer_at_expense: formOdometer !== '' ? Number(formOdometer) : undefined,
      description: formDescription,
    });
    setIsExpenseModalOpen(false);
  };

  const handleExportExcel = () => {
    const data = filteredExpenses.map((exp) => ({
      ID: exp.id,
      Date: exp.date,
      Véhicule: exp.vehicle_name,
      Immatriculation: exp.vehicle_plate,
      Chauffeur: exp.driver_name || 'N/D',
      Catégorie: exp.category,
      'Montant (FCFA)': exp.amount,
      Fournisseur: exp.supplier,
      Litres: exp.liters ?? 'N/D',
      'Prix/L': exp.price_per_liter ?? 'N/D',
      'Odomètre (km)': exp.odometer_at_expense ?? 'N/D',
      Description: exp.description || 'N/D',
    }));
    exportToExcel('BCS_Fleet_Journal_Depenses', data);
  };

  const handleExportPDF = () => {
    const headers = ['Date', 'Véhicule', 'Immat.', 'Catégorie', 'Fournisseur', 'Montant (FCFA)', 'Description'];
    const rows = filteredExpenses.map((exp) => [
      exp.date,
      exp.vehicle_name,
      exp.vehicle_plate,
      exp.category,
      exp.supplier,
      `${exp.amount.toLocaleString()} F`,
      exp.description || '',
    ]);
    exportToPdf('Journal des Dépenses & TCO — BCS Fleet', headers, rows);
  };

  // Carburant & Maintenance aggregate totals
  const totalFuelCost = tcoSummary.costByCategory.CARBURANT || 0;
  const totalMaintCost = (tcoSummary.costByCategory.MAINTENANCE || 0) + (tcoSummary.costByCategory.REPARATION || 0) + (tcoSummary.costByCategory.PNEUS || 0);

  return (
    <div className="space-y-4 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/80 p-4 lg:p-6 rounded-2xl border border-slate-800 backdrop-blur-xl shadow-xl">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                Dépenses & Coût Total de Possession (TCO)
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Calcul Réel FCFA
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Suivi du carburant, péages, entretiens, réparations et coût d'exploitation par kilomètre.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span>PDF</span>
          </button>

          {isAdminOrManager && (
            <button
              onClick={handleOpenAddExpense}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Enregistrer une Dépense</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI TCO Top Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Coût Total Flotte</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
            {tcoSummary.totalCost.toLocaleString()} <span className="text-xs font-normal text-slate-400">FCFA</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{expenses.length} dépenses enregistrées</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Coût Moyen / km</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400 mt-1 font-mono">
            {tcoSummary.costPerKm !== null ? `${tcoSummary.costPerKm} F/km` : 'Calcul en cours'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {tcoSummary.totalDistanceKm.toLocaleString()} km parcourus
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Dépenses Carburant</span>
            <Fuel className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">
            {totalFuelCost.toLocaleString()} <span className="text-xs font-normal text-slate-400">FCFA</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {tcoSummary.totalCost > 0 ? `${Math.round((totalFuelCost / tcoSummary.totalCost) * 100)}% du budget flotte` : '0%'}
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Maintenance & Réparations</span>
            <Wrench className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-1 font-mono">
            {totalMaintCost.toLocaleString()} <span className="text-xs font-normal text-slate-400">FCFA</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {tcoSummary.totalCost > 0 ? `${Math.round((totalMaintCost / tcoSummary.totalCost) * 100)}% du budget flotte` : '0%'}
          </div>
        </div>
      </div>

      {/* Visual TCO Category Breakdown & Vehicle Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Category Breakdown Bar Progressions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 lg:col-span-1 shadow-lg">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Répartition par Catégorie de Coût
          </h3>

          <div className="space-y-3.5">
            {(Object.keys(categoryConfig) as ExpenseCategory[]).map((cat) => {
              const cfg = categoryConfig[cat];
              const amount = tcoSummary.costByCategory[cat] || 0;
              const percent = tcoSummary.totalCost > 0 ? Math.round((amount / tcoSummary.totalCost) * 100) : 0;
              const Icon = cfg.icon;

              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      <span className="text-slate-300 font-medium">{cfg.label}</span>
                    </div>
                    <div className="font-mono">
                      <span className="font-bold text-white">{amount.toLocaleString()} F</span>
                      <span className="text-slate-500 text-[10px] ml-1.5">({percent}%)</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        cat === 'CARBURANT'
                          ? 'bg-amber-500'
                          : cat === 'MAINTENANCE'
                          ? 'bg-cyan-500'
                          : cat === 'ASSURANCE'
                          ? 'bg-purple-500'
                          : cat === 'PEAGE'
                          ? 'bg-emerald-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cost per Vehicle Leaderboard */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 lg:col-span-2 shadow-lg">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Car className="w-4 h-4 text-emerald-400" />
            Coût d'Exploitation par Véhicule (TCO / km)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">Véhicule</th>
                  <th className="px-3 py-2.5">Kilométrage Traccar</th>
                  <th className="px-3 py-2.5">Dépenses Totales</th>
                  <th className="px-3 py-2.5">Coût au km</th>
                  <th className="px-3 py-2.5 text-right">% Flotte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {Object.keys(tcoSummary.costByVehicle).map((vid) => {
                  const vData = tcoSummary.costByVehicle[vid];
                  const percent = tcoSummary.totalCost > 0 ? Math.round((vData.total / tcoSummary.totalCost) * 100) : 0;

                  return (
                    <tr key={vid} className="hover:bg-slate-800/40 transition">
                      <td className="px-3 py-2.5 font-sans font-medium text-white">
                        <div>{vData.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{vData.plate}</div>
                      </td>
                      <td className="px-3 py-2.5 text-cyan-400">
                        {vData.km > 0 ? `${vData.km.toLocaleString()} km` : 'N/D'}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-emerald-400">
                        {vData.total.toLocaleString()} FCFA
                      </td>
                      <td className="px-3 py-2.5 text-amber-400 font-bold">
                        {vData.costPerKm !== null ? `${vData.costPerKm} F/km` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-400 font-sans">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-bold text-slate-200">
                          {percent}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Journal des Dépenses (Table & Filters) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/50">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Journal des Dépenses</h2>
            <span className="text-xs text-slate-400">({filteredExpenses.length} écritures)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Toutes les catégories</option>
              {(Object.keys(categoryConfig) as ExpenseCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {categoryConfig[cat].label}
                </option>
              ))}
            </select>

            {/* Vehicle Filter */}
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Tous les véhicules</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.plate_number})
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="relative w-44 lg:w-56">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Fournisseur, motif..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Véhicule</th>
                <th className="px-4 py-3">Chauffeur</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Fournisseur / Motif</th>
                <th className="px-4 py-3">Volumétrie</th>
                <th className="px-4 py-3">Montant (FCFA)</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    Aucune dépense trouvée.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const cfg = categoryConfig[exp.category];
                  const Icon = cfg.icon;

                  return (
                    <tr key={exp.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">{exp.date}</td>
                      <td className="px-4 py-3 font-medium text-white">
                        <div>{exp.vehicle_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{exp.vehicle_plate}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {exp.driver_name || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                          <Icon className="w-3 h-3" />
                          <span>{cfg.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-200">{exp.supplier}</div>
                        {exp.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">{exp.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">
                        {exp.liters ? (
                          <span>
                            {exp.liters} L <span className="text-[10px] text-slate-500">({exp.price_per_liter} F/L)</span>
                          </span>
                        ) : exp.odometer_at_expense ? (
                          <span>{exp.odometer_at_expense.toLocaleString()} km</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400 text-sm whitespace-nowrap">
                        {exp.amount.toLocaleString()} F
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isAdminOrManager && (
                          <button
                            onClick={() => deleteExpense(exp.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400 transition"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD EXPENSE */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                Enregistrer une Dépense
              </h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Véhicule concerné *</label>
                  <select
                    value={formVehId}
                    onChange={(e) => setFormVehId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.plate_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Chauffeur (Optionnel)</label>
                  <select
                    value={formDrvId}
                    onChange={(e) => setFormDrvId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Aucun / Chauffeur non assigné</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.first_name} {d.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Catégorie de Dépense *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {(Object.keys(categoryConfig) as ExpenseCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {categoryConfig[cat].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Montant Total (FCFA) *</label>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Fournisseur / Lieu *</label>
                  <input
                    type="text"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    placeholder="ex: Station Total Hann"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Date *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {formCategory === 'CARBURANT' && (
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">Volume (Litres)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formLiters}
                      onChange={(e) => setFormLiters(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="ex: 70"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">Prix / Litre (F)</label>
                    <input
                      type="number"
                      value={formPricePerLiter}
                      onChange={(e) => setFormPricePerLiter(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="ex: 750"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">Odomètre (km)</label>
                    <input
                      type="number"
                      value={formOdometer}
                      onChange={(e) => setFormOdometer(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="ex: 45800"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1">Description / Motif</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Détails complémentaires sur la dépense..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  Enregistrer la dépense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
