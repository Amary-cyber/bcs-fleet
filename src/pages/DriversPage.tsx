import React, { useState } from 'react';
import { useFleet } from '../contexts/FleetContext';
import { useAuth } from '../contexts/AuthContext';
import { Driver } from '../types';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  X,
  Phone,
  Mail,
  ShieldAlert,
  Car,
} from 'lucide-react';

export const DriversPage: React.FC = () => {
  const { drivers, vehicles, addDriver, updateDriver, deleteDriver, updateVehicle } = useFleet();
  const { role } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('2028-01-01');
  const [assignedVehicleId, setAssignedVehicleId] = useState('');
  const [notes, setNotes] = useState('');

  const isAdminOrManager = role === 'ADMIN' || role === 'MANAGER';

  const filteredDrivers = drivers.filter((d) => {
    const fullName = `${d.first_name} ${d.last_name}`.toLowerCase();
    return (
      fullName.includes(searchQuery.toLowerCase()) ||
      d.license_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.phone.includes(searchQuery)
    );
  });

  const openCreateModal = () => {
    setEditingDriver(null);
    setFirstName('');
    setLastName('');
    setPhone('+221 77 ');
    setEmail('');
    setLicenseNumber('SN-PERMIS-');
    setLicenseExpiryDate('2028-06-30');
    setAssignedVehicleId('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (d: Driver) => {
    setEditingDriver(d);
    setFirstName(d.first_name);
    setLastName(d.last_name);
    setPhone(d.phone);
    setEmail(d.email || '');
    setLicenseNumber(d.license_number);
    setLicenseExpiryDate(d.license_expiry_date);
    setAssignedVehicleId(d.assigned_vehicle_id || '');
    setNotes(d.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveDriver = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedVehicle = vehicles.find((v) => v.id === assignedVehicleId);

    if (editingDriver) {
      updateDriver(editingDriver.id, {
        first_name: firstName,
        last_name: lastName,
        phone,
        email,
        license_number: licenseNumber,
        license_expiry_date: licenseExpiryDate,
        assigned_vehicle_id: assignedVehicleId || undefined,
        assigned_vehicle_name: assignedVehicle ? assignedVehicle.name : undefined,
        notes,
      });

      // Update vehicle reference if linked
      if (assignedVehicle) {
        updateVehicle(assignedVehicle.id, {
          driver_id: editingDriver.id,
          driver_name: `${firstName} ${lastName}`,
        });
      }
    } else {
      addDriver({
        first_name: firstName,
        last_name: lastName,
        phone,
        email,
        license_number: licenseNumber,
        license_expiry_date: licenseExpiryDate,
        assigned_vehicle_id: assignedVehicleId || undefined,
        assigned_vehicle_name: assignedVehicle ? assignedVehicle.name : undefined,
        notes,
      });
    }
    setIsModalOpen(false);
  };

  const checkExpiryStatus = (expiryDateStr: string) => {
    const expiry = new Date(expiryDateStr);
    const now = new Date();
    const daysLeft = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (daysLeft < 0) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
          PERMIS EXPIRÉ
        </span>
      );
    }
    if (daysLeft < 30) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
          EXPIRA DANS {daysLeft}j
        </span>
      );
    }
    return (
      <span className="text-slate-300 font-mono text-xs">
        {expiryDateStr}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white font-mono flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" />
            GESTION DES CHAUFFEURS DE LA FLOTTE
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Repertoire des conducteurs, validité du permis de conduire et affectations de véhicules.
          </p>
        </div>

        {isAdminOrManager && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg flex items-center space-x-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>AJOUTER UN CHAUFFEUR</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone, numéro de permis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Drivers Roster Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDrivers.map((driver) => (
          <div
            key={driver.id}
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 p-0.5 shrink-0">
                <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center font-bold text-cyan-400 text-lg">
                  {driver.first_name[0]}{driver.last_name[0]}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-sm truncate">
                  {driver.first_name} {driver.last_name}
                </h3>
                <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                  Permis: {driver.license_number}
                </div>
                <div className="mt-1">{checkExpiryStatus(driver.license_expiry_date)}</div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800 pt-3">
              <div className="flex items-center space-x-2">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-mono">{driver.phone}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate">{driver.email || 'Pas d\'email'}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Car className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-semibold text-slate-200">
                  {driver.assigned_vehicle_name || 'Aucun véhicule assigné'}
                </span>
              </div>
            </div>

            {isAdminOrManager && (
              <div className="flex items-center justify-end space-x-2 border-t border-slate-800 pt-3">
                <button
                  onClick={() => openEditModal(driver)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" /> Modifier
                </button>
                {role === 'ADMIN' && (
                  <button
                    onClick={() => {
                      if (confirm(`Supprimer le chauffeur ${driver.first_name} ${driver.last_name} ?`)) {
                        deleteDriver(driver.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Driver Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-mono">
                {editingDriver ? 'MODIFIER LE CHAUFFEUR' : 'NOUVEAU CHAUFFEUR'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Téléphone *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">N° de Permis *</label>
                  <input
                    type="text"
                    required
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Date Expiration Permis *</label>
                  <input
                    type="date"
                    required
                    value={licenseExpiryDate}
                    onChange={(e) => setLicenseExpiryDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Véhicule Associé</label>
                <select
                  value={assignedVehicleId}
                  onChange={(e) => setAssignedVehicleId(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-cyan-500"
                >
                  <option value="">Aucun véhicule assigné</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.plate_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
