import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Vehicle, Geofence } from '../../types';

interface MapViewProps {
  vehicles: Vehicle[];
  geofences?: Geofence[];
  selectedVehicleId?: string | null;
  onVehicleSelect?: (vehicle: Vehicle) => void;
  onHistoryClick?: (vehicle: Vehicle) => void;
  onImmobilizeClick?: (vehicle: Vehicle) => void;
  center?: [number, number];
  zoom?: number;
  interactiveGeofenceDraw?: boolean;
}

export const MapView: React.FC<MapViewProps> = ({
  vehicles,
  geofences = [],
  selectedVehicleId,
  onVehicleSelect,
  onHistoryClick,
  onImmobilizeClick,
  center = [14.6937, -17.4583], // Dakar Center
  zoom = 12,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());

  const geofenceLayersRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false,
    });

    // CartoDB Voyager High-Speed Light Tile Layer
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; CARTO &copy; OpenStreetMap',
        maxZoom: 19,
        subdomains: 'abcd',
      }
    ).addTo(map);



    L.control.zoom({ position: 'bottomright' }).addTo(map);

    geofenceLayersRef.current = L.layerGroup([] as any).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Center if requested
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView(center, zoom, { animate: true });
    }
  }, [center, zoom]);

  // Update Geofences Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !geofenceLayersRef.current) return;

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

  // Render & Update Vehicle Markers
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

      // Custom HTML Marker Element
      const iconHtml = `
        <div class="relative group cursor-pointer z-20">
          <!-- License Plate & Speed Badge -->
          <div class="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-slate-950/95 text-[10px] font-mono font-bold text-white border shadow-2xl whitespace-nowrap z-20 flex items-center gap-1.5" style="border-color: ${statusColor}">
            <span class="text-cyan-400 font-black tracking-wider">${vehicle.plate_number}</span>
            ${
              vehicle.current_speed > 0
                ? `<span class="text-white border-l border-slate-700 pl-1.5 font-bold">${vehicle.current_speed} km/h</span>`
                : `<span class="text-amber-400/90 border-l border-slate-700 pl-1.5 text-[9px]">ARRÊTÉ</span>`
            }
          </div>

          ${
            vehicle.status === 'MOVING'
              ? `<div class="absolute -inset-1.5 rounded-full bg-emerald-500/30 pulse-emerald"></div>`
              : vehicle.status === 'ALERT'
              ? `<div class="absolute -inset-2 rounded-full bg-rose-500/40 pulse-rose"></div>`
              : ''
          }

          <div class="relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border-2 shadow-xl" style="border-color: ${statusColor}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 vehicle-marker-icon" style="color: ${statusColor}; transform: rotate(${vehicle.current_heading}deg);">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
            </svg>
          </div>
        </div>
      `;


      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-vehicle-div-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      let marker = markersRef.current.get(vehicle.id);

      if (marker) {
        marker.setLatLng([vehicle.current_lat, vehicle.current_lng]);
        marker.setIcon(customIcon);
      } else {
        marker = L.marker([vehicle.current_lat, vehicle.current_lng], { icon: customIcon });

        // Build Popup Content
        const popupContent = document.createElement('div');
        popupContent.className = 'p-1 text-slate-100 min-w-[220px]';
        popupContent.innerHTML = `
          <div class="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
            <div>
              <h3 class="font-bold text-sm text-cyan-400 font-mono">${vehicle.name}</h3>
              <p class="text-[11px] text-slate-400 font-semibold">${vehicle.plate_number}</p>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold" style="background-color: ${statusColor}20; color: ${statusColor}; border: 1px solid ${statusColor}40">
              ${statusBadgeText}
            </span>
          </div>

          <div class="space-y-1 text-xs font-mono text-slate-300">
            <div class="flex justify-between"><span class="text-slate-400">Vitesse:</span> <span class="font-bold text-white">${vehicle.current_speed} km/h</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Direction:</span> <span>${vehicle.current_heading}°</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Chauffeur:</span> <span class="text-cyan-300">${vehicle.driver_name || 'Non assigné'}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Batterie:</span> <span>${vehicle.battery_level}%</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Modèle:</span> <span>${vehicle.brand} ${vehicle.model}</span></div>
          </div>

          <div class="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between gap-2">
            <button id="pop-hist-${vehicle.id}" class="flex-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-cyan-400 border border-slate-700">
              Historique
            </button>
            <button id="pop-immob-${vehicle.id}" class="flex-1 px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-[10px] font-semibold text-rose-400 border border-rose-500/30">
              Immobiliser
            </button>
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('click', () => {
          if (onVehicleSelect) onVehicleSelect(vehicle);
        });

        marker.on('popupopen', () => {
          const btnHist = document.getElementById(`pop-hist-${vehicle.id}`);
          const btnImmob = document.getElementById(`pop-immob-${vehicle.id}`);

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

    // Clean up old markers
    markersRef.current.forEach((marker, id) => {
      if (!currentMarkerIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });
  }, [vehicles, onVehicleSelect, onHistoryClick, onImmobilizeClick]);

  // Center selected vehicle on map
  useEffect(() => {
    if (selectedVehicleId && mapInstanceRef.current) {
      const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
      if (vehicle) {
        mapInstanceRef.current.panTo([vehicle.current_lat, vehicle.current_lng], {
          animate: true,
          duration: 0.8,
        });
        const marker = markersRef.current.get(vehicle.id);
        if (marker) {
          marker.openPopup();
        }
      }
    }
  }, [selectedVehicleId, vehicles]);

  return <div ref={mapContainerRef} className="w-full h-full min-h-[400px] rounded-2xl overflow-hidden shadow-2xl relative" />;
};
