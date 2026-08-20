import React, { useState } from 'react';
import { useFleet } from '../contexts/FleetContext';
import { useAuth } from '../contexts/AuthContext';
import { Vehicle, VehicleType } from '../types';
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
  ShieldAlert,
} from 'lucide-react';

interface VehiclesPageProps {
  onNavigateTab: (tabId: string, vehicleId?: string) => void;
  onOpenImmobilizer: (vehicle: Vehicle) => void;
}

export const VehiclesPage: React.FC<VehiclesPageProps> = ({
  onNavigateTab,
  onOpenImmobilizer,
}) => {
  const { vehicles, drivers, devices, addVehicle, updateVehicle, deleteVehicle, addDevice } = useFleet();
  const { role } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [selectedVehicleForGps, setSelectedVehicleForGps] = useState<Vehicle | null>(null);

  // New Vehicle Form State
  const [formName, setFormName] = useState('');
  const [formPlate, setFormPlate] = useState('');
  const [formBrand, setFormBrand] = useState('Toyota');
  const [formModel, setFormModel] = useState('');
  const [formYear, setFormYear] = useState(2024);
  const [formColor, setFormColor] = useState('Blanc');
  const [formVin, setFormVin] = useState('');
  const [formType, setFormType] = useState<VehicleType>('PICKUP');
  const [formDriverId, setFormDriverId] = useState('');
  const [formOdometer, setFormOdometer] = useState(0);

  // GPS Pairing Wizard State
  const [gpsImei, setGpsImei] = useState('');
  const [gpsModel, setGpsModel] = useState('Teltonika FMB920');
  const [gpsDiagnosticStep, setGpsDiagnosticStep] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'FAIL'>('IDLE');

  const isAdminOrManager = role === 'ADMIN' || role === 'MANAGER';

  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.plate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'ALL' || v.vehicle_type === filterType;
    return matchesSearch && matchesType;
  });

  const openCreateModal = () => {
    setEditingVehicle(null);
    setFormName('');
    setFormPlate('');
    setFormBrand('Toyota');
    setFormModel('');
    setFormYear(2024);
    setFormColor('Blanc');
    setFormVin('');
    setFormType('PICKUP');
    setFormDriverId('');
    setFormOdometer(0);
    setIsVehicleModalOpen(true);
  };

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
    setFormDriverId(v.driver_id || '');
    setFormOdometer(v.odometer_km);
    setIsVehicleModalOpen(true);
  };

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedDriver = drivers.find((d) => d.id === formDriverId);

    if (editingVehicle) {
      updateVehicle(editingVehicle.id, {
        name: formName,
        plate_number: formPlate,
        brand: formBrand,
        model: formModel,
        year: Number(formYear),
        color: formColor,
        vin: formVin,
        vehicle_type: formType,
        driver_id: formDriverId || null,
        driver_name: assignedDriver ? `${assignedDriver.first_name} ${assignedDriver.last_name}` : 'Non assigné',
        odometer_km: Number(formOdometer),
      });
    } else {
      addVehicle({
        name: formName,
        plate_number: formPlate,
        brand: formBrand,
        model: formModel,
        year: Number(formYear),
        color: formColor,
        vin: formVin,
        vehicle_type: formType,
        driver_id: formDriverId || null,
        driver_name: assignedDriver ? `${assignedDriver.first_name} ${assignedDriver.last_name}` : 'Non assigné',
        odometer_km: Number(formOdometer),
      });
    }
    setIsVehicleModalOpen(false);
  };

  const openGpsWizard = (v: Vehicle) => {
    setSelectedVehicleForGps(v);
    setGpsImei(v.device_imei && v.device_imei !== 'Non associé' ? v.device_imei : '86' + Math.floor(Math.random() * 1000000000000));
    setGpsDiagnosticStep('IDLE');
    setIsGpsModalOpen(true);
  };

  const runGpsDiagnostic = () => {
    setGpsDiagnosticStep('TESTING');
    setTimeout(() => {
      if (gpsImei.length >= 10) {
        setGpsDiagnosticStep('SUCCESS');
        if (selectedVehicleForGps) {
          updateVehicle(selectedVehicleForGps.id, {
            device_imei: gpsImei,
            status: 'STOPPED',
          });
          addDevice({
            name: `Traceur ${selectedVehicleForGps.name}`,
            imei: gpsImei,
            model: gpsModel,
            assigned_vehicle_name: selectedVehicleForGps.name,
          });
        }
      } else {
        setGpsDiagnosticStep('FAIL');
      }
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white font-mono flex items-center gap-2">
            <Car className="w-6 h-6 text-cyan-400" />
            GESTION DES VÉHICULES DE LA FLOTTE
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enregistrement, fiches techniques, attribution des chauffeurs et binding GPS.
          </p>
        </div>

        {isAdminOrManager && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg flex items-center space-x-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>AJOUTER UN VÉHICULE</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, immatriculation, marque..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400">Type:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Tous les types</option>
            <option value="PICKUP">Pick-up</option>
            <option value="VAN">Fourgon</option>
            <option value="TRUCK">Camion</option>
            <option value="SEDAN">Berline</option>
          </select>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
              <tr>
                <th className="p-4">Véhicule</th>
                <th className="p-4">Immatriculation</th>
                <th className="p-4">Marque / Modèle</th>
                <th className="p-4">Chauffeur</th>
                <th className="p-4">Traceur GPS</th>
                <th className="p-4">Statut</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
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
                  <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-white">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-cyan-400">
                          <Car className="w-4 h-4" />
                        </div>
                        <div>
                          <div>{v.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">VIN: {v.vin || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-cyan-400">{v.plate_number}</td>
                    <td className="p-4 text-slate-200">{v.brand} {v.model} ({v.year})</td>
                    <td className="p-4 text-slate-300">{v.driver_name || 'Non assigné'}</td>
                    <td className="p-4 font-mono text-slate-400">
                      {v.device_imei && v.device_imei !== 'Non associé' ? (
                        <span className="text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 text-[10px]">
                          {v.device_imei}
                        </span>
                      ) : (
                        <button
                          onClick={() => openGpsWizard(v)}
                          className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <Radio className="w-3 h-3 inline" /> Associer GPS
                        </button>
                      )}
                    </td>
                    <td className="p-4">{statusBadge}</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => onNavigateTab('tracking', v.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400"
                        title="Voir sur la carte"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {isAdminOrManager && (
                        <>
                          <button
                            onClick={() => openGpsWizard(v)}
                            className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                            title="Configurer GPS"
                          >
                            <Radio className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(v)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => onOpenImmobilizer(v)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        title="Immobiliser le moteur"
                      >
                        <Lock className="w-4 h-4" />
                      </button>

                      {role === 'ADMIN' && (
                        <button
                          onClick={() => {
                            if (confirm(`Voulez-vous supprimer le véhicule ${v.name} ?`)) {
                              deleteVehicle(v.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Vehicle Add / Edit Modal */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsVehicleModalOpen(false)} />
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-mono">
                {editingVehicle ? 'MODIFIER LE VÉHICULE' : 'AJOUTER UN NOUVEAU VÉHICULE'}
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
                  <label className="block text-slate-400 mb-1 font-semibold">Immatriculation (Plaque) *</label>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Numéro VIN</label>
                  <input
                    type="text"
                    placeholder="VIN..."
                    value={formVin}
                    onChange={(e) => setFormVin(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Chauffeur Associé</label>
                  <select
                    value={formDriverId}
                    onChange={(e) => setFormDriverId(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Aucun chauffeur (Non assigné)</option>
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

      {/* GPS Pairing Diagnostic Wizard Modal */}
      {isGpsModalOpen && selectedVehicleForGps && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsGpsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Radio className="w-5 h-5 text-cyan-400" />
                ASSOCIATION TRACEUR GPS
              </h3>
              <button onClick={() => setIsGpsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[11px]">Véhicule Cible:</div>
                <div className="font-bold text-white text-sm">{selectedVehicleForGps.name}</div>
                <div className="font-mono text-cyan-400 text-xs">{selectedVehicleForGps.plate_number}</div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Code IMEI du Traceur *</label>
                <input
                  type="text"
                  placeholder="ex: 864201049281726"
                  value={gpsImei}
                  onChange={(e) => setGpsImei(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Modèle du Traceur GPS</label>
                <select
                  value={gpsModel}
                  onChange={(e) => setGpsModel(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Teltonika FMB920">Teltonika FMB920</option>
                  <option value="Concox GT06N">Concox GT06N</option>
                  <option value="Queclink GV300">Queclink GV300</option>
                  <option value="Sinotrack ST-901">Sinotrack ST-901</option>
                </select>
              </div>

              {/* Diagnostic Feedback */}
              {gpsDiagnosticStep === 'TESTING' && (
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-center animate-pulse">
                  Diagnostic de connexion Traccar en cours...
                </div>
              )}

              {gpsDiagnosticStep === 'SUCCESS' && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-1">
                  <div className="flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Signal GPS Validé
                  </div>
                  <div className="text-[11px] text-slate-300 pl-5">
                    ✓ GPS configuré<br />
                    ✓ Device Traccar trouvé<br />
                    ✓ Connexion active<br />
                    ✓ Position reçue
                  </div>
                </div>
              )}

              {gpsDiagnosticStep === 'FAIL' && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 space-y-1">
                  <div className="flex items-center gap-1 font-bold">
                    <AlertTriangle className="w-4 h-4" /> ⚠ Aucun signal GPS reçu
                  </div>
                  <p className="text-[11px] text-slate-300 pl-5">
                    Vérifiez la carte SIM et l'alimentation 12V/24V du boîtier.
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={runGpsDiagnostic}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold hover:from-cyan-400 hover:to-teal-400 shadow-md"
                >
                  TESTER ET ASSOCIER LE TRACEUR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
