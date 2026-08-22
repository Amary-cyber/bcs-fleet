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
  Flame,
  Apple,
  Laptop,
  Smartphone,
  Dock,
  Command,
  ExternalLink
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
  const [platform, setPlatform] = useState<'mac' | 'ios' | 'android' | 'desktop'>('mac');
  const [isStandalone, setIsStandalone] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [isMacUser, setIsMacUser] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent || '';
    const platformStr = (navigator as any).userAgentData?.platform || navigator.platform || '';
    const isMac = /Mac|Macintosh|MacIntel/.test(platformStr) || /Macintosh/.test(ua);
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

    setIsStandalone(standalone);
    setIsMacUser(isMac);

    if (isMac && !isIOS) {
      setPlatform('mac');
    } else if (isIOS) {
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
      <div className="bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-700/80 overflow-hidden animate-slideUp text-slate-100 ring-1 ring-cyan-500/20">
        
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
              <div className="inline-flex items-center gap-1 bg-cyan-500/20 text-cyan-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-cyan-500/30 mb-0.5 font-mono">
                <Sparkles className="w-3 h-3" />
                <span>PWA TÉLÉMATIQUE PRO</span>
              </div>
              <h3 className="text-base font-black text-white leading-tight">Installation BCS Fleet PRO</h3>
              <p className="text-[11px] text-slate-400 font-medium">Application autonome plein écran pour Mac, PC & Mobile</p>
            </div>
          </div>
        </div>

        {/* Tab selector for instructions */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 text-xs font-bold divide-x divide-slate-800/60">
          <button
            onClick={() => setPlatform('mac')}
            className={`flex-1 py-3 text-center transition-all flex items-center justify-center gap-1.5 ${
              platform === 'mac'
                ? 'bg-slate-900 text-cyan-400 border-b-2 border-cyan-400 font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>macOS / Mac</span>
          </button>
          <button
            onClick={() => setPlatform('ios')}
            className={`flex-1 py-3 text-center transition-all flex items-center justify-center gap-1.5 ${
              platform === 'ios'
                ? 'bg-slate-900 text-cyan-400 border-b-2 border-cyan-400 font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iPhone / Safari</span>
          </button>
          <button
            onClick={() => setPlatform('android')}
            className={`flex-1 py-3 text-center transition-all flex items-center justify-center gap-1.5 ${
              platform === 'android'
                ? 'bg-slate-900 text-cyan-400 border-b-2 border-cyan-400 font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>
          <button
            onClick={() => setPlatform('desktop')}
            className={`flex-1 py-3 text-center transition-all flex items-center justify-center gap-1.5 ${
              platform === 'desktop'
                ? 'bg-slate-900 text-cyan-400 border-b-2 border-cyan-400 font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Windows / PC</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto scrollbar-thin">
          {installSuccess ? (
            <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-2 animate-fadeIn">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto font-black shadow-inner">
                <Check className="w-7 h-7" />
              </div>
              <h4 className="text-base font-black text-emerald-300">Installation confirmée !</h4>
              <p className="text-xs text-emerald-400/80 font-medium">
                BCS Fleet PRO a été ajouté à vos applications et au Dock de votre appareil.
              </p>
            </div>
          ) : isStandalone ? (
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto font-black">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-emerald-300">Application déjà installée en mode natif !</h4>
              <p className="text-xs text-emerald-400/80 font-medium">
                Vous utilisez déjà BCS Fleet PRO dans sa fenêtre indépendante PWA haute performance.
              </p>
            </div>
          ) : platform === 'mac' ? (
            /* macOS Instructions */
            <div className="space-y-4">
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                    <Apple className="w-4 h-4 text-white" />
                    <span>Intégration macOS Native (Dock & Spotlight)</span>
                  </h4>
                  <p className="text-[11px] text-cyan-200/70 mt-0.5">
                    Fenêtre dédiée sans barre d'adresse, raccourcis clavier ⌘K et notifications système.
                  </p>
                </div>
              </div>

              {deferredPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 active:scale-95 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Installer en 1 clic sur mon Mac</span>
                </button>
              )}

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                  <div className="text-xs font-black text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center font-mono text-[10px]">A</span>
                      <span>Dans Safari sur macOS (Sonoma ou ultérieur) :</span>
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono">Recommandé</span>
                  </div>
                  <ol className="text-[11px] text-slate-300 space-y-1.5 pl-6 list-decimal font-medium">
                    <li>Dans la barre des menus en haut, cliquez sur <strong className="text-white">Fichier</strong>.</li>
                    <li>Sélectionnez <strong className="text-cyan-400">"Ajouter au Dock..."</strong> (ou "Ajouter à l'écran d'accueil").</li>
                    <li>Cliquez sur <strong className="text-emerald-400">Ajouter</strong> : BCS Fleet s'ouvrira comme une vraie application Mac !</li>
                  </ol>
                </div>

                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                  <div className="text-xs font-black text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center font-mono text-[10px]">B</span>
                    <span>Dans Google Chrome, Brave ou Edge sur Mac :</span>
                  </div>
                  <ol className="text-[11px] text-slate-300 space-y-1.5 pl-6 list-decimal font-medium">
                    <li>Regardez à droite de la barre d'adresse URL.</li>
                    <li>Cliquez sur l'icône d'installation <kbd className="px-1 py-0.2 bg-slate-800 text-cyan-400 rounded font-mono text-[10px]">⊕</kbd> ou <strong className="text-cyan-400">"Installer BCS Fleet PRO"</strong>.</li>
                    <li>L'application s'ajoute immédiatement à votre dossier <code className="text-emerald-400">/Applications</code> et au Launchpad.</li>
                  </ol>
                </div>
              </div>
            </div>
          ) : platform === 'ios' ? (
            /* iOS Instructions */
            <div className="space-y-4">
              <p className="text-xs text-slate-300 font-semibold">
                Dans Safari sur votre iPhone ou iPad, suivez ces 3 étapes simples :
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div className="w-7 h-7 rounded-full bg-cyan-600 text-white flex items-center justify-center shrink-0 font-black text-xs">
                    1
                  </div>
                  <div>
                    <div className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>Appuyez sur le bouton "Partager"</span>
                      <Share className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Icône carrée avec flèche vers le haut dans Safari.
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
                      Faites défiler la liste des options et appuyez dessus.
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
                      L'icône BCS Fleet apparaîtra instantanément sur votre écran d'accueil !
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : platform === 'android' ? (
            /* Android Instructions */
            <div className="space-y-4">
              <p className="text-xs text-slate-300 font-semibold">
                Installez l'application en un clic pour accéder au suivi GPS plein écran :
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
                        En haut à droite de Google Chrome.
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
            /* Desktop Windows/Linux */
            <div className="space-y-4">
              <p className="text-xs text-slate-300 font-semibold">
                Sur Windows et Linux, installez l'application via votre navigateur :
              </p>

              {deferredPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Installer sur PC</span>
                </button>
              )}

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="font-bold text-slate-200">Installation rapide :</div>
                <p className="text-[11px]">
                  Cliquez sur le bouton d'installation <span className="inline-block px-1 bg-slate-800 text-cyan-400 rounded font-mono text-[10px]">⊕</span> situé à droite de la barre d'adresse de Chrome ou Edge.
                </p>
              </div>
            </div>
          )}

          {/* Features highlight */}
          <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-400">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>Télématique Traccar 6.5 Live</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Coupure moteur sécurisée</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
          <div className="text-[10px] text-slate-500 font-mono hidden sm:block">
            {isMacUser ? 'Optimisé pour macOS Sonoma & Sequoia' : 'Application PWA Universelle'}
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs active:scale-95 transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};