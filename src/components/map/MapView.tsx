import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Vehicle, Geofence } from '../../types';
import {
  Layers,
  Maximize,
  Minimize,
  Crosshair,
  MapPin,
  Eye,
  Radio,
  Compass,
  Gauge,
  BatteryCharging,
  Shield,
  History,
  Lock,
  Search,
} from 'lucide-react';

export type MapTileLayerType = 'voyager' | 'dark' | 'satellite' | 'osm';

interface MapViewProps {
  vehicles: Vehicle[];
  geofences?: Geofence[];
  selectedVehicleId?: string | null;
  onVehicleSelect?: (vehicle: Vehicle) => void;
  onHistoryClick?: (vehicle: Vehicle) => void;
  onImmobilizeClick?: (vehicle: Vehicle) => void;
  center?: [number, number];
  zoom?: number;
  isFollowMode?: boolean;
  onToggleFollowMode?: (enabled: boolean) => void;
}

const TILE_LAYERS: Record<
  MapTileLayerType,
  { name: string; url: string; attribution: string; subdomains?: string[] }
> = {
  voyager: {
    name: 'Standard (Voyager)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &copy; OpenStreetMap',
    subdomains: ['a', 'b', 'c', 'd'],
  },
  dark: {
    name: 'Sombre (Dark Matter)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &copy; OpenStreetMap',
    subdomains: ['a', 'b', 'c', 'd'],
  },
  satellite: {
    name: 'Satellite (Imagerie ESRI)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &copy; DigitalGlobe &copy; GeoEye',
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    subdomains: ['a', 'b', 'c'],
  },
};

