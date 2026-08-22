import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Share, 
  PlusSquare, 
  Sparkles, 
  Check, 
  Zap, 
  ShieldCheck,
  Radio,
  MapPin,
  Flame
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: BeforeInstallPromptEvent | null;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt
}) => {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('android');
  const [isStandalone, setIsStandalone] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

    setIsStandalone(standalone);

    if (isIOS) {
      setPlatform('ios');
    } else if (isAndroid) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }
  }, [isOpen]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setInstallSuccess(true);
          setTimeout(() => {
            onClose();
          }, 1800);
        }
      } catch (err) {
        console.warn("Erreur lors de l'installation PWA :", err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-800 overflow-hidden animate-slideUp text-slate-100">
        {/* Modal Header */}
        <div className="bg-slate-950 p-6 text-white relative border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Flame className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-1 bg-cyan-500/20 text-cyan-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-cyan-500/30 mb-0.5">
                <Sparkles className="w-3 h-3" />
                <span>PWA TÉLÉMATIQUE PRO</span>
              </div>
              <h3 className="text-base font-black text-white leading-tight">BCS Fleet PRO</h3>
              <p className="text-[11px] text-slate-400 font-medium">Application Mobile Supervision & GPS</p>
            </div>
          </div>
        </div>

        {/* Tab selector for instructions */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 text-xs font-bold">
          <button
            onClick={() => setPlatform('ios')}
            className={`flex-1 py-3 text-center transition-all ${
              platform === 'ios'
                ? 'bg-slate-900 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            iPhone / Safari
          </button>
          <button
            onClick={() => setPlatform('android')}
            className={`flex-1 py-3 text-center transition-all ${
              platform === 'android'
                ? 'bg-slate-900 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Android
          </button>
          <button
            onClick={() => setPlatform('desktop')}
            className={`flex-1 py-3 text-center transition-all ${
              platform === 'desktop'
                ? 'bg-slate-900 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PC / Mac
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {installSuccess ? (
            <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-2 animate-fadeIn">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto font-black shadow-inner">
                <Check className="w-7 h-7" />
              </div>
              <h4 className="text-base font-black text-emerald-300">Installation confirmée !</h4>
              <p className="text-xs text-emerald-400/80 font-medium">
                BCS Fleet PRO est en cours d'ajout à l'écran d'accueil de votre appareil.
              </p>
            </div>
          ) : isStandalone ? (
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto font-black">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-emerald-300">Application déjà installée !</h4>
              <p className="text-xs text-emerald-400/80 font-medium">
                Vous profitez déjà de la version PWA autonome en plein écran.
              </p>
            </div>
          ) : platform === 'ios' ? (
            /* iOS Instructions */
            <div className="space-y-4">
              <p className="text-xs text-slate-300 font-semibold">
                Dans Safari sur votre iPhone, suivez ces 3 étapes :
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div className="w-7 h-7 rounded-full bg-cyan-600 text-white flex items-center justify-center shrink-0 font-black text-xs">
                    1
                  </div>
                  <div>
                    <div className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>Appuyez sur "Partager"</span>
                      <Share className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Icône carrée avec flèche en bas de Safari.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div className="w-7 h-7 rounded-full bg-cyan-600 text-white flex items-center justify-center shrink-0 font-black text-xs">
                    2
                  </div>
                  <div>
                    <div className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>"Sur l'écran d'accueil"</span>
                      <PlusSquare className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Faites défiler vers le bas et sélectionnez cette option.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/30">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 font-black text-xs">
                    3
                  </div>
                  <div>
                    <div className="text-xs font-black text-emerald-300">Appuyez sur "Ajouter"</div>
                    <p className="text-[11px] text-emerald-400/80 font-medium mt-0.5">
                      L'icône BCS Fleet apparaîtra instantanément sur votre écran !
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : platform === 'android' ? (
            /* Android Instructions */
            <div className="space-y-4">
              <p className="text-xs text-slate-300 font-semibold">
                Installez l'application en un tap pour accéder au suivi GPS plein écran :
              </p>

              {deferredPrompt ? (
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 active:scale-95 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Installer sur l'écran d'accueil</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <div className="w-7 h-7 rounded-full bg-cyan-600 text-white flex items-center justify-center shrink-0 font-black text-xs">
                      1
                    </div>
                    <div>
                      <div className="text-xs font-black text-white">Appuyez sur le menu (3 points)</div>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        En haut à droite de Chrome ou Edge.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <div className="w-7 h-7 rounded-full bg-cyan-600 text-white flex items-center justify-center shrink-0 font-black text-xs">
                      2
                    </div>
                    <div>
                      <div className="text-xs font-black text-white">"Installer l'application"</div>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        Ou "Ajouter à l'écran d'accueil".
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Desktop */
            <div className="space-y-4">
              <p className="text-xs text-slate-300 font-semibold">
                Sur PC / Mac, installez BCS Fleet dans la barre d'adresse du navigateur :
              </p>

              {deferredPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Installer sur PC / Mac</span>
                </button>
              )}

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="font-bold text-slate-200">Astuce :</div>
                <p className="text-[11px]">
                  Cliquez sur le bouton d'installation <span className="inline-block px-1 bg-slate-800 text-cyan-400 rounded font-mono text-[10px]">⊕</span> à droite de la barre d'URL.
                </p>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-400">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>Suivi GPS en temps réel</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Coupure moteur sécurisée</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs active:scale-95 transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};