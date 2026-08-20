import React, { useState } from 'react';
import { useFleet } from '../contexts/FleetContext';
import { useAuth } from '../contexts/AuthContext';
import { Geofence, GeofenceType } from '../types';
import { MapView } from '../components/map/MapView';
import {
  CircleDot,
  Plus,
  Trash2,
  BellRing,
  ShieldAlert,
  CheckCircle2,
  X,
  MapPin,
} from 'lucide-react';

export const GeofencesPage: React.FC = () => {
  const { geofences, vehicles, addGeofence, deleteGeofence } = useFleet();
  const { role } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [geoName, setGeoName] = useState('');
  const [geoCategory, setGeoCategory] = useState('Agence');
  const [geoType, setGeoType] = useState<GeofenceType>('CIRCLE');
  const [geoColor, setGeoColor] = useState('#3B82F6');
  const [speedLimit, setSpeedLimit] = useState(90);
  const [notifyEnter, setNotifyEnter] = useState(true);
  const [notifyExit, setNotifyExit] = useState(true);

  const isAdminOrManager = role === 'ADMIN' || role === 'MANAGER';

  const handleCreateGeofence = (e: React.FormEvent) => {
    e.preventDefault();
    const newGeo: Geofence = {
      id: `geo-${Date.now()}`,
      name: geoName,
      category: geoCategory,
      type: geoType,
      coordinates:
        geoType === 'CIRCLE'
          ? { center: [14.6937, -17.4583], radius: 600 }
          : [
              [14.6980, -17.4620],
              [14.7020, -17.4520],
              [14.6910, -17.4480],
            ],
      color: geoColor,
      speed_limit: speedLimit,
      notify_on_enter: notifyEnter,
      notify_on_exit: notifyExit,
    };

    addGeofence(newGeo);
    setIsModalOpen(false);
    setGeoName('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white font-mono flex items-center gap-2">
            <CircleDot className="w-6 h-6 text-cyan-400" />
            GÉOFENCES &amp; ZONES GÉOGRAPHIQUES
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Délimitation des périmètres autorisés, dépôts, agences et déclenchement d'alertes d'entrée/sortie.
          </p>
        </div>

        {isAdminOrManager && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg flex items-center space-x-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>CRÉER UNE GÉOFENCE</span>
          </button>
        )}
      </div>

      {/* Main Grid: Geofence List + Map Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Geofences List */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
            Zones Enregistrées ({geofences.length})
          </div>

          <div className="space-y-3">
            {geofences.map((geo) => (
              <div
                key={geo.id}
                className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: geo.color }}
                    />
                    <h3 className="font-bold text-sm text-white">{geo.name}</h3>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                    {geo.category}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span>Type: <strong className="text-white">{geo.type}</strong></span>
                  {geo.speed_limit && (
                    <span>Limite: <strong className="text-rose-400">{geo.speed_limit} km/h</strong></span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <div className="flex items-center gap-2">
                    {geo.notify_on_enter && <span className="text-emerald-400">✓ Entrée</span>}
                    {geo.notify_on_exit && <span className="text-amber-400">✓ Sortie</span>}
                  </div>

                  {isAdminOrManager && (
                    <button
                      onClick={() => deleteGeofence(geo.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Map Preview */}
        <div className="lg:col-span-2 glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col space-y-3 h-[560px]">
          <div className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            Visualisation des Zones sur la Carte
          </div>

          <div className="flex-1 rounded-xl overflow-hidden border border-slate-800">
            <MapView vehicles={vehicles} geofences={geofences} />
          </div>
        </div>
      </div>

      {/* Geofence Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-mono">CRÉER UNE NOUVELLE GÉOFENCE</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGeofence} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Nom de la Zone *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Zone Portuaire Dakar"
                  value={geoName}
                  onChange={(e) => setGeoName(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Catégorie</label>
                  <select
                    value={geoCategory}
                    onChange={(e) => setGeoCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-cyan-500"
                  >
                    <option value="Agence">Agence</option>
                    <option value="Entrepôt">Entrepôt</option>
                    <option value="Zone de livraison">Zone de livraison</option>
                    <option value="Zone interdite">Zone interdite</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Forme Géométrique</label>
                  <select
                    value={geoType}
                    onChange={(e) => setGeoType(e.target.value as GeofenceType)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-cyan-500"
                  >
                    <option value="CIRCLE">Cercle</option>
                    <option value="POLYGON">Polygone</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Couleur du tracé</label>
                  <input
                    type="color"
                    value={geoColor}
                    onChange={(e) => setGeoColor(e.target.value)}
                    className="w-full h-9 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Vitesse Max Autorisée (km/h)</label>
                  <input
                    type="number"
                    value={speedLimit}
                    onChange={(e) => setSpeedLimit(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-slate-400 font-semibold">Déclencheurs d'Alertes:</div>
                <label className="flex items-center space-x-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={notifyEnter}
                    onChange={(e) => setNotifyEnter(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
                  />
                  <span>Notifier à l'ENTRÉE dans la zone</span>
                </label>

                <label className="flex items-center space-x-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={notifyExit}
                    onChange={(e) => setNotifyExit(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
                  />
                  <span>Notifier à la SORTIE de la zone</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400"
                >
                  Créer la Géofence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