export const MapView: React.FC<MapViewProps> = ({
  vehicles,
  geofences = [],
  selectedVehicleId,
  onVehicleSelect,
  onHistoryClick,
  onImmobilizeClick,
  center = [14.7869, -17.3767], // Dakar / Guédiawaye Default
  zoom = 13,
  isFollowMode = false,
  onToggleFollowMode,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const geofenceLayersRef = useRef<L.LayerGroup | null>(null);

  const [activeLayer, setActiveLayer] = useState<MapTileLayerType>('voyager');
  const [showLayerSelector, setShowLayerSelector] = useState<boolean>(false);
  const [showGeofences, setShowGeofences] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isFollowSuspended, setIsFollowSuspended] = useState<boolean>(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false,
    });

    const initialLayerConfig = TILE_LAYERS[activeLayer];
    const initialTileLayer = L.tileLayer(initialLayerConfig.url, {
      attribution: initialLayerConfig.attribution,
      subdomains: initialLayerConfig.subdomains || 'abc',
      maxZoom: 19,
    }).addTo(map);

    activeTileLayerRef.current = initialTileLayer;
    geofenceLayersRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Detect user pan/drag to suspend auto-follow
    map.on('dragstart', () => {
      if (isFollowMode) {
        setIsFollowSuspended(true);
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Tile Layer Instantly
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }

    const cfg = TILE_LAYERS[activeLayer];
    const newLayer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      subdomains: cfg.subdomains || 'abc',
      maxZoom: 19,
    }).addTo(map);

    activeTileLayerRef.current = newLayer;
  }, [activeLayer]);

  // Fit bounds to entire active fleet
  const fitFleetBounds = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || vehicles.length === 0) return;

    const bounds = L.latLngBounds([]);
    vehicles.forEach((v) => {
      if (v.current_lat && v.current_lng) {
        bounds.extend([v.current_lat, v.current_lng]);
      }
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      setIsFollowSuspended(false);
    }
  }, [vehicles]);

  // Render Geofences Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !geofenceLayersRef.current) return;

    geofenceLayersRef.current.clearLayers();
    if (!showGeofences) return;

    geofences.forEach((geo) => {
      if (geo.type === 'CIRCLE') {
        const coords = geo.coordinates as { center: [number, number]; radius: number };
        if (coords.center && coords.radius) {
          const circle = L.circle(coords.center, {
            radius: coords.radius,
            color: geo.color || '#3B82F6',
            fillColor: geo.color || '#3B82F6',
            fillOpacity: 0.18,
            weight: 2,
          });
          circle.bindTooltip(`<b>Zone: ${geo.name}</b><br/>Rayon: ${coords.radius}m`);
          geofenceLayersRef.current?.addLayer(circle);
        }
      } else if (geo.type === 'POLYGON') {
        const coords = geo.coordinates as [number, number][];
        if (Array.isArray(coords) && coords.length > 0) {
          const polygon = L.polygon(coords, {
            color: geo.color || '#3B82F6',
            fillColor: geo.color || '#3B82F6',
            fillOpacity: 0.18,
            weight: 2,
          });
          polygon.bindTooltip(`<b>Zone: ${geo.name}</b><br/>Catégorie: ${geo.category}`);
          geofenceLayersRef.current?.addLayer(polygon);
        }
      }
    });
  }, [geofences, showGeofences]);

  // Update or Create Vehicle Markers (Differential Render)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMarkerIds = new Set<string>();

    vehicles.forEach((vehicle) => {
      currentMarkerIds.add(vehicle.id);

      const statusColor =
        vehicle.status === 'MOVING'
          ? '#10B981'
          : vehicle.status === 'STOPPED'
          ? '#F59E0B'
          : vehicle.status === 'ALERT'
          ? '#EF4444'
          : '#64748B';

      const statusBadgeText =
        vehicle.status === 'MOVING'
          ? 'En mouvement'
          : vehicle.status === 'STOPPED'
          ? 'À l\'arrêt'
          : vehicle.status === 'ALERT'
          ? 'ALERTE'
          : 'Hors ligne';

      const heading = vehicle.current_heading || 0;
      const speed = vehicle.current_speed || 0;

      // Custom Traccar-Styled Marker HTML
      const iconHtml = `
        <div class="relative group cursor-pointer z-20">
          <!-- Plate and Speed Float Badge -->
          <div class="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-slate-950/95 text-[10px] font-mono font-bold text-white border shadow-2xl whitespace-nowrap z-20 flex items-center gap-1.5" style="border-color: ${statusColor}">
            <span class="text-cyan-400 font-black tracking-wider">${vehicle.plate_number}</span>
            ${
              speed > 0
                ? `<span class="text-white border-l border-slate-700 pl-1.5 font-bold">${speed} km/h</span>`
                : `<span class="text-amber-400/90 border-l border-slate-700 pl-1.5 text-[9px]">0 km/h</span>`
            }
          </div>

          ${
            vehicle.status === 'MOVING'
              ? `<div class="absolute -inset-1.5 rounded-full bg-emerald-500/30 animate-ping opacity-75"></div>`
              : vehicle.status === 'ALERT'
              ? `<div class="absolute -inset-2 rounded-full bg-rose-500/40 animate-ping opacity-75"></div>`
              : ''
          }

          <!-- Directional Vehicle Icon with Course Rotation -->
          <div class="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border-2 shadow-2xl transition-transform" style="border-color: ${statusColor}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 transition-transform duration-300" style="color: ${statusColor}; transform: rotate(${heading}deg);">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
            </svg>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'traccar-vehicle-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      let marker = markersRef.current.get(vehicle.id);

      if (marker) {
        marker.setLatLng([vehicle.current_lat, vehicle.current_lng]);
        marker.setIcon(customIcon);
      } else {
        marker = L.marker([vehicle.current_lat, vehicle.current_lng], { icon: customIcon });

        // Build Traccar-SaaS Interactive Popup
        const popupContent = document.createElement('div');
        popupContent.className = 'p-1 text-slate-100 min-w-[240px] font-sans';

        const lastTimeStr = vehicle.last_position_time
          ? new Date(vehicle.last_position_time).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZone: 'Africa/Dakar',
            })
          : 'N/D';

        const batteryStr =
          vehicle.battery_level !== null && vehicle.battery_level !== undefined
            ? `${vehicle.battery_level}%`
            : 'N/D';

        popupContent.innerHTML = `
          <div class="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-2">
            <div>
              <h3 class="font-bold text-sm text-cyan-400 font-mono">${vehicle.name}</h3>
              <p class="text-[11px] text-slate-400 font-semibold">${vehicle.plate_number} • ${vehicle.brand} ${vehicle.model}</p>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold" style="background-color: ${statusColor}20; color: ${statusColor}; border: 1px solid ${statusColor}40">
              ${statusBadgeText}
            </span>
          </div>

          <div class="space-y-1.5 text-xs font-mono text-slate-300">
            <div class="flex justify-between"><span class="text-slate-400">Vitesse Traccar:</span> <strong class="text-white">${speed} km/h</strong></div>
            <div class="flex justify-between"><span class="text-slate-400">Cap / Direction:</span> <span>${heading}° (${getCompassLabel(heading)})</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Chauffeur:</span> <span class="text-cyan-300">${vehicle.driver_name || 'Non assigné'}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Batterie Télémétrique:</span> <span class="text-emerald-400">${batteryStr}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Dernière Réception:</span> <span class="text-slate-300">${lastTimeStr}</span></div>
            <div class="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800">
              <span>GPS:</span> <span>${vehicle.current_lat.toFixed(5)}, ${vehicle.current_lng.toFixed(5)}</span>
            </div>
          </div>

          <div class="mt-3 pt-2 border-t border-slate-700/80 flex items-center justify-between gap-1.5">
            <button id="pop-follow-${vehicle.id}" class="flex-1 px-2 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-[10px] font-bold text-cyan-300 border border-cyan-500/40 transition-colors">
              Suivre
            </button>
            <button id="pop-hist-${vehicle.id}" class="flex-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 border border-slate-700 transition-colors">
              Replay
            </button>
            <button id="pop-immob-${vehicle.id}" class="flex-1 px-2 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-[10px] font-bold text-rose-400 border border-rose-500/30 transition-colors">
              Relais
            </button>
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('click', () => {
          if (onVehicleSelect) onVehicleSelect(vehicle);
        });

        marker.on('popupopen', () => {
          const btnFollow = document.getElementById(`pop-follow-${vehicle.id}`);
          const btnHist = document.getElementById(`pop-hist-${vehicle.id}`);
          const btnImmob = document.getElementById(`pop-immob-${vehicle.id}`);

          if (btnFollow) {
            btnFollow.onclick = () => {
              if (onToggleFollowMode) onToggleFollowMode(true);
              setIsFollowSuspended(false);
              if (onVehicleSelect) onVehicleSelect(vehicle);
            };
          }
          if (btnHist && onHistoryClick) {
            btnHist.onclick = () => onHistoryClick(vehicle);
          }
          if (btnImmob && onImmobilizeClick) {
            btnImmob.onclick = () => onImmobilizeClick(vehicle);
          }
        });

        marker.addTo(map);
        markersRef.current.set(vehicle.id, marker);
      }
    });

    // Cleanup decommissioned markers
    markersRef.current.forEach((marker, id) => {
      if (!currentMarkerIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });
  }, [vehicles, onVehicleSelect, onHistoryClick, onImmobilizeClick, onToggleFollowMode]);

  // Handle Live Follow & Focus Selected Vehicle
  useEffect(() => {
    if (!selectedVehicleId || !mapInstanceRef.current) return;
    const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (!vehicle) return;

    if (isFollowMode && !isFollowSuspended) {
      mapInstanceRef.current.panTo([vehicle.current_lat, vehicle.current_lng], {
        animate: true,
        duration: 0.5,
      });
    }
  }, [selectedVehicleId, vehicles, isFollowMode, isFollowSuspended]);

  // Helper compass label
  function getCompassLabel(deg: number): string {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    return dirs[Math.round(deg / 45) % 8];
  }

  // Toggle Fullscreen mode
  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen().catch((err) => console.warn(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.warn(err));
      setIsFullscreen(false);
    }
  };

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950">
      {/* Map Target DOM */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[500px]" />

      {/* Floating Map Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col space-y-2">
        {/* Layer Selector Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowLayerSelector(!showLayerSelector)}
            className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border border-slate-700 shadow-2xl backdrop-blur-md transition-all"
            title="Changer le fond de carte"
          >
            <Layers className="w-4 h-4" />
          </button>

          {showLayerSelector && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl p-2 z-30 space-y-1 text-xs backdrop-blur-xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Fonds Cartographiques
              </div>
              {(Object.keys(TILE_LAYERS) as MapTileLayerType[]).map((layerKey) => (
                <button
                  key={layerKey}
                  onClick={() => {
                    setActiveLayer(layerKey);
                    setShowLayerSelector(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                    activeLayer === layerKey
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{TILE_LAYERS[layerKey].name}</span>
                  {activeLayer === layerKey && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center Whole Fleet */}
        <button
          onClick={fitFleetBounds}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-2xl backdrop-blur-md transition-all"
          title="Centrer sur tous les véhicules"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        {/* Toggle Geofences */}
        <button
          onClick={() => setShowGeofences(!showGeofences)}
          className={`p-2.5 rounded-xl border shadow-2xl backdrop-blur-md transition-all ${
            showGeofences
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
              : 'bg-slate-900/90 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
          title={showGeofences ? 'Masquer les géofences' : 'Afficher les géofences'}
        >
          <Shield className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 shadow-2xl backdrop-blur-md transition-all"
          title="Mode Plein Écran"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>

      {/* Floating Zoom Controls (Bottom Right) */}
      <div className="absolute bottom-6 right-4 z-20 flex flex-col space-y-1.5">
        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="w-8 h-8 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-white font-bold flex items-center justify-center border border-slate-700 shadow-xl backdrop-blur-md text-sm"
        >
          +
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="w-8 h-8 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-white font-bold flex items-center justify-center border border-slate-700 shadow-xl backdrop-blur-md text-sm"
        >
          -
        </button>
      </div>

      {/* Floating Live Follow Banner (Bottom Center) */}
      {isFollowMode && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {isFollowSuspended ? (
            <button
              onClick={() => setIsFollowSuspended(false)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black font-mono shadow-2xl flex items-center gap-1.5 animate-bounce transition-all"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Suivi suspendu — Reprendre le centrage</span>
            </button>
          ) : (
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/95 border border-cyan-500/50 text-cyan-400 text-xs font-bold font-mono shadow-2xl flex items-center gap-2 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Mode Suivi Live Actif</span>
              <button
                onClick={() => {
                  if (onToggleFollowMode) onToggleFollowMode(false);
                  setIsFollowSuspended(false);
                }}
                className="text-[10px] text-slate-400 hover:text-rose-400 ml-1 underline"
              >
                Désactiver
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
