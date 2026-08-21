import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { useFleet } from '../contexts/FleetContext';
import { useAuth } from '../contexts/AuthContext';
import { Geofence, GeofenceType } from '../types';
import { useLeafletMapResize } from '../components/map/useLeafletMapResize';
import {
  CircleDot,
  Plus,
  Trash2,
  BellRing,
  ShieldAlert,
  CheckCircle2,
  X,
  MapPin,
  Edit,
  Power,
  Layers,
  Check,
} from 'lucide-react';

export const GeofencesPage: React.FC = () => {
  const { geofences, vehicles, addGeofence, updateGeofence, deleteGeofence } = useFleet();
  const { role } = useAuth();
  const isAdminOrManager = role === 'ADMIN' || role === 'MANAGER';

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const drawingLayerRef = useRef<L.LayerGroup | null>(null);

  // Drawing & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [geoName, setGeoName] = useState('');
  const [geoDesc, setGeoDesc] = useState('');
  const [geoCategory, setGeoCategory] = useState('Agence');
  const [geoType, setGeoType] = useState<GeofenceType>('CIRCLE');
  const [geoColor, setGeoColor] = useState('#06B6D4');
  const [speedLimit, setSpeedLimit] = useState(90);
  const [notifyEnter, setNotifyEnter] = useState(true);
  const [notifyExit, setNotifyExit] = useState(true);

  // Drawing Geometry State
  const [circleCenter, setCircleCenter] = useState<[number, number]>([14.6937, -17.4583]);
  const [circleRadius, setCircleRadius] = useState<number>(500);
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([
    [14.698, -17.462],
    [14.702, -17.452],
    [14.691, -17.448],
  ]);

  // Selected Geofence for Map Highlight
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(geofences[0] || null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [14.6937, -17.4583],
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO &copy; OpenStreetMap',
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    drawingLayerRef.current = L.layerGroup([]).addTo(map);
    mapRef.current = map;

    // Multi-pass initial invalidation to ensure full viewport tile loading immediately
    requestAnimationFrame(() => {
      map.invalidateSize({ animate: false });
    });
    setTimeout(() => map.invalidateSize({ animate: false }), 80);
    setTimeout(() => map.invalidateSize({ animate: false }), 250);
    setTimeout(() => map.invalidateSize({ animate: false }), 600);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Universal Resize Hook
  useLeafletMapResize({
    map: mapRef,
    containerRef: mapContainerRef,
    deps: [selectedGeofence, geofences.length],
  });

  // Draw Geofences on Map
  useEffect(() => {
    const map = mapRef.current;
    const layer = drawingLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    geofences.forEach((geo) => {
      if (geo.active === false) return;

      if (geo.type === 'CIRCLE' && 'center' in geo.coordinates) {
        const circle = L.circle(geo.coordinates.center, {
          radius: geo.coordinates.radius,
          color: geo.color || '#06B6D4',
          fillColor: geo.color || '#06B6D4',
          fillOpacity: selectedGeofence?.id === geo.id ? 0.35 : 0.2,
          weight: selectedGeofence?.id === geo.id ? 3 : 2,
        });
        circle.bindTooltip(`<b>${geo.name}</b> (${geo.category})`);
        circle.on('click', () => setSelectedGeofence(geo));
        layer.addLayer(circle);
      } else if (geo.type === 'POLYGON' && Array.isArray(geo.coordinates)) {
        const polygon = L.polygon(geo.coordinates as [number, number][], {
          color: geo.color || '#06B6D4',
          fillColor: geo.color || '#06B6D4',
          fillOpacity: selectedGeofence?.id === geo.id ? 0.35 : 0.2,
          weight: selectedGeofence?.id === geo.id ? 3 : 2,
        });
        polygon.bindTooltip(`<b>${geo.name}</b> (${geo.category})`);
        polygon.on('click', () => setSelectedGeofence(geo));
        layer.addLayer(polygon);
      }
    });

    // Draw vehicles on map preview
    vehicles.forEach((v) => {
      const marker = L.circleMarker([v.current_lat, v.current_lng], {
        radius: 6,
        color: v.comm_status === 'ONLINE' ? '#10B981' : '#64748B',
        fillColor: v.comm_status === 'ONLINE' ? '#10B981' : '#64748B',
        fillOpacity: 1,
      });
      marker.bindTooltip(`<b>${v.name}</b> (${v.plate_number})`);
      layer.addLayer(marker);
    });
  }, [geofences, vehicles, selectedGeofence]);

  // Center map on selected geofence
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedGeofence) return;

    if (selectedGeofence.type === 'CIRCLE' && 'center' in selectedGeofence.coordinates) {
      map.flyTo(selectedGeofence.coordinates.center, 14);
    } else if (selectedGeofence.type === 'POLYGON' && Array.isArray(selectedGeofence.coordinates)) {
      const bounds = L.latLngBounds(selectedGeofence.coordinates as [number, number][]);
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [selectedGeofence]);

  const handleCreateGeofence = (e: React.FormEvent) => {
    e.preventDefault();
    const newGeo: Geofence = {
      id: `geo-${Date.now()}`,
      name: geoName,
      description: geoDesc,
      category: geoCategory,
      type: geoType,
      coordinates: geoType === 'CIRCLE' ? { center: circleCenter, radius: circleRadius } : polygonPoints,
      color: geoColor,
      speed_limit: speedLimit,
      active: true,
      notify_on_enter: notifyEnter,
      notify_on_exit: notifyExit,
      created_at: new Date().toISOString(),
    };

    addGeofence(newGeo);
    setSelectedGeofence(newGeo);
    setIsModalOpen(false);
    setGeoName('');
    setGeoDesc('');
  };

  const handleToggleGeofenceActive = (geo: Geofence) => {
    updateGeofence(geo.id, { active: geo.active === false ? true : false });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white font-mono flex items-center gap-2">
            <CircleDot className="w-6 h-6 text-cyan-400" />
            GESTION DES GÉOFENCES &amp; ZONES VIRTUELLES
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Délimitation des périmètres autorisés (Agences, Dépôts, Zones de livraison) et suivi des entrées/sorties en temps réel.
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

      {/* Main Content Grid: Geofence List + Map View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: List */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
            <span>Zones Enregistrées ({geofences.length})</span>
            <span className="text-[10px] text-cyan-400">● {geofences.filter((g) => g.active !== false).length} Actives</span>
          </div>

          <div className="space-y-3">
            {geofences.map((geo) => (
              <div
                key={geo.id}
                onClick={() => setSelectedGeofence(geo)}
                className={`glass-panel p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  selectedGeofence?.id === geo.id
                    ? 'border-cyan-400 bg-slate-900 shadow-lg shadow-cyan-950/30'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: geo.color }} />
                    <h3 className="font-bold text-sm text-white">{geo.name}</h3>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                    {geo.category}
                  </span>
                </div>

                {geo.description && <p className="text-xs text-slate-400 font-medium">{geo.description}</p>}

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800 font-mono">
                  <span>Type: <strong className="text-white">{geo.type}</strong></span>
                  {geo.speed_limit && <span>Limite: <strong className="text-rose-400">{geo.speed_limit} km/h</strong></span>}
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <div className="flex items-center gap-2">
                    {geo.notify_on_enter && <span className="text-emerald-400 font-bold">✓ Entrée</span>}
                    {geo.notify_on_exit && <span className="text-amber-400 font-bold">✓ Sortie</span>}
                  </div>

                  {isAdminOrManager && (
                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleGeofenceActive(geo)}
                        className={`p-1 rounded text-xs ${geo.active !== false ? 'text-emerald-400' : 'text-slate-500'}`}
                        title={geo.active !== false ? 'Désactiver' : 'Activer'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Supprimer la géofence ${geo.name} ?`)) {
                            deleteGeofence(geo.id);
                          }
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-400"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Map Preview */}
        <div className="lg:col-span-2 glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col space-y-3 h-[580px]">
          <div className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              Visualisation Interactive sur la Carte
            </span>
            {selectedGeofence && (
              <span className="text-cyan-400 font-bold">Zone sélectionnée: {selectedGeofence.name}</span>
            )}
          </div>

          <div className="flex-1 rounded-xl overflow-hidden border border-slate-800 relative">
            <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
          </div>
        </div>
      </div>

      {/* Geofence Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-mono">CRÉER UNE NOUVELLE GÉOFENCE</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGeofence} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Nom de la Zone *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Dépôt Portuaire Dakar"
                    value={geoName}
                    onChange={(e) => setGeoName(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-cyan-500"
                  />
                </div>

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
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Description</label>
                <input
                  type="text"
                  placeholder="Notes &amp; consignes sur ce périmètre..."
                  value={geoDesc}
                  onChange={(e) => setGeoDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Forme</label>
                  <select
                    value={geoType}
                    onChange={(e) => setGeoType(e.target.value as GeofenceType)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-cyan-500 font-mono"
                  >
                    <option value="CIRCLE">Cercle</option>
                    <option value="POLYGON">Polygone</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Couleur du Tracé</label>
                  <input
                    type="color"
                    value={geoColor}
                    onChange={(e) => setGeoColor(e.target.value)}
                    className="w-full h-9 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Vitesse Max (km/h)</label>
                  <input
                    type="number"
                    value={speedLimit}
                    onChange={(e) => setSpeedLimit(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Circle Radius Slider */}
              {geoType === 'CIRCLE' && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-400">Rayon du Périmètre:</span>
                    <span className="text-cyan-400 font-bold">{circleRadius} mètres</span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={5000}
                    step={50}
                    value={circleRadius}
                    onChange={(e) => setCircleRadius(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-slate-400 font-semibold">Déclencheurs d'Alertes Automatiques:</div>
                <label className="flex items-center space-x-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={notifyEnter}
                    onChange={(e) => setNotifyEnter(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-cyan-500"
                  />
                  <span>Alerter à l'ENTRÉE dans la zone</span>
                </label>

                <label className="flex items-center space-x-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={notifyExit}
                    onChange={(e) => setNotifyExit(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-cyan-500"
                  />
                  <span>Alerter à la SORTIE de la zone</span>
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
