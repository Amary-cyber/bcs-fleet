import React, { useState } from 'react';
import { useFleet } from '../contexts/FleetContext';
import {
  ClipboardList,
  Search,
  Lock,
  UserCheck,
  Shield,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const AuditLogPage: React.FC = () => {
  const { auditLogs } = useFleet();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white font-mono flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-cyan-400" />
            JOURNAL D'ACTIVITÉ &amp; AUDIT LOGS
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registre inaltérable traçant toutes les opérations sensibles effectuées sur la plateforme BCS Fleet.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 font-mono">
          Logs Inaltérables • Mode Lecture Seule
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrer par email, action (ex: IMMOBILIZE)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase border-b border-slate-800">
              <tr>
                <th className="p-4">Horodatage</th>
                <th className="p-4">Utilisateur</th>
                <th className="p-4">Rôle</th>
                <th className="p-4">Action Exécutée</th>
                <th className="p-4">Détails de l'Opération</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredLogs.map((log) => {
                const isSensitive =
                  log.action.includes('IMMOBILIZ') || log.action.includes('DELETE');

                return (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="p-4 text-slate-400 whitespace-nowrap">
                      {format(new Date(log.created_at), 'dd/MM/yyyy — HH:mm:ss', { locale: fr })}
                    </td>
                    <td className="p-4 font-bold text-white">{log.user_email}</td>
                    <td className="p-4 text-cyan-400">{log.user_role}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isSensitive
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 font-sans max-w-md truncate">
                      {log.details ? JSON.stringify(log.details) : 'Aucun détail'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
