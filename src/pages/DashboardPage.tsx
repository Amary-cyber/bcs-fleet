import React, { useState } from 'react';
import { useFleet } from '../contexts/FleetContext';
import { FleetListPanel } from '../components/dashboard/FleetListPanel';
import { TelematicsMapView } from '../components/dashboard/TelematicsMapView';
import { VehicleDetailsPanel } from '../components/dashboard/VehicleDetailsPanel';
import { BottomKpiBar } from '../components/dashboard/BottomKpiBar';
import { AdvancedFiltersDrawer } from '../components/dashboard/AdvancedFiltersDrawer';
import { Vehicle } from '../types';

interface DashboardPageProps {
  onNavigateTab: (tabId: string, vehicleId?: string) => void;
  onOpenImmobilizer: (vehicle: Vehicle) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateTab,
  onOpenImmobilizer,
}) => {
  const { vehicles, geofences, alerts, selectedVehicle, setSelectedVehicle } = useFleet();
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [filterSpeedMin, setFilterSpeedMin] = useState(0);
  const [filterGeofenceId, setFilterGeofenceId] = useState('ALL');
  const [filterVehicleType, setFilterVehicleType] = useState('ALL');

  // Filter vehicles according to advanced filters
  const displayedVehicles = vehicles.filter((v) => {
    const matchesSpeed = filterSpeedMin === 0 || v.current_speed >= filterSpeedMin;
    const matchesType = filterVehicleType === 'ALL' || v.vehicle_type === filterVehicleType;
    return matchesSpeed && matchesType;
  });

  const activeVehicle = selectedVehicle;


  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col justify-between relative overflow-hidden space-y-3">
      {/* 3-Column Telematics Supervision Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 relative">
        {/* Left Panel: Fleet List & Group Accordions */}
        <FleetListPanel
          vehicles={displayedVehicles}
          selectedVehicleId={activeVehicle?.id || null}
          onVehicleSelect={(v) => setSelectedVehicle(v)}
          onOpenAdvancedFilters={() => setIsAdvancedFiltersOpen(true)}
        />

        {/* Center Map: Full Bleed Telematics Map */}
        <div className="flex-1 h-64 lg:h-full relative min-w-0">
          <TelematicsMapView
            vehicles={displayedVehicles}
            geofences={geofences}
            selectedVehicleId={activeVehicle?.id || null}
            onVehicleSelect={(v) => setSelectedVehicle(v)}
            onHistoryClick={(v) => onNavigateTab('history')}
            onImmobilizeClick={onOpenImmobilizer}
          />
        </div>

        {/* Right Panel: Vehicle Telemetry Details (Slide-over on tablet/mobile) */}
        {activeVehicle && (
          <VehicleDetailsPanel
            vehicle={activeVehicle}
            onClose={() => setSelectedVehicle(null)}
            onNavigateTab={onNavigateTab}
            onOpenImmobilizer={onOpenImmobilizer}
            onCenterMap={(v) => setSelectedVehicle(v)}
          />
        )}
      </div>

      {/* Dynamic KPI Bottom Bar */}
      <BottomKpiBar vehicles={vehicles} alerts={alerts} />

      {/* Advanced Filters Modal */}
      <AdvancedFiltersDrawer
        isOpen={isAdvancedFiltersOpen}
        onClose={() => setIsAdvancedFiltersOpen(false)}
        geofences={geofences}
        onApplyFilters={(speed, geoId, vType) => {
          setFilterSpeedMin(speed);
          setFilterGeofenceId(geoId);
          setFilterVehicleType(vType);
        }}
      />
    </div>
  );
};
