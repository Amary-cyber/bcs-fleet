import React from 'react';
import { X, Command, Key, Sparkles, Flame, Apple } from 'lucide-react';

interface MacShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MacShortcutsModal: React.FC<MacShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcutSections = [
    {
      title: 'Navigation Principale',
      shortcuts: [
        { keys: ['⌘', 'K'], label: 'Spotlight Command Palette (Recherche & Actions)' },
        { keys: ['⌘', '1'], label: 'Ouvrir le Tableau de Bord' },
        { keys: ['⌘', '2'], label: 'Ouvrir le Suivi GPS en Direct (Live Tracking)' },
        { keys: ['⌘', '3'], label: 'Ouvrir la Flotte & Véhicules' },
        { keys: ['⌘', '4'], label: 'Ouvrir la Gestion des Chauffeurs' },
        { keys: ['⌘', '5'], label: 'Ouvrir l\'Historique des Trajets & Replay' },
        { keys: ['⌘', '6'], label: 'Ouvrir le Centre d\'Alertes' },
        { keys: ['⌘', '7'], label: 'Ouvrir le Module Maintenance' },
        { keys: ['⌘', '8'], label: 'Ouvrir Dépenses & TCO' },
        { keys: ['⌘', '9'], label: 'Ouvrir les Rapports & Exports' },
      ],
    },
    {
      title: 'Actions Système & Télématique',
      shortcuts: [
        { keys: ['⌘', 'I'], label: 'Installer l\'application PWA sur Mac (Dock & Applications)' },
        { keys: ['⌘', 'N'], label: 'Ouvrir le tiroir latéral des Notifications' },
        { keys: ['⌘', 'B'], label: 'Replier / Déplier la barre latérale' },
        { keys: ['⌘', '/'], label: 'Afficher ce guide des raccourcis Mac' },
        { keys: ['Esc'], label: 'Fermer les modals, tiroirs et fenêtres surgissantes' },
      ],
    },
    {
      title: 'Cartographie & Replay GPS',
      shortcuts: [
        { keys: ['Space'], label: 'Play / Pause dans le Replay de trajet' },
        { keys: ['←', '→'], label: 'Reculer / Avancer le pas à pas dans le Replay' },
        { keys: ['+', '-'], label: 'Zoomer / Dézoomer sur la carte' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-slate-900/95 text-slate-100 rounded-3xl shadow-2xl border border-slate-700/80 overflow-hidden z-10 animate-slideUp flex flex-col max-h-[85vh] backdrop-blur-2xl ring-1 ring-cyan-500/20">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950 font-black">
              <Command className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-white">Raccourcis Clavier macOS & PC</h3>
                <span className="bg-cyan-500/20 text-cyan-300 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Contrôlez toute votre flotte au doigt et à l'œil</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin">
          {shortcutSections.map((section) => (
            <div key={section.title} className="space-y-2.5">
              <h4 className="text-[11px] font-mono font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                {section.title}
              </h4>

              <div className="bg-slate-950/60 rounded-2xl border border-slate-800/80 divide-y divide-slate-800/60 overflow-hidden">
                {section.shortcuts.map((sc, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-slate-800/40 transition-colors"
                  >
                    <span className="text-slate-300 font-medium">{sc.label}</span>
                    <div className="flex items-center gap-1">
                      {sc.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="min-w-[24px] h-6 px-1.5 inline-flex items-center justify-center font-mono font-bold text-[11px] text-cyan-300 bg-slate-900 border border-slate-700/80 rounded-md shadow-inner"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Apple className="w-3.5 h-3.5 text-slate-400" />
            <span>Sur Windows/Linux, utilisez <kbd className="px-1 py-0.2 bg-slate-800 rounded font-mono text-[10px]">Ctrl</kbd> à la place de <kbd className="px-1 py-0.2 bg-slate-800 rounded font-mono text-[10px]">⌘</kbd></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
