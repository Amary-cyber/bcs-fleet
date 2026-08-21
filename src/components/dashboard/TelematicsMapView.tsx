import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Vehicle, Geofence } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { useLeafletMapResize } from '../map/useLeafletMapResize';
import { Maximize2, Minimize2, Crosshair, Map, Plus, Minus, Sun, Moon } from 'lucide-react';

interface TelematicsMapViewProps {
  vehicles: Vehicle[];
  geofences?: Geofence[];
  selectedVehicleId?: string | null;
  onVehicleSelect?: (vehicle: Vehicle) => void;
  onHistoryClick?: (vehicle: Vehicle) => void;
  onImmobilizeClick?: (vehicle: Vehicle) => void;
  center?: [number, number];
  zoom?: number;
}

export const TelematicsMapView: React.FC<TelematicsMapViewProps> = ({
  vehicles,
  geofences = [],
  selectedVehicleId,
  onVehicleSelect,
  onHistoryClick,
  onImmobilizeClick,
  center = [14.6937, -17.4583],
  zoom = 12,
}) => {
  const { theme } = useTheme();
  const [mapStyle, setMapStyle] = useState<'dark' | 'light'>(theme === 'dark' ? 'dark' : 'light');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());
  const geofenceLayersRef = useRef<L.LayerGroup | null>(null);

  // Sync with theme state
  useEffect(() => {
    setMapStyle(theme);
  }, [theme]);

  // Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false,
    });

    const initialTileUrl =
      mapStyle === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';


    const tileLayer = L.tileLayer(initialTileUrl, {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    geofenceLayersRef.current = L.layerGroup([] as any).addTo(map);
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
    deps: [selectedVehicleId, mapStyle, vehicles.length],
  });

  // Update Tile Layer URL when mapStyle changes
  useEffect(() => {
    if (!mapRef.current) return;

    const tileUrl =
      mapStyle === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';


    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(tileUrl);
    }
  }, [mapStyle]);

  // Update Geofences Layer
  useEffect(() => {
    if (!mapRef.current || !geofenceLayersRef.current) return;

    geofenceLayersRef.current.clearLayers();

    geofences.forEach((geo) => {
      if (geo.type === 'CIRCLE') {
        const coords = geo.coordinates as { center: [number, number]; radius: number };
        if (coords.center && coords.radius) {
          const circle = L.circle(coords.center, {
            radius: coords.radius,
            color: geo.color || '#3B82F6',
            fillColor: geo.color || '#3B82F6',
            fillOpacity: 0.2,
            weight: 2,
          });
          circle.bindTooltip(`<b>${geo.name}</b><br/>Catégorie: ${geo.category}`);
          geofenceLayersRef.current?.addLayer(circle);
        }
      } else if (geo.type === 'POLYGON') {
        const coords = geo.coordinates as [number, number][];
        if (Array.isArray(coords) && coords.length > 0) {
          const polygon = L.polygon(coords, {
            color: geo.color || '#3B82F6',
            fillColor: geo.color || '#3B82F6',
            fillOpacity: 0.25,
            weight: 2,
          });
          polygon.bindTooltip(`<b>${geo.name}</b><br/>Catégorie: ${geo.category}`);
          geofenceLayersRef.current?.addLayer(polygon);
        }
      }
    });
  }, [geofences]);

  // Update Vehicle Markers with Heading Rotation & Speed Pill
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentMarkerIds = new Set<string>();

    vehicles.forEach((v) => {
      currentMarkerIds.add(v.id);

      const statusColor =
        v.status === 'MOVING'
          ? '#10B981'
          : v.status === 'STOPPED'
          ? '#F59E0B'
          : v.status === 'ALERT'
          ? '#EF4444'
          : '#64748B';

      const isSelected = v.id === selectedVehicleId;

      const iconHtml = `
        <div class="relative group cursor-pointer ${isSelected ? 'scale-110 z-40' : 'z-20'}">
          <!-- License Plate & Speed Pill Badge -->
          <div class="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-slate-950/95 text-[10px] font-mono font-bold text-white border shadow-2xl whitespace-nowrap z-20 flex items-center gap-1.5" style="border-color: ${isSelected ? '#06B6D4' : statusColor}">
            <span class="text-cyan-400 font-black tracking-wider">${v.plate_number}</span>
            ${
              v.current_speed > 0
                ? `<span class="text-white border-l border-slate-700 pl-1.5 font-bold">${v.current_speed} km/h</span>`
                : `<span class="text-amber-400/90 border-l border-slate-700 pl-1.5 text-[9px]">ARRÊTÉ</span>`
            }
          </div>

          ${
            v.status === 'MOVING'
              ? `<div class="absolute -inset-1.5 rounded-full bg-emerald-500/30 pulse-emerald"></div>`
              : v.status === 'ALERT'
              ? `<div class="absolute -inset-2 rounded-full bg-rose-500/40 pulse-rose"></div>`
              : ''
          }

          <div class="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border-2 shadow-2xl transition-transform duration-300" style="border-color: ${
            isSelected ? '#06B6D4' : statusColor
          }; ${isSelected ? 'box-shadow: 0 0 20px rgba(6,182,212,0.8);' : ''}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 vehicle-marker-icon" style="color: ${statusColor}; transform: rotate(${v.current_heading}deg);">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
            </svg>
          </div>
        </div>
      `;


      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'telematics-vehicle-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      let marker = markersRef.current.get(v.id);

      if (marker) {
        marker.setLatLng([v.current_lat, v.current_lng]);
        marker.setIcon(customIcon);
      } else {
        marker = L.marker([v.current_lat, v.current_lng], { icon: customIcon });

        marker.on('click', () => {
          if (onVehicleSelect) onVehicleSelect(v);
        });

        marker.addTo(map);
        markersRef.current.set(v.id, marker);
      }
    });

    markersRef.current.forEach((marker, id) => {
      if (!currentMarkerIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });
  }, [vehicles, selectedVehicleId, onVehicleSelect]);

  // Center on selected vehicle
  useEffect(() => {
    if (selectedVehicleId && mapRef.current) {
      const v = vehicles.find((veh) => veh.id === selectedVehicleId);
      if (v) {
        mapRef.current.panTo([v.current_lat, v.current_lng], { animate: true, duration: 0.6 });
      }
    }
  }, [selectedVehicleId, vehicles]);

  const handleFitFleet = () => {
    if (!mapRef.current || vehicles.length === 0) return;
    const bounds = L.latLngBounds(vehicles.map((v) => [v.current_lat, v.current_lng]));
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
  };

  const handleLocateMe = () => {
    if (!mapRef.current) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 14, { animate: true });
      });
    }
  };

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Cartographic Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col space-y-2">
        {/* Toggle Map Tile Style */}
        <button
          onClick={() => setMapStyle((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-white hover:text-cyan-400 hover:bg-slate-800 transition-all shadow-lg flex items-center gap-1.5 text-xs font-bold"
          title={mapStyle === 'dark' ? 'Passer en carte claire (OpenStreetMap)' : 'Passer en carte sombre (Dark Matter)'}
        >
          {mapStyle === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Carte Claire</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Carte Sombre</span>
            </>
          )}
        </button>

        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white hover:text-cyan-400 hover:bg-slate-800 transition-colors shadow-lg"
          title="Zoomer (+)"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white hover:text-cyan-400 hover:bg-slate-800 transition-colors shadow-lg"
          title="Dézoomer (-)"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          onClick={handleLocateMe}
          className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white hover:text-cyan-400 hover:bg-slate-800 transition-colors shadow-lg"
          title="Ma position"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        <button
          onClick={handleFitFleet}
          className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-xs shadow-lg hover:from-cyan-400 hover:to-teal-400 transition-all flex items-center gap-1.5"
          title="Ajuster le zoom pour voir tous les véhicules"
        >
          <Map className="w-4 h-4" />
          <span className="hidden sm:inline">Toute la Flotte</span>
        </button>
      </div>
    </div>
  );
};
