import React, { useState } from 'react';
import { Vehicle } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useFleet } from '../../contexts/FleetContext';
import { ShieldAlert, AlertOctagon, CheckCircle2, Lock, Unlock, X } from 'lucide-react';

interface EngineImmobilizerModalProps {
  vehicle: Vehicle | null;
  onClose: () => void;
}

export const EngineImmobilizerModal: React.FC<EngineImmobilizerModalProps> = ({
  vehicle,
  onClose,
}) => {
  const { role } = useAuth();
  const { toggleEngineImmobilizer } = useFleet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!vehicle) return null;

  const isAlreadyLocked = vehicle.engine_locked;
  const isAdmin = role === 'ADMIN';
  const isMoving = vehicle.current_speed > 0;

  const handleConfirm = async () => {
    if (!isAdmin) return;
    if (isMoving) return;

    setIsSubmitting(true);
    const targetState = !isAlreadyLocked;
    const success = await toggleEngineImmobilizer(vehicle.id, targetState);
    setIsSubmitting(false);

    if (success) {
      setSuccessMessage(
        targetState
          ? `✓ Ordre d'immobilisation envoyé avec succès au relais GPS de ${vehicle.name} (${vehicle.plate_number}).`
          : `✓ Ordre de déblocage du moteur envoyé avec succès à ${vehicle.name} (${vehicle.plate_number}).`
      );
      setTimeout(() => {
        onClose();
      }, 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />

      {/* Dialog Box */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden z-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {successMessage ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-white">Commande Exécutée</h3>
            <p className="text-sm text-slate-300 px-4">{successMessage}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header Title */}
            <div className="flex items-center space-x-3">
              <div
                className={`p-3 rounded-xl ${
                  isAlreadyLocked
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}
              >
                {isAlreadyLocked ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {isAlreadyLocked ? 'Autoriser le Démarrage' : 'IMMOBILISATION DU VÉHICULE'}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {vehicle.name} • {vehicle.plate_number}
                </p>
              </div>
            </div>

            {/* Safety Condition Alerts */}
            {isMoving ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs leading-relaxed space-y-2">
                <div className="flex items-center space-x-2 font-bold text-rose-400">
                  <AlertOctagon className="w-5 h-5 shrink-0" />
                  <span>SÉCURITÉ STRICTE ENCLENCHÉE</span>
                </div>
                <p>
                  Le véhicule circule actuellement à <strong>{vehicle.current_speed} km/h</strong>.
                  Pour éviter tout risque d'accident grave, l'immobilisation moteur est
                  <strong className="underline"> STRICTEMENT INTERDITE </strong> en mouvement.
                </p>
                <p className="text-[11px] text-slate-400">
                  Attendez l'arrêt complet du véhicule (0 km/h) avant d'envoyer la commande.
                </p>
              </div>
            ) : !isAdmin ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs leading-relaxed flex items-start space-x-2">
                <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <div className="font-bold">PERMISSION ADMIN REQUISE</div>
                  <p>
                    Seuls les utilisateurs avec le rôle <strong>ADMIN</strong> sont autorisés à
                    envoyer une commande d'immobilisation de relais GPS.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3 text-xs">
                <div className="flex items-center justify-between text-slate-300 border-b border-slate-700/60 pb-2">
                  <span>Statut Vitesse:</span>
                  <span className="font-mono font-bold text-emerald-400">0 km/h (À l'arrêt ✓)</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 border-b border-slate-700/60 pb-2">
                  <span>Chauffeur Associé:</span>
                  <span className="font-semibold text-white">{vehicle.driver_name || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Traceur GPS IMEI:</span>
                  <span className="font-mono text-cyan-400">{vehicle.device_imei || 'N/A'}</span>
                </div>

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] leading-relaxed">
                  ⚠ <strong>AVERTISSEMENT :</strong> Cette commande transmettra un ordre de coupure
                  de relais démarreur au traceur GPS. Le véhicule ne pourra plus démarrer jusqu'à
                  l'envoi d'une commande inverse d'autorisation.
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                ANNULER
              </button>

              <button
                type="button"
                disabled={isMoving || !isAdmin || isSubmitting}
                onClick={handleConfirm}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center space-x-2 ${
                  isAlreadyLocked
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? (
                  <span>Transmission...</span>
                ) : isAlreadyLocked ? (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>CONFIRMER L'AUTORISATION</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>CONFIRMER L'IMMOBILISATION</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
