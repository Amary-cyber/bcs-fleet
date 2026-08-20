import React, { useState } from 'react';
import { SlidersHorizontal, X, Gauge, MapPin, Radio } from 'lucide-react';
import { Geofence } from '../../types';

interface AdvancedFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  geofences: Geofence[];
  onApplyFilters: (speedMin: number, geofenceId: string, vehicleType: string) => void;
}

export const AdvancedFiltersDrawer: React.FC<AdvancedFiltersDrawerProps> = ({
  isOpen,
  onClose,
  geofences,
  onApplyFilters,
}) => {
  const [speedMin, setSpeedMin] = useState<number>(0);
  const [geofenceId, setGeofenceId] = useState<string>('ALL');
  const [vehicleType, setVehicleType] = useState<string>('ALL');

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyFilters(speedMin, geofenceId, vehicleType);
    onClose();
  };

  const handleReset = () => {
    setSpeedMin(0);
    setGeofenceId('ALL');
    setVehicleType('ALL');
    onApplyFilters(0, 'ALL', 'ALL');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 z-10 space-y-4 select-none">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            FILTRES AVANCÉS DE SUPERVISION
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Speed Threshold Filter */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Vitesse Minimale: {speedMin} km/h
            </label>
            <input
              type="range"
              min={0}
              max={130}
              step={5}
              value={speedMin}
              onChange={(e) => setSpeedMin(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>0 km/h</span>
              <span>50 km/h</span>
              <span>90 km/h (Excès)</span>
              <span>130 km/h</span>
            </div>
          </div>

          {/* Geofence Filter */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-teal-400" /> Présence dans une Géofence
            </label>
            <select
              value={geofenceId}
              onChange={(e) => setGeofenceId(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-cyan-500"
            >
              <option value="ALL">Toutes les zones</option>
              {geofences.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.category})
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle Type Filter */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-amber-400" /> Type de Véhicule
            </label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-cyan-500"
            >
              <option value="ALL">Tous les types</option>
              <option value="PICKUP">Pick-up</option>
              <option value="VAN">Fourgon</option>
              <option value="TRUCK">Camion</option>
              <option value="SEDAN">Berline</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800 text-xs font-bold">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            Réinitialiser
          </button>

          <button
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md"
          >
            Appliquer les Filtres
          </button>
        </div>
      </div>
    </div>
  );
};
