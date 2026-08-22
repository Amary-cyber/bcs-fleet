import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Flame, Apple, Sparkles } from 'lucide-react';
import { PwaInstallModal } from './PwaInstallModal';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode
    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    );

    if (isStandalone) {
      return;
    }

    if (sessionStorage.getItem('bcs-fleet-install-dismissed')) {
      setDismissed(true);
    }

    const handleOpenInstallModal = () => setShowModal(true);
    window.addEventListener('open-pwa-install-modal', handleOpenInstallModal);

    // Detect Platform
    const ua = navigator.userAgent || '';
    const platformStr = (navigator as any).userAgentData?.platform || navigator.platform || '';
    const isMacDevice = /Mac|Macintosh|MacIntel/.test(platformStr) || /Macintosh/.test(ua);
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    setIsMac(isMacDevice && !isIOSDevice);
    setIsIOS(isIOSDevice);

    if (isIOSDevice || isMacDevice) {
      if (!sessionStorage.getItem('bcs-fleet-install-dismissed')) {
        const timer = setTimeout(() => setShowBanner(true), 3000);
        return () => {
          clearTimeout(timer);
          window.removeEventListener('open-pwa-install-modal', handleOpenInstallModal);
        };
      }
    }

    // Chrome / Android
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!sessionStorage.getItem('bcs-fleet-install-dismissed')) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('open-pwa-install-modal', handleOpenInstallModal);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS || isMac || !deferredPrompt) {
      setShowModal(true);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } catch {
      setShowModal(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    sessionStorage.setItem('bcs-fleet-install-dismissed', 'true');
  };

  return (
    <>
      {/* Floating Antigravity PWA Install Banner */}
      {showBanner && !dismissed && (
        <div className="fixed bottom-20 lg:bottom-6 left-3 right-3 lg:left-auto lg:right-6 lg:w-[420px] bg-slate-900/95 text-white rounded-2xl shadow-2xl shadow-slate-950/90 p-4 z-40 animate-slideUp border border-slate-700/80 backdrop-blur-2xl select-none ring-1 ring-cyan-500/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 p-0.5 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                {isMac ? (
                  <Apple className="w-5 h-5 text-cyan-400" />
                ) : (
                  <Flame className="w-5 h-5 text-cyan-400" />
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-black leading-tight text-white font-mono">BCS FLEET PRO</h4>
                <span className="bg-cyan-500/20 text-cyan-300 text-[9px] font-bold px-1.5 py-0.2 rounded font-mono">
                  {isMac ? 'macOS PWA' : 'PWA'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5 leading-snug">
                {isMac
                  ? 'Installez l\'app sur votre Mac (Dock & Applications) pour un suivi fluide en plein écran.'
                  : isIOS
                  ? 'Ajoutez à votre écran d\'accueil pour suivre votre flotte GPS en plein écran.'
                  : 'Installez l\'application pour un accès direct et sécurisé à votre flotte.'}
              </p>
            </div>
            <button onClick={handleDismiss} className="p-1 text-slate-400 hover:text-white rounded-lg shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2 mt-3 pt-2 border-t border-slate-800/80">
            <button 
              onClick={handleInstallClick}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 active:from-cyan-600 active:to-teal-600 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-cyan-500/20"
            >
              {isMac ? (
                <>
                  <Apple className="w-3.5 h-3.5" />
                  <span>Installer sur Mac</span>
                </>
              ) : isIOS ? (
                <>
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Guide installation iOS</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Installer l'application</span>
                </>
              )}
            </button>
            <button 
              onClick={handleDismiss}
              className="py-2 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold active:scale-95 transition-all"
            >
              Plus tard
            </button>
          </div>
        </div>
      )}

      {/* Guided Modal */}
      <PwaInstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        deferredPrompt={deferredPrompt}
      />
    </>
  );
};