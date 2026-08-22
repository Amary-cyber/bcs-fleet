import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TraccarProvider } from './contexts/TraccarContext';
import { FleetProvider, useFleet } from './contexts/FleetContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';

import { TelematicsHeader } from './components/dashboard/TelematicsHeader';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { NotificationDrawer } from './components/layout/NotificationDrawer';
import { EngineImmobilizerModal } from './components/immobilize/EngineImmobilizerModal';
import { InstallPrompt } from './components/pwa/InstallPrompt';
import { CommandPalette } from './components/layout/CommandPalette';
import { MacShortcutsModal } from './components/layout/MacShortcutsModal';
import { useOnlineStatus } from './lib/hooks/useOnlineStatus';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { LiveTrackingPage } from './pages/LiveTrackingPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { DriversPage } from './pages/DriversPage';
import { TripHistoryPage } from './pages/TripHistoryPage';
import { GeofencesPage } from './pages/GeofencesPage';
import { AlertsPage } from './pages/AlertsPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';

import { AuditLogPage } from './pages/AuditLogPage';
import { SettingsPage } from './pages/SettingsPage';
import { AlertRulesPage } from './pages/AlertRulesPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { ExpensesPage } from './pages/ExpensesPage';
import { AlertToastContainer } from './components/layout/AlertToastContainer';
import { Vehicle } from './types';
import { WifiOff, X } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { setSelectedVehicle } = useFleet();
  const { isDrawerOpen, setDrawerOpen } = useNotifications();
  const isOnline = useOnlineStatus();
  
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [selectedVehicleForNav, setSelectedVehicleForNav] = useState<string | null>(null);
  const [immobilizeVehicleTarget, setImmobilizeVehicleTarget] = useState<Vehicle | null>(null);
  const [showOfflineToast, setShowOfflineToast] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);

  // Handle URL shortcut parameters for PWA launch
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) {
      setCurrentTab(tabParam);
    }
  }, []);

  // Offline toast management
  useEffect(() => {
    if (!isOnline) {
      setShowOfflineToast(true);
    } else {
      setShowOfflineToast(false);
    }
  }, [isOnline]);

  const handleNavigateTab = useCallback((tabId: string, vehicleId?: string) => {
    setCurrentTab(tabId);
    if (vehicleId) {
      setSelectedVehicleForNav(vehicleId);
    }
  }, []);

  // Global Keyboard Shortcuts (macOS & PC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // ⌘K : Open Spotlight Command Palette
      if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // ⌘I : Open PWA Install Dialog
      if (isCmdOrCtrl && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('open-pwa-install-modal'));
        return;
      }

      // ⌘/ : Open Shortcuts Help Modal
      if (isCmdOrCtrl && (e.key === '/' || e.key === '?')) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      // ⌘N : Toggle Notification Drawer
      if (isCmdOrCtrl && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setDrawerOpen(!isDrawerOpen);
        return;
      }

      // ⌘1 .. ⌘9 : Tab Switching
      if (isCmdOrCtrl && e.key >= '1' && e.key <= '9') {
        const tabMap: Record<string, string> = {
          '1': 'dashboard',
          '2': 'tracking',
          '3': 'vehicles',
          '4': 'drivers',
          '5': 'history',
          '6': 'alerts',
          '7': 'maintenance',
          '8': 'expenses',
          '9': 'reports',
        };
        const targetTab = tabMap[e.key];
        if (targetTab) {
          e.preventDefault();
          handleNavigateTab(targetTab);
          return;
        }
      }

      // Escape : Close modals
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
        if (isShortcutsModalOpen) setIsShortcutsModalOpen(false);
        if (isMobileMenuOpen) setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, isShortcutsModalOpen, isMobileMenuOpen, isDrawerOpen, setDrawerOpen, handleNavigateTab]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleOpenImmobilizer = (v: Vehicle) => {
    setImmobilizeVehicleTarget(v);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative selection:bg-cyan-500 selection:text-slate-950">
      <AlertToastContainer onNavigateTab={handleNavigateTab} />

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar currentTab={currentTab} onTabSelect={handleNavigateTab} />
      </div>

      {/* Mobile Drawer Navigation */}
      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentTab={currentTab}
        onTabSelect={handleNavigateTab}
      />

      {/* Right Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Offline Banner Toast */}
        {showOfflineToast && (
          <div className="bg-amber-600 text-white px-4 py-1 text-xs font-bold flex items-center justify-between z-50 animate-fadeIn select-none shadow-md">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 animate-pulse" />
              <span>Mode hors-ligne actif. Vos données locales télématiques restent accessibles.</span>
            </div>
            <button onClick={() => setShowOfflineToast(false)} className="p-0.5 hover:bg-amber-700 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <TelematicsHeader
          onVehicleSelect={(v) => {
            setSelectedVehicle(v);
            setCurrentTab('dashboard');
          }}
          onMobileMenuToggle={() => setIsMobileMenuOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-3 lg:p-4 pb-24 lg:pb-4 bg-slate-950/80">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onNavigateTab={handleNavigateTab}
              onOpenImmobilizer={handleOpenImmobilizer}
            />
          )}

          {currentTab === 'tracking' && (
            <LiveTrackingPage
              selectedVehicleIdFromNav={selectedVehicleForNav}
              onNavigateTab={handleNavigateTab}
              onOpenImmobilizer={handleOpenImmobilizer}
            />
          )}

          {currentTab === 'vehicles' && (
            <VehiclesPage
              onNavigateTab={handleNavigateTab}
              onOpenImmobilizer={handleOpenImmobilizer}
            />
          )}

          {currentTab === 'devices' && (
            <VehiclesPage
              onNavigateTab={handleNavigateTab}
              onOpenImmobilizer={handleOpenImmobilizer}
            />
          )}

          {currentTab === 'drivers' && <DriversPage />}

          {(currentTab === 'history' || currentTab === 'replay') && (
            <TripHistoryPage selectedVehicleIdFromNav={selectedVehicleForNav} />
          )}

          {currentTab === 'geofences' && <GeofencesPage />}

          {currentTab === 'alerts' && <AlertsPage onNavigateTab={handleNavigateTab} />}

          {currentTab === 'alert-rules' && <AlertRulesPage />}

          {currentTab === 'reports' && <ReportsPage />}

          {currentTab === 'users' && <UsersPage />}

          {currentTab === 'maintenance' && (
            <MaintenancePage
              initialVehicleId={selectedVehicleForNav || undefined}
              onNavigateTab={handleNavigateTab}
            />
          )}

          {currentTab === 'expenses' && <ExpensesPage />}

          {currentTab === 'audit' && <AuditLogPage />}

          {currentTab === 'settings' && <SettingsPage />}

        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentTab={currentTab}
        onTabSelect={handleNavigateTab}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Slide-over Notifications Feed Drawer */}
      <NotificationDrawer
        onSelectVehicleLocation={(vehicleId) => handleNavigateTab('tracking', vehicleId)}
        onNavigateTab={handleNavigateTab}
      />

      {/* Engine Immobilizer Safety Modal */}
      {immobilizeVehicleTarget && (
        <EngineImmobilizerModal
          vehicle={immobilizeVehicleTarget}
          onClose={() => setImmobilizeVehicleTarget(null)}
        />
      )}

      {/* macOS / Global Spotlight Command Palette (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={handleNavigateTab}
        onOpenImmobilizer={handleOpenImmobilizer}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
      />

      {/* macOS Keyboard Shortcuts Guide Modal (⌘/) */}
      <MacShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Floating PWA Install Prompt Banner & Modal */}
      <InstallPrompt />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TraccarProvider>
          <FleetProvider>
            <NotificationProvider>
              <MainAppContent />
            </NotificationProvider>
          </FleetProvider>
        </TraccarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}