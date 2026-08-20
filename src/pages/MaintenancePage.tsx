import React, { useState } from 'react';
import { useFleet } from '../contexts/FleetContext';
import { useAuth } from '../contexts/AuthContext';
import {
  MaintenanceRecord,
  MaintenanceSchedule,
  VehicleDocument,
  MaintenanceType,
  MaintenanceStatus,
  MaintenancePriority,
  DocumentType,
} from '../types';
import {
  Wrench,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  FileText,
  Shield,
  FileSpreadsheet,
  FileCheck,
  DollarSign,
  Car,
  Trash2,
  Edit,
  ExternalLink,
  ChevronRight,
  Gauge,
  Sparkles,
  Layers,
  ArrowUpDown,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { exportToExcel, exportToPdf } from '../utils/exportEngine';

interface MaintenancePageProps {
  initialVehicleId?: string;
  onNavigateTab?: (tabId: string, vehicleId?: string) => void;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({
  initialVehicleId,
  onNavigateTab,
}) => {
  const {
    vehicles,
    maintenanceRecords,
    maintenanceSchedules,
    vehicleDocuments,
    addMaintenanceRecord,
    updateMaintenanceRecord,
    deleteMaintenanceRecord,
    addMaintenanceSchedule,
    updateMaintenanceSchedule,
    deleteMaintenanceSchedule,
    addVehicleDocument,
    updateVehicleDocument,
    deleteVehicleDocument,
  } = useFleet();
  const { role } = useAuth();

  const [activeTab, setActiveTab] = useState<'RECORDS' | 'SCHEDULES' | 'DOCUMENTS' | 'VEHICLE_DETAIL'>(
    initialVehicleId ? 'VEHICLE_DETAIL' : 'RECORDS'
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(initialVehicleId || 'ALL');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);

  // Form states - Record
  const [formVehId, setFormVehId] = useState(vehicles[0]?.id || '');
  const [formType, setFormType] = useState<MaintenanceType>('OIL_CHANGE');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStatus, setFormStatus] = useState<MaintenanceStatus>('SCHEDULED');
  const [formPriority, setFormPriority] = useState<MaintenancePriority>('MEDIUM');
  const [formProvider, setFormProvider] = useState('BCS Repair Dakar');
  const [formCost, setFormCost] = useState<number>(50000);
  const [formOdometer, setFormOdometer] = useState<number | ''>('');
  const [formSchedDate, setFormSchedDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCompDate, setFormCompDate] = useState('');
  const [formNextDueDate, setFormNextDueDate] = useState('');
  const [formNextDueKm, setFormNextDueKm] = useState<number | ''>('');
  const [formInvoice, setFormInvoice] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Form states - Schedule (Preventive Rule)
  const [schedVehId, setSchedVehId] = useState(vehicles[0]?.id || '');
  const [schedType, setSchedType] = useState<MaintenanceType>('OIL_CHANGE');
  const [schedTitle, setSchedTitle] = useState('Vidange moteur (Tous les 10 000 km)');
  const [schedIntervalKm, setSchedIntervalKm] = useState<number | ''>(10000);
  const [schedIntervalMonths, setSchedIntervalMonths] = useState<number | ''>(6);
  const [schedIntervalHours, setSchedIntervalHours] = useState<number | ''>('');

  // Form states - Document
  const [docVehId, setDocVehId] = useState(vehicles[0]?.id || '');
  const [docType, setDocType] = useState<DocumentType>('VISITE_TECHNIQUE');
  const [docTitle, setDocTitle] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [docProvider, setDocProvider] = useState('');
  const [docCost, setDocCost] = useState<number>(25000);
  const [docIssueDate, setDocIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [docExpiryDate, setDocExpiryDate] = useState(
    new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [docNotes, setDocNotes] = useState('');

  const isAdminOrManager = role === 'ADMIN' || role === 'MANAGER';

  // KPI Calculations
  const totalRecords = maintenanceRecords.length;
  const scheduledCount = maintenanceRecords.filter((r) => r.status === 'SCHEDULED' || r.status === 'IN_PROGRESS').length;
  const completedCount = maintenanceRecords.filter((r) => r.status === 'COMPLETED').length;

  const nowTime = Date.now();
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const currentYearStr = new Date().getFullYear().toString();

  const costThisMonth = maintenanceRecords
    .filter((r) => (r.completed_date || r.scheduled_date).startsWith(currentMonthStr))
    .reduce((sum, r) => sum + r.cost, 0);

  const costThisYear = maintenanceRecords
    .filter((r) => (r.completed_date || r.scheduled_date).startsWith(currentYearStr))
    .reduce((sum, r) => sum + r.cost, 0);

  // Overdue / Urgent Items
  const overdueRecords = maintenanceRecords.filter((r) => {
    if (r.status === 'COMPLETED' || r.status === 'CANCELLED') return false;
    const isDatePast = new Date(r.scheduled_date).getTime() < nowTime;
    const veh = vehicles.find((v) => v.id === r.vehicle_id);
    const isKmExceeded = r.next_due_odometer && veh?.odometer_km ? veh.odometer_km >= r.next_due_odometer : false;
    return isDatePast || isKmExceeded;
  });

  const expiringDocs = vehicleDocuments.filter((d) => {
    const days = Math.ceil((new Date(d.expiry_date).getTime() - nowTime) / (1000 * 3600 * 24));
    return days <= 30;
  });

  // Filtered lists
  const filteredRecords = maintenanceRecords.filter((r) => {
    const matchVeh = selectedVehicleId === 'ALL' || r.vehicle_id === selectedVehicleId;
    const matchType = typeFilter === 'ALL' || r.type === typeFilter;
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.vehicle_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.vehicle_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.invoice_number && r.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchVeh && matchType && matchStatus && matchSearch;
  });

  const filteredSchedules = maintenanceSchedules.filter((s) => {
    const matchVeh = selectedVehicleId === 'ALL' || s.vehicle_id === selectedVehicleId;
    const matchSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.vehicle_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.vehicle_plate.toLowerCase().includes(searchQuery.toLowerCase());
    return matchVeh && matchSearch;
  });

  const filteredDocs = vehicleDocuments.filter((d) => {
    const matchVeh = selectedVehicleId === 'ALL' || d.vehicle_id === selectedVehicleId;
    const matchSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vehicle_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.document_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.provider_or_center.toLowerCase().includes(searchQuery.toLowerCase());
    return matchVeh && matchSearch;
  });

  const handleOpenNewRecord = (vehId?: string) => {
    const defaultVeh = vehicles.find((v) => v.id === vehId) || vehicles[0];
    setEditingRecord(null);
    setFormVehId(defaultVeh?.id || '');
    setFormType('OIL_CHANGE');
    setFormTitle('Vidange moteur 10 000 km + Filtres');
    setFormDesc('');
    setFormStatus('SCHEDULED');
    setFormPriority('MEDIUM');
    setFormProvider('BCS Repair Dakar');
    setFormCost(85000);
    setFormOdometer(defaultVeh?.odometer_km || '');
    setFormSchedDate(new Date().toISOString().split('T')[0]);
    setFormCompDate('');
    setFormNextDueDate(new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().split('T')[0]);
    setFormNextDueKm(defaultVeh?.odometer_km ? defaultVeh.odometer_km + 10000 : '');
    setFormInvoice('');
    setFormNotes('');
    setIsRecordModalOpen(true);
  };

  const handleEditRecord = (rec: MaintenanceRecord) => {
    setEditingRecord(rec);
    setFormVehId(rec.vehicle_id);
    setFormType(rec.type);
    setFormTitle(rec.title);
    setFormDesc(rec.description || '');
    setFormStatus(rec.status);
    setFormPriority(rec.priority);
    setFormProvider(rec.provider);
    setFormCost(rec.cost);
    setFormOdometer(rec.odometer ?? '');
    setFormSchedDate(rec.scheduled_date);
    setFormCompDate(rec.completed_date || '');
    setFormNextDueDate(rec.next_due_date || '');
    setFormNextDueKm(rec.next_due_odometer ?? '');
    setFormInvoice(rec.invoice_number || '');
    setFormNotes(rec.notes || '');
    setIsRecordModalOpen(true);
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<MaintenanceRecord> = {
      vehicle_id: formVehId,
      type: formType,
      title: formTitle,
      description: formDesc,
      status: formStatus,
      priority: formPriority,
      provider: formProvider,
      cost: Number(formCost) || 0,
      currency: 'FCFA',
      odometer: formOdometer !== '' ? Number(formOdometer) : undefined,
      scheduled_date: formSchedDate,
      completed_date: formStatus === 'COMPLETED' ? formCompDate || new Date().toISOString().split('T')[0] : undefined,
      next_due_date: formNextDueDate || undefined,
      next_due_odometer: formNextDueKm !== '' ? Number(formNextDueKm) : undefined,
      invoice_number: formInvoice || undefined,
      notes: formNotes || undefined,
    };

    if (editingRecord) {
      updateMaintenanceRecord(editingRecord.id, payload);
    } else {
      addMaintenanceRecord(payload);
    }
    setIsRecordModalOpen(false);
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    addMaintenanceSchedule({
      vehicle_id: schedVehId,
      type: schedType,
      title: schedTitle,
      interval_km: schedIntervalKm !== '' ? Number(schedIntervalKm) : undefined,
      interval_months: schedIntervalMonths !== '' ? Number(schedIntervalMonths) : undefined,
      interval_engine_hours: schedIntervalHours !== '' ? Number(schedIntervalHours) : undefined,
    });
    setIsScheduleModalOpen(false);
  };

  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();
    addVehicleDocument({
      vehicle_id: docVehId,
      type: docType,
      title: docTitle,
      document_number: docNumber,
      provider_or_center: docProvider,
      cost: Number(docCost) || 0,
      issue_date: docIssueDate,
      expiry_date: docExpiryDate,
      notes: docNotes,
    });
    setIsDocModalOpen(false);
  };

  const handleExportExcel = () => {
    const data = filteredRecords.map((r) => ({
      'ID Entretien': r.id,
      Véhicule: r.vehicle_name,
      Immatriculation: r.vehicle_plate,
      Type: r.type,
      Titre: r.title,
      Statut: r.status,
      Priorité: r.priority,
      Prestataire: r.provider,
      'Coût (FCFA)': r.cost,
      'Odomètre (km)': r.odometer ?? 'N/D',
      'Date Prévue': r.scheduled_date,
      'Date Réalisée': r.completed_date || 'En attente',
      'Prochaine Échéance (km)': r.next_due_odometer ?? 'N/D',
      Facture: r.invoice_number || 'N/D',
    }));
    exportToExcel('BCS_Fleet_Rapport_Maintenance', data);
  };

  const handleExportPDF = () => {
    const headers = ['Véhicule', 'Immat.', 'Type', 'Titre', 'Statut', 'Prestataire', 'Coût (FCFA)', 'Date'];
    const rows = filteredRecords.map((r) => [
      r.vehicle_name,
      r.vehicle_plate,
      r.type,
      r.title,
      r.status,
      r.provider,
      `${r.cost.toLocaleString()} F`,
      r.scheduled_date,
    ]);
    exportToPdf('Rapport de Maintenance Automobile — BCS Fleet', headers, rows);
  };

  const getPriorityBadge = (p: MaintenancePriority) => {
    switch (p) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">Critique</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Élevée</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Normale</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">Basse</span>;
    }
  };

  const getStatusBadge = (s: MaintenanceStatus) => {
    switch (s) {
      case 'COMPLETED':
        return <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"><CheckCircle2 className="w-3.5 h-3.5" /><span>Terminé</span></span>;
      case 'IN_PROGRESS':
        return <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse"><Wrench className="w-3.5 h-3.5" /><span>En cours</span></span>;
      case 'SCHEDULED':
        return <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30"><Clock className="w-3.5 h-3.5" /><span>Programmé</span></span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">Annulé</span>;
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/80 p-4 lg:p-6 rounded-2xl border border-slate-800 backdrop-blur-xl shadow-xl">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                Gestion de la Maintenance & Entretien
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Télématique Traccar
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Suivi des vidanges, visites techniques CTTD, assurances, pièces d'usure et règles préventives.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
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
            <>
              <button
                onClick={() => setIsScheduleModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold rounded-xl border border-cyan-500/30 transition shadow-lg shadow-cyan-950/30"
              >
                <Clock className="w-4 h-4" />
                <span>+ Règle Préventive</span>
              </button>
              <button
                onClick={() => setIsDocModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold rounded-xl border border-purple-500/30 transition shadow-lg shadow-purple-950/30"
              >
                <Shield className="w-4 h-4" />
                <span>+ Document / Assurance</span>
              </button>
              <button
                onClick={() => handleOpenNewRecord()}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition transform hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Nouvelle Fiche Entretien</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Total Entretiens</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">{totalRecords}</div>
          <div className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1">
            <span>{completedCount} terminés</span>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">À Venir / En cours</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{scheduledCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">interventions planifiées</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">En Retard / Urgent</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className={`text-2xl font-bold mt-1 ${overdueRecords.length > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-300'}`}>
            {overdueRecords.length}
          </div>
          <div className="text-[11px] text-rose-400 mt-0.5">échéances dépassées</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Dépenses ce Mois</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {costThisMonth.toLocaleString()} <span className="text-xs font-normal">FCFA</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">factures maintenance</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-2xl col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Documents Expirants</span>
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <div className={`text-2xl font-bold mt-1 ${expiringDocs.length > 0 ? 'text-purple-400' : 'text-slate-300'}`}>
            {expiringDocs.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">assurances / visites &lt; 30j</div>
        </div>
      </div>

      {/* Urgent Warning Banner if Overdue items exist */}
      {overdueRecords.length > 0 && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start space-x-3 text-rose-300">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
          <div className="text-xs flex-1">
            <span className="font-bold">Attention ({overdueRecords.length} entretien(s) critique(s) en retard) :</span>{' '}
            {overdueRecords.map((r) => `${r.vehicle_name} (${r.title})`).join(' • ')}.
          </div>
        </div>
      )}

      {/* Tab Switcher & Filters Header */}
      <div className="bg-slate-900/80 p-3 lg:p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Module Sub-tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800/80 self-start">
          <button
            onClick={() => setActiveTab('RECORDS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'RECORDS'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📋 Fiches d'Entretien ({maintenanceRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('SCHEDULES')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'SCHEDULES'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⏱️ Règles Préventives ({maintenanceSchedules.length})
          </button>
          <button
            onClick={() => setActiveTab('DOCUMENTS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'DOCUMENTS'
                ? 'bg-purple-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📄 Assurances & Contrôles ({vehicleDocuments.length})
          </button>
        </div>

        {/* Global Vehicle & Search Filter */}
        <div className="flex items-center space-x-2">
          {/* Vehicle Dropdown */}
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Tous les Véhicules ({vehicles.length})</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.plate_number})
              </option>
            ))}
          </select>

          {/* Search box */}
          <div className="relative w-48 lg:w-60">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* TAB CONTENT: 1. RECORDS */}
      {activeTab === 'RECORDS' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Véhicule</th>
                  <th className="px-4 py-3">Intervention</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Priorité</th>
                  <th className="px-4 py-3">Prestataire</th>
                  <th className="px-4 py-3">Coût (FCFA)</th>
                  <th className="px-4 py-3">Odomètre Traccar</th>
                  <th className="px-4 py-3">Date Prévue</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-slate-500">
                      Aucune fiche d'entretien trouvée avec les critères sélectionnés.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => {
                    const veh = vehicles.find((v) => v.id === r.vehicle_id);
                    return (
                      <tr key={r.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 font-medium text-white">
                          <div className="flex items-center space-x-2">
                            <Car className="w-4 h-4 text-cyan-400 shrink-0" />
                            <div>
                              <div>{r.vehicle_name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{r.vehicle_plate}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-200">{r.title}</div>
                          {r.invoice_number && (
                            <span className="text-[10px] text-slate-500">Fac: {r.invoice_number}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(r.status)}</td>
                        <td className="px-4 py-3">{getPriorityBadge(r.priority)}</td>
                        <td className="px-4 py-3 text-slate-300">{r.provider}</td>
                        <td className="px-4 py-3 font-mono font-bold text-amber-400">
                          {r.cost.toLocaleString()} F
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400">
                          {r.odometer ? (
                            <span>{r.odometer.toLocaleString()} km</span>
                          ) : veh?.odometer_km ? (
                            <span className="text-cyan-400/80">{veh.odometer_km.toLocaleString()} km (Live)</span>
                          ) : (
                            <span className="text-slate-600 text-[10px]">Indisponible</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono">{r.scheduled_date}</td>
                        <td className="px-4 py-3 text-right space-x-1.5">
                          {isAdminOrManager && (
                            <>
                              <button
                                onClick={() => handleEditRecord(r)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 transition"
                                title="Modifier"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteMaintenanceRecord(r.id)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
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
      )}

      {/* TAB CONTENT: 2. SCHEDULES (PREVENTIVE RULES) */}
      {activeTab === 'SCHEDULES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchedules.map((s) => {
            const veh = vehicles.find((v) => v.id === s.vehicle_id);
            const currentOdo = veh?.odometer_km || 0;
            const lastOdo = s.last_performed_odometer || 0;
            const targetOdo = lastOdo + (s.interval_km || 10000);
            const remainingKm = targetOdo - currentOdo;
            const percentProgress = Math.min(100, Math.max(0, Math.round(((currentOdo - lastOdo) / (s.interval_km || 10000)) * 100)));
            const isOverdue = remainingKm <= 0;

            return (
              <div
                key={s.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-cyan-500/40 transition relative overflow-hidden group shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {s.type}
                    </span>
                    <h3 className="text-base font-bold text-white mt-2">{s.title}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {s.vehicle_name} ({s.vehicle_plate})
                    </p>
                  </div>
                  {isAdminOrManager && (
                    <button
                      onClick={() => deleteMaintenanceSchedule(s.id)}
                      className="text-slate-500 hover:text-rose-400 transition"
                      title="Supprimer la règle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mt-4 pt-4 border-t border-slate-800/80">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Progression cycle</span>
                    <span className={`font-mono font-bold ${isOverdue ? 'text-rose-400' : 'text-cyan-400'}`}>
                      {percentProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isOverdue ? 'bg-rose-500' : percentProgress > 80 ? 'bg-amber-500' : 'bg-cyan-500'
                      }`}
                      style={{ width: `${percentProgress}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                      <div className="text-[10px] text-slate-500">Odomètre Actuel</div>
                      <div className="font-mono font-bold text-slate-200">{currentOdo.toLocaleString()} km</div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                      <div className="text-[10px] text-slate-500">Prévu à</div>
                      <div className="font-mono font-bold text-amber-400">{targetOdo.toLocaleString()} km</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Échéance restante :</span>
                    <span className={`font-bold font-mono ${isOverdue ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                      {isOverdue ? `Dépassé de ${Math.abs(remainingKm)} km` : `Dans ${remainingKm.toLocaleString()} km`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB CONTENT: 3. DOCUMENTS, ASSURANCES & VISITES TECHNIQUES */}
      {activeTab === 'DOCUMENTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((d) => {
            const daysLeft = Math.ceil((new Date(d.expiry_date).getTime() - nowTime) / (1000 * 3600 * 24));
            const isExpired = daysLeft < 0;
            const isUrgent = daysLeft <= 15;

            return (
              <div
                key={d.id}
                className={`bg-slate-900/80 border rounded-2xl p-5 transition shadow-lg ${
                  isExpired
                    ? 'border-rose-500/50 bg-rose-950/10'
                    : isUrgent
                    ? 'border-amber-500/40 bg-amber-950/10'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-2 rounded-xl ${d.type === 'ASSURANCE' ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {d.type.replace('_', ' ')}
                      </span>
                      <h3 className="text-sm font-bold text-white leading-snug">{d.title}</h3>
                    </div>
                  </div>
                  {isAdminOrManager && (
                    <button
                      onClick={() => deleteVehicleDocument(d.id)}
                      className="text-slate-500 hover:text-rose-400 transition"
                      title="Supprimer le document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Véhicule :</span>
                    <span className="font-semibold text-slate-200">{d.vehicle_name} ({d.vehicle_plate})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">N° Document :</span>
                    <span className="font-mono text-cyan-400">{d.document_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Centre / Compagnie :</span>
                    <span className="text-slate-300">{d.provider_or_center}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date d'expiration :</span>
                    <span className="font-mono font-bold text-slate-200">{d.expiry_date}</span>
                  </div>
                </div>

                {/* Expiration Banner */}
                <div className={`mt-4 p-2.5 rounded-xl text-center text-xs font-bold ${
                  isExpired
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : isUrgent
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-950 text-emerald-400 border border-slate-800'
                }`}>
                  {isExpired
                    ? `⚠️ DOCUMENT EXPIRÉ DEPUIS ${Math.abs(daysLeft)} JOUR(S)`
                    : `Expire dans ${daysLeft} jour(s)`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: NEW / EDIT MAINTENANCE RECORD */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                {editingRecord ? "Modifier la Fiche d'Entretien" : "Nouvelle Fiche d'Entretien"}
              </h3>
              <button onClick={() => setIsRecordModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Véhicule concerné *</label>
                  <select
                    value={formVehId}
                    onChange={(e) => setFormVehId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
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
                  <label className="block text-slate-400 mb-1">Type d'entretien *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as MaintenanceType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="OIL_CHANGE">Vidange moteur / Filtres</option>
                    <option value="INSPECTION">Révision périodique</option>
                    <option value="BRAKES">Système de freinage</option>
                    <option value="TIRES">Pneumatiques</option>
                    <option value="BATTERY">Batterie & Électricité</option>
                    <option value="REPAIR">Réparation mécanique</option>
                    <option value="OTHER">Autre entretien</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Titre de l'intervention *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Statut</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as MaintenanceStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="SCHEDULED">Programmé</option>
                    <option value="IN_PROGRESS">En cours</option>
                    <option value="COMPLETED">Terminé</option>
                    <option value="CANCELLED">Annulé</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Priorité</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as MaintenancePriority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="LOW">Basse</option>
                    <option value="MEDIUM">Normale</option>
                    <option value="HIGH">Élevée</option>
                    <option value="CRITICAL">Critique</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Coût Total (FCFA)</label>
                  <input
                    type="number"
                    value={formCost}
                    onChange={(e) => setFormCost(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Prestataire / Garage *</label>
                  <input
                    type="text"
                    value={formProvider}
                    onChange={(e) => setFormProvider(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Odomètre Véhicule (km)</label>
                  <input
                    type="number"
                    value={formOdometer}
                    onChange={(e) => setFormOdometer(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="ex: 45000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Date d'intervention *</label>
                  <input
                    type="date"
                    value={formSchedDate}
                    onChange={(e) => setFormSchedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Prochaine échéance (km)</label>
                  <input
                    type="number"
                    value={formNextDueKm}
                    onChange={(e) => setFormNextDueKm(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="ex: 55000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">N° de Facture / Bon de commande</label>
                <input
                  type="text"
                  value={formInvoice}
                  onChange={(e) => setFormInvoice(e.target.value)}
                  placeholder="ex: FAC-2026-0012"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20"
                >
                  {editingRecord ? 'Enregistrer les modifications' : "Créer la fiche d'entretien"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW PREVENTIVE SCHEDULE */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                Nouvelle Règle d'Entretien Préventif
              </h3>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Véhicule ciblé *</label>
                <select
                  value={schedVehId}
                  onChange={(e) => setSchedVehId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.plate_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Titre de la règle *</label>
                <input
                  type="text"
                  value={schedTitle}
                  onChange={(e) => setSchedTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Intervalle Kilométrage (km)</label>
                  <input
                    type="number"
                    value={schedIntervalKm}
                    onChange={(e) => setSchedIntervalKm(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="ex: 10000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Intervalle Temps (Mois)</label>
                  <input
                    type="number"
                    value={schedIntervalMonths}
                    onChange={(e) => setSchedIntervalMonths(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="ex: 6"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/20"
                >
                  Créer la règle préventive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW VEHICLE DOCUMENT */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                Ajouter un Document / Assurance
              </h3>
              <button onClick={() => setIsDocModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveDocument} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Véhicule *</label>
                  <select
                    value={docVehId}
                    onChange={(e) => setDocVehId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.plate_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Type de Document</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as DocumentType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="ASSURANCE">Police d'Assurance</option>
                    <option value="VISITE_TECHNIQUE">Visite Technique (CTTD)</option>
                    <option value="CARTE_GRISE">Carte Grise</option>
                    <option value="VIGNETTE">Vignette / Taxe</option>
                    <option value="AUTRE">Autre Document</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Titre du Document *</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="ex: Police Flotte Tous Risques AXA"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">N° de Document / Police *</label>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="ex: AXA-SN-2026-99"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Organisme / Centre</label>
                  <input
                    type="text"
                    value={docProvider}
                    onChange={(e) => setDocProvider(e.target.value)}
                    placeholder="ex: CTTD Hann Maristes"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Date d'émission</label>
                  <input
                    type="date"
                    value={docIssueDate}
                    onChange={(e) => setDocIssueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Date d'expiration *</label>
                  <input
                    type="date"
                    value={docExpiryDate}
                    onChange={(e) => setDocExpiryDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/20"
                >
                  Enregistrer le document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
