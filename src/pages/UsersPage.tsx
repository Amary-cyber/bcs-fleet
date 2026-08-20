import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, UserProfile } from '../types';
import {
  UserCheck,
  Plus,
  Shield,
  Search,
  Lock,
  Check,
  X,
  Mail,
  User,
  KeyRound,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { user: currentUser, role, switchRole } = useAuth();
  const [usersList, setUsersList] = useState<UserProfile[]>([
    {
      id: 'usr-1',
      email: 'admin@bcsfleet.sn',
      full_name: 'Amadou Sow',
      phone: '+221 77 888 99 00',
      role: 'ADMIN',
    },
    {
      id: 'usr-2',
      email: 'manager.logistique@bcsfleet.sn',
      full_name: 'Fatou Kiné Faye',
      phone: '+221 78 111 22 33',
      role: 'MANAGER',
    },
    {
      id: 'usr-3',
      email: 'mamadou.ndiaye@bcsfleet.sn',
      full_name: 'Mamadou Ndiaye',
      phone: '+221 77 123 45 67',
      role: 'DRIVER',
    },
    {
      id: 'usr-4',
      email: 'superviseur@bcsfleet.sn',
      full_name: 'Cheikh Tidiane Sy',
      phone: '+221 76 999 00 11',
      role: 'VIEWER',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('MANAGER');

  const isAdmin = role === 'ADMIN';

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      email: newEmail,
      full_name: newName,
      phone: newPhone,
      role: newRole,
      created_at: new Date().toISOString(),
    };
    setUsersList([...usersList, newUser]);
    setIsModalOpen(false);
    setNewEmail('');
    setNewName('');
  };

  const getRoleBadge = (userRole: UserRole) => {
    switch (userRole) {
      case 'ADMIN':
        return <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">ADMIN</span>;
      case 'MANAGER':
        return <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">MANAGER</span>;
      case 'DRIVER':
        return <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">DRIVER</span>;
      default:
        return <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">VIEWER</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white font-mono flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-cyan-400" />
            UTILISATEURS &amp; PERMISSIONS D'ACCÈS
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestion des comptes d'accès entreprise (Pas d'inscription publique — Création par l'Administrateur).
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg flex items-center space-x-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>CRÉER UN UTILISATEUR</span>
          </button>
        )}
      </div>

      {/* Users List Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase border-b border-slate-800">
              <tr>
                <th className="p-4">Utilisateur</th>
                <th className="p-4">Email</th>
                <th className="p-4">Téléphone</th>
                <th className="p-4">Rôle</th>
                <th className="p-4 text-right">Actions / Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40">
                  <td className="p-4 font-bold text-white flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold">
                      {u.full_name[0]}
                    </div>
                    <span>{u.full_name}</span>
                  </td>
                  <td className="p-4 font-mono text-slate-300">{u.email}</td>
                  <td className="p-4 font-mono text-slate-400">{u.phone || 'N/A'}</td>
                  <td className="p-4">{getRoleBadge(u.role)}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => switchRole(u.role)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-cyan-400 border border-slate-700"
                    >
                      Tester la vue {u.role}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          Matrice des Permissions par Rôle
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase border-b border-slate-800">
              <tr>
                <th className="p-3">Module / Action</th>
                <th className="p-3 text-center text-rose-400">ADMIN</th>
                <th className="p-3 text-center text-cyan-400">MANAGER</th>
                <th className="p-3 text-center text-emerald-400">DRIVER</th>
                <th className="p-3 text-center text-slate-400">VIEWER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              <tr>
                <td className="p-3">Live Tracking &amp; Carte GPS</td>
                <td className="p-3 text-center text-emerald-400">✓ Accès complet</td>
                <td className="p-3 text-center text-emerald-400">✓ Accès complet</td>
                <td className="p-3 text-center text-emerald-400">✓ Son véhicule</td>
                <td className="p-3 text-center text-slate-400">Lecture seule</td>
              </tr>
              <tr>
                <td className="p-3">Gestion Véhicules &amp; Chauffeurs</td>
                <td className="p-3 text-center text-emerald-400">✓ CRUD</td>
                <td className="p-3 text-center text-emerald-400">✓ CRUD</td>
                <td className="p-3 text-center text-rose-400">✕ Interdit</td>
                <td className="p-3 text-center text-slate-400">Lecture seule</td>
              </tr>
              <tr>
                <td className="p-3">Association des Boîtiers GPS</td>
                <td className="p-3 text-center text-emerald-400">✓ Autorisé</td>
                <td className="p-3 text-center text-emerald-400">✓ Autorisé</td>
                <td className="p-3 text-center text-rose-400">✕ Interdit</td>
                <td className="p-3 text-center text-rose-400">✕ Interdit</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-rose-400">Immobilisation du Moteur (Engine Stop)</td>
                <td className="p-3 text-center font-bold text-emerald-400">✓ EXCLUSIF ADMIN</td>
                <td className="p-3 text-center text-rose-400">✕ Non autorisé</td>
                <td className="p-3 text-center text-rose-400">✕ Interdit</td>
                <td className="p-3 text-center text-rose-400">✕ Interdit</td>
              </tr>
              <tr>
                <td className="p-3">Gestion Utilisateurs &amp; Audit Log</td>
                <td className="p-3 text-center text-emerald-400">✓ Accès complet</td>
                <td className="p-3 text-center text-rose-400">✕ Interdit</td>
                <td className="p-3 text-center text-rose-400">✕ Interdit</td>
                <td className="p-3 text-center text-rose-400">✕ Interdit</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* User Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-mono">CRÉATION D'UN COMPTE UTILISATEUR</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nom Complet *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Moussa Diagne"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Adresse Email *</label>
                <input
                  type="email"
                  required
                  placeholder="moussa@bcsfleet.sn"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Téléphone</label>
                <input
                  type="text"
                  placeholder="+221 77 000 00 00"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Rôle &amp; Niveau d'accès *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-cyan-500 font-bold"
                >
                  <option value="ADMIN">ADMIN — Accès Complet</option>
                  <option value="MANAGER">MANAGER — Gestion de Flotte</option>
                  <option value="DRIVER">DRIVER — Limité au Véhicule</option>
                  <option value="VIEWER">VIEWER — Lecture Seule</option>
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
                  Créer le Compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
