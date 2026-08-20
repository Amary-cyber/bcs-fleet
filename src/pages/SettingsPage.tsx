import React, { useState } from 'react';
import { useFleet } from '../contexts/FleetContext';
import { Settings, Building2, Globe, Save, CheckCircle2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useFleet();

  const [companyName, setCompanyName] = useState(settings.company_name);
  const [companyPhone, setCompanyPhone] = useState(settings.company_phone);
  const [companyEmail, setCompanyEmail] = useState(settings.company_email);
  const [companyAddress, setCompanyAddress] = useState(settings.company_address);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      company_name: companyName,
      company_phone: companyPhone,
      company_email: companyEmail,
      company_address: companyAddress,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white font-mono flex items-center gap-2">
            <Settings className="w-6 h-6 text-cyan-400" />
            PARAMÈTRES DE L'APPLICATION &amp; DE L'ENTREPRISE
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Informations sur l'entreprise BCS Fleet, préférences régionales (Dakar, FCFA) et unités du système.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information Form */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2 border-b border-slate-800 pb-3">
            <Building2 className="w-4 h-4 text-cyan-400" />
            Informations Entreprise
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Nom de l'Entreprise</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-cyan-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Téléphone Officiel</label>
              <input
                type="text"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Email de Contact</label>
              <input
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Adresse du Siège Social</label>
              <textarea
                rows={2}
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-cyan-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Regional & System Preferences Form */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2 border-b border-slate-800 pb-3">
            <Globe className="w-4 h-4 text-cyan-400" />
            Paramètres Régionaux &amp; Unités (Fixés Dakar)
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Unité de Distance</label>
              <input
                type="text"
                disabled
                value="Kilomètres (km)"
                className="w-full p-2.5 bg-slate-950/60 border border-slate-800/60 rounded-xl text-slate-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Unité de Vitesse</label>
              <input
                type="text"
                disabled
                value="km/h"
                className="w-full p-2.5 bg-slate-950/60 border border-slate-800/60 rounded-xl text-slate-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Devise Monétaire</label>
              <input
                type="text"
                disabled
                value="FCFA (XOF)"
                className="w-full p-2.5 bg-slate-950/60 border border-slate-800/60 rounded-xl text-slate-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Fuseau Horaire</label>
              <input
                type="text"
                disabled
                value="Africa/Dakar (GMT+0)"
                className="w-full p-2.5 bg-slate-950/60 border border-slate-800/60 rounded-xl text-slate-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="lg:col-span-2 flex items-center justify-between p-4 glass-panel rounded-2xl border border-slate-800">
          {savedSuccess ? (
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>✓ Paramètres enregistrés avec succès.</span>
            </div>
          ) : (
            <div className="text-xs text-slate-400">
              Modifications enregistrées immédiatement dans la session.
            </div>
          )}

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-xs hover:from-cyan-400 hover:to-teal-400 shadow-lg flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Enregistrer les Paramètres
          </button>
        </div>
      </form>
    </div>
  );
};
