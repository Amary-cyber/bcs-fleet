import React from 'react';
import { Sidebar } from './Sidebar';
import { X } from 'lucide-react';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onTabSelect: (tabId: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  currentTab,
  onTabSelect,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-64 bg-slate-900 h-full shadow-2xl flex flex-col z-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Fermer le menu"
        >
          <X className="w-5 h-5" />
        </button>

        <Sidebar
          currentTab={currentTab}
          onTabSelect={(id) => {
            onTabSelect(id);
            onClose();
          }}
        />
      </div>
    </div>
  );
};
