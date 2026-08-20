import React, { useState } from 'react';
import { useFleet } from '../contexts/FleetContext';
import { useAuth } from '../contexts/AuthContext';
import {
  SlidersHorizontal,
  Gauge,
  WifiOff,
  Clock,
  Battery,
  BellRing,
  ShieldCheck,
  CheckCircle2,
  Save,
} from 'lucide-react';

export const AlertRulesPage: React.FC = () => {
  const { alertRules, updateAlertRules } = useFleet();
  const { role } = useAuth();
  const isAdminOrManager = role === 'ADMIN' || role === 'MANAGER';

  const [formRules, setFormRules] = useState(alertRules);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateAlertRules(formRules);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white font-mono flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-cyan-400" />
            CONFIGURATION DES RÈGLES D'ALERTES
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Définition des seuils de vitesse, tolérances, temporisations hors-ligne et déclencheurs télématiques.
          </p>
        </div>

        {savedSuccess && (
          <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Règles enregistrées avec succès</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Rule 1: Excès de Vitesse */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Excès de Vitesse</h3>
                  <p className="text-[11px] text-slate-400">Règle de sécurité routière &amp; vitesse maximale</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formRules.notify_speeding}
                  onChange={(e) => setFormRules({ ...formRules, notify_speeding: e.target.checked })}
                  disabled={!isAdminOrManager}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Vitesse Limite (km/h)</label>
                <input
                  type="number"
                  value={formRules.speed_limit_kmh}
                  onChange={(e) => setFormRules({ ...formRules, speed_limit_kmh: Number(e.target.value) })}
                  disabled={!isAdminOrManager}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Tolérance (km/h)</label>
                <input
                  type="number"
                  value={formRules.speed_tolerance_kmh}
                  onChange={(e) => setFormRules({ ...formRules, speed_tolerance_kmh: Number(e.target.value) })}
                  disabled={!isAdminOrManager}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-cyan-500"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              * Déclenchement automatique de l'alerte à partir de {formRules.speed_limit_kmh + formRules.speed_tolerance_kmh} km/h avec idempotence anti-spam.
            </p>
          </div>

          {/* Rule 2: Inactivité / Hors Ligne */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <WifiOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Déconnexion GPS Hors Ligne</h3>
                  <p className="text-[11px] text-slate-400">Perte de signal ou interruption SIM</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formRules.notify_offline}
                  onChange={(e) => setFormRules({ ...formRules, notify_offline: e.target.checked })}
                  disabled={!isAdminOrManager}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>

            <div className="text-xs">
              <label className="block text-slate-400 mb-1 font-semibold">Temporisation Sans Signal (Minutes)</label>
              <input
                type="number"
                value={formRules.offline_threshold_mins}
                onChange={(e) => setFormRules({ ...formRules, offline_threshold_mins: Number(e.target.value) })}
                disabled={!isAdminOrManager}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-cyan-500"
              />
            </div>

            <p className="text-[11px] text-slate-500 italic">
              * Déclenche une alerte si aucun signal GPS n'est reçu depuis {formRules.offline_threshold_mins} minutes.
            </p>
          </div>

          {/* Rule 3: Arrêt Prolongé */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Arrêt Prolongé Anormal</h3>
                  <p className="text-[11px] text-slate-400">Immobilisation excessive moteur coupé/allumé</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formRules.notify_long_stop}
                  onChange={(e) => setFormRules({ ...formRules, notify_long_stop: e.target.checked })}
                  disabled={!isAdminOrManager}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>

            <div className="text-xs">
              <label className="block text-slate-400 mb-1 font-semibold">Durée d'Arrêt Max Autorisée (Minutes)</label>
              <input
                type="number"
                value={formRules.long_stop_threshold_mins}
                onChange={(e) => setFormRules({ ...formRules, long_stop_threshold_mins: Number(e.target.value) })}
                disabled={!isAdminOrManager}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Rule 4: Batterie Faible */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Battery className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Seuil Batterie Faible</h3>
                  <p className="text-[11px] text-slate-400">Batterie interne du boîtier ou véhicule</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formRules.notify_low_battery}
                  onChange={(e) => setFormRules({ ...formRules, notify_low_battery: e.target.checked })}
                  disabled={!isAdminOrManager}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>

            <div className="text-xs">
              <label className="block text-slate-400 mb-1 font-semibold">Seuil de Batterie Minimum (%)</label>
              <input
                type="number"
                value={formRules.low_battery_threshold}
                onChange={(e) => setFormRules({ ...formRules, low_battery_threshold: Number(e.target.value) })}
                disabled={!isAdminOrManager}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        {isAdminOrManager && (
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition-all shadow-xl flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>ENREGISTRER LA CONFIGURATION DES RÈGLES</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
