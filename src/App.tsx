import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TraccarProvider } from './contexts/TraccarContext';
import { FleetProvider, useFleet } from './contexts/FleetContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';

import { TelematicsHeader } from './components/dashboard/TelematicsHeader';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { NotificationDrawer } from './components/layout/NotificationDrawer';
import { EngineImmobilizerModal } from './components/immobilize/EngineImmobilizerModal';

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
import { Vehicle } from './types';

const MainAppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { setSelectedVehicle } = useFleet();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [selectedVehicleForNav, setSelectedVehicleForNav] = useState<string | null>(null);
  const [immobilizeVehicleTarget, setImmobilizeVehicleTarget] = useState<Vehicle | null>(null);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleNavigateTab = (tabId: string, vehicleId?: string) => {
    setCurrentTab(tabId);
    if (vehicleId) {
      setSelectedVehicleForNav(vehicleId);
    }
  };

  const handleOpenImmobilizer = (v: Vehicle) => {
    setImmobilizeVehicleTarget(v);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
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
        <TelematicsHeader
          onVehicleSelect={(v) => {
            setSelectedVehicle(v);
            setCurrentTab('dashboard');
          }}
          onMobileMenuToggle={() => setIsMobileMenuOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-3 lg:p-4 bg-slate-950/80">
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

          {currentTab === 'history' && <TripHistoryPage />}

          {currentTab === 'geofences' && <GeofencesPage />}

          {currentTab === 'alerts' && <AlertsPage onNavigateTab={handleNavigateTab} />}

          {currentTab === 'reports' && <ReportsPage />}

          {currentTab === 'users' && <UsersPage />}

          {currentTab === 'audit' && <AuditLogPage />}

          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Slide-over Notifications Feed Drawer */}
      <NotificationDrawer
        onSelectVehicleLocation={(vehicleId) => handleNavigateTab('tracking', vehicleId)}
      />

      {/* Engine Immobilizer Safety Modal */}
      {immobilizeVehicleTarget && (
        <EngineImmobilizerModal
          vehicle={immobilizeVehicleTarget}
          onClose={() => setImmobilizeVehicleTarget(null)}
        />
      )}
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

