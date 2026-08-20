import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { Flame, Lock, Mail, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('admin@bcsfleet.sn');
  const [password, setPassword] = useState('password123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const success = await login(email, password);
    if (!success) {
      setErrorMsg('Identifiants incorrects. Veuillez vérifier votre adresse email et mot de passe.');
    }
  };

  const handleQuickLogin = (demoRole: UserRole) => {
    const demoEmail =
      demoRole === 'ADMIN'
        ? 'admin@bcsfleet.sn'
        : demoRole === 'MANAGER'
        ? 'manager.logistique@bcsfleet.sn'
        : demoRole === 'DRIVER'
        ? 'driver.mamadou@bcsfleet.sn'
        : 'viewer.superviseur@bcsfleet.sn';

    setEmail(demoEmail);
    setPassword('password123');
    login(demoEmail, 'password123');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow Overlay */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-card p-8 rounded-3xl border border-slate-800 shadow-2xl relative z-10 space-y-6">
        {/* Brand Logo Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 p-0.5 shadow-xl shadow-cyan-500/20 mx-auto">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Flame className="w-7 h-7 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white font-mono tracking-wider">
            BCS <span className="text-cyan-400">FLEET</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Plateforme Entreprise de Tracking GPS &amp; Gestion de Flotte
          </p>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Email Professionnel</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@bcsfleet.sn"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-slate-300 font-semibold">Mot de Passe</label>
              <a href="#" onClick={(e) => { e.preventDefault(); alert('Veuillez contacter l\'administrateur BCS Fleet pour réinitialiser votre mot de passe.'); }} className="text-[11px] text-cyan-400 hover:underline">
                Mot de passe oublié ?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 text-slate-400 pt-1">
            <input
              type="checkbox"
              id="remember"
              defaultChecked
              className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
            />
            <label htmlFor="remember" className="text-[11px]">Rester connecté sur cet appareil</label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-cyan-950/50 flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <span>Connexion en cours...</span>
            ) : (
              <>
                <span>SE CONNECTER À L'ESPACE FLOTTE</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Login Switcher */}
        <div className="border-t border-slate-800/80 pt-4 space-y-2">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
            Connexion Rapide Démo (Test des Rôles)
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <button
              onClick={() => handleQuickLogin('ADMIN')}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold"
            >
              ADMIN (Accès Total)
            </button>
            <button
              onClick={() => handleQuickLogin('MANAGER')}
              className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold"
            >
              MANAGER (Gestion)
            </button>
            <button
              onClick={() => handleQuickLogin('DRIVER')}
              className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold"
            >
              DRIVER (Chauffeur)
            </button>
            <button
              onClick={() => handleQuickLogin('VIEWER')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
            >
              VIEWER (Lecture Seule)
            </button>
          </div>
        </div>

        {/* Notice */}
        <div className="text-[10px] text-slate-500 text-center leading-relaxed">
          Application single-tenant entreprise. Pas d'inscription publique. Les comptes sont créés par l'administrateur système.
        </div>
      </div>
    </div>
  );
};
