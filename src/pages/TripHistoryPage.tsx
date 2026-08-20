import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { useFleet } from '../contexts/FleetContext';
import { useTraccar } from '../contexts/TraccarContext';
import { traccarApi } from '../services/traccar/traccarApi';
import { Trip, RoutePoint } from '../types';
import { MOCK_TRIP } from '../services/demo/demoSimulator';
import {
  History,
  Play,
  Pause,
  RotateCcw,
  FastForward,
} from 'lucide-react';

export const TripHistoryPage: React.FC = () => {
  const { vehicles } = useFleet();
  const { isDemoMode } = useTraccar();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || 'veh-1');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentTrip, setCurrentTrip] = useState<Trip>(MOCK_TRIP);

  // Playback Player State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackIndex, setPlaybackIndex] = useState<number>(0);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const animatedMarkerRef = useRef<L.Marker | null>(null);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const routePoints = currentTrip.route_points;
  const currentPoint: RoutePoint = routePoints[playbackIndex] || routePoints[0] || {
    lat: 14.6937,
    lng: -17.4583,
    speed: 0,
    heading: 0,
    timestamp: new Date().toISOString(),
  };

  // Keep selected vehicle valid
  useEffect(() => {
    if (vehicles.length > 0 && !vehicles.some((v) => v.id === selectedVehicleId)) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  // Fetch real history from Traccar if in MODE LIVE
  useEffect(() => {
    const selectedVeh = vehicles.find((v) => v.id === selectedVehicleId);
    if (!isDemoMode && selectedVeh && selectedVeh.traccar_id) {
      const fromIso = `${selectedDate}T00:00:00Z`;
      const toIso = `${selectedDate}T23:59:59Z`;

      traccarApi
        .getDevicePositions(selectedVeh.traccar_id, fromIso, toIso)
        .then((traccarPositions) => {
          if (traccarPositions && traccarPositions.length > 0) {
            const points: RoutePoint[] = traccarPositions.map((p) => ({
              lat: p.latitude,
              lng: p.longitude,
              speed: Math.round((p.speed || 0) * 1.852),
              heading: Math.round(p.course || 0),
              timestamp: p.fixTime || p.deviceTime || new Date().toISOString(),
            }));

            let totalDistKm = 0;
            let maxSpd = 0;
            let speedSum = 0;

            points.forEach((pt, i) => {
              if (pt.speed > maxSpd) maxSpd = pt.speed;
              speedSum += pt.speed;
              if (i > 0) {
                const prev = points[i - 1];
                totalDistKm += L.latLng(prev.lat, prev.lng).distanceTo(L.latLng(pt.lat, pt.lng)) / 1000;
              }
            });

            setCurrentTrip({
              id: `trip-traccar-${selectedVeh.traccar_id}`,
              vehicle_id: selectedVeh.id,
              vehicle_name: selectedVeh.name,
              vehicle_plate: selectedVeh.plate_number,
              start_time: points[0].timestamp,
              end_time: points[points.length - 1].timestamp,
              distance_km: Number(totalDistKm.toFixed(1)),
              duration_seconds: 3600,
              avg_speed_kmh: Number((speedSum / points.length).toFixed(1)),
              max_speed_kmh: maxSpd,
              stops_count: 0,
              stop_duration_seconds: 0,
              route_points: points,
              start_address: 'Point de départ Traccar',
              end_address: 'Dernière position Traccar',
            });
            setPlaybackIndex(0);
          }
        })
        .catch((err) => console.warn('Notice: Traccar history fetch:', err));
    }
  }, [isDemoMode, selectedVehicleId, selectedDate, vehicles]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [14.6937, -17.4583],
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; CARTO &copy; OpenStreetMap',
        maxZoom: 19,
        subdomains: 'abcd',
      }
    ).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Draw Route Polyline & Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || routePoints.length === 0) return;

    // Clear previous polyline
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
    }
    if (animatedMarkerRef.current) {
      animatedMarkerRef.current.remove();
    }

    const latLngs: [number, number][] = routePoints.map((pt) => [pt.lat, pt.lng]);

    // Draw Cyan Polyline
    const polyline = L.polyline(latLngs, {
      color: '#06B6D4',
      weight: 5,
      opacity: 0.8,
      dashArray: '8, 8',
    }).addTo(map);

    routePolylineRef.current = polyline;

    // Start Marker (Green Pin)
    const startPt = routePoints[0];
    L.circleMarker([startPt.lat, startPt.lng], {
      radius: 8,
      color: '#10B981',
      fillColor: '#10B981',
      fillOpacity: 1,
    })
      .bindTooltip('<b>Départ</b>: ' + currentTrip.start_address)
      .addTo(map);

    // End Marker (Red Pin)
    const endPt = routePoints[routePoints.length - 1];
    L.circleMarker([endPt.lat, endPt.lng], {
      radius: 8,
      color: '#EF4444',
      fillColor: '#EF4444',
      fillOpacity: 1,
    })
      .bindTooltip('<b>Arrivée</b>: ' + currentTrip.end_address)
      .addTo(map);

    // Fit map bounds to route
    map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

    // Animated Vehicle Marker
    const initialPt = routePoints[playbackIndex] || routePoints[0];
    const markerIcon = L.divIcon({
      html: `
        <div class="w-10 h-10 rounded-xl bg-slate-900 border-2 border-cyan-400 flex items-center justify-center shadow-2xl">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-cyan-400" style="transform: rotate(${initialPt.heading}deg)">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>
      `,
      className: 'playback-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    animatedMarkerRef.current = L.marker([initialPt.lat, initialPt.lng], {
      icon: markerIcon,
    }).addTo(map);
  }, [currentTrip]);

  // Handle Playback Animation Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
      return;
    }

    const interval = Math.max(200, 1000 / speedMultiplier);

    animationTimerRef.current = setInterval(() => {
      setPlaybackIndex((prev) => {
        if (prev >= routePoints.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, interval);

    return () => {
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
    };
  }, [isPlaying, speedMultiplier, routePoints.length]);

  // Update animated marker position on index change
  useEffect(() => {
    const pt = routePoints[playbackIndex];
    if (pt && animatedMarkerRef.current && mapRef.current) {
      animatedMarkerRef.current.setLatLng([pt.lat, pt.lng]);
      const markerIcon = L.divIcon({
        html: `
          <div class="w-10 h-10 rounded-xl bg-slate-900 border-2 border-cyan-400 flex items-center justify-center shadow-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-cyan-400" style="transform: rotate(${pt.heading}deg)">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
            </svg>
          </div>
        `,
        className: 'playback-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      animatedMarkerRef.current.setIcon(markerIcon);
      mapRef.current.panTo([pt.lat, pt.lng], { animate: true });
    }
  }, [playbackIndex, routePoints]);

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white font-mono flex items-center gap-2">
            <History className="w-6 h-6 text-cyan-400" />
            HISTORIQUE DES TRAJETS &amp; REPLAY ANIMÉ
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sélectionnez un véhicule et une date pour rejouer l'animation précise du parcours.
          </p>
        </div>

        {/* Filter Inputs */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Véhicule</label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 font-mono"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.plate_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Trip Statistics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
          <div className="text-[10px] font-semibold text-slate-400">Distance Totale</div>
          <div className="text-lg font-black text-cyan-400 font-mono mt-1">
            {currentTrip.distance_km} km
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
          <div className="text-[10px] font-semibold text-slate-400">Durée Trajet</div>
          <div className="text-lg font-black text-emerald-400 font-mono mt-1">
            1h 45m
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
          <div className="text-[10px] font-semibold text-slate-400">Vitesse Moyenne</div>
          <div className="text-lg font-black text-white font-mono mt-1">
            {currentTrip.avg_speed_kmh} km/h
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
          <div className="text-[10px] font-semibold text-slate-400">Vitesse Max</div>
          <div className="text-lg font-black text-rose-400 font-mono mt-1">
            {currentTrip.max_speed_kmh} km/h
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
          <div className="text-[10px] font-semibold text-slate-400">Nombre d'Arrêts</div>
          <div className="text-lg font-black text-amber-400 font-mono mt-1">
            {currentTrip.stops_count} arrêts
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
          <div className="text-[10px] font-semibold text-slate-400">Temps d'Arrêt Total</div>
          <div className="text-lg font-black text-slate-300 font-mono mt-1">
            15 min
          </div>
        </div>
      </div>

      {/* Map & Animated Controls Section */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-4">
        {/* Map Container */}
        <div className="h-[460px] w-full rounded-xl overflow-hidden border border-slate-800 relative">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Telemetry Overlay Card */}
          <div className="absolute top-4 left-4 glass-card p-3 rounded-xl border border-slate-700/80 z-20 text-xs font-mono space-y-1">
            <div className="text-cyan-400 font-bold">{currentTrip.vehicle_name}</div>
            <div className="text-white">Vitesse: <span className="font-bold">{currentPoint.speed} km/h</span></div>
            <div className="text-slate-400">Heure: {new Date(currentPoint.timestamp).toLocaleTimeString()}</div>
          </div>
        </div>

        {/* Animated Playback Controls Bar */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Controls: Play/Pause/Reset */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-lg shadow-cyan-950/50"
              title={isPlaying ? 'Pause' : 'Lecture'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setPlaybackIndex(0);
              }}
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Réinitialiser le trajet"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Speed Multiplier */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <FastForward className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
              {[1, 2, 4, 8, 16].map((mult) => (
                <button
                  key={mult}
                  onClick={() => setSpeedMultiplier(mult)}
                  className={`px-2 py-1 rounded-lg font-bold transition-all ${
                    speedMultiplier === mult
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {mult}x
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Seek Slider */}
          <div className="flex-1 w-full flex items-center space-x-3">
            <span className="text-xs font-mono text-slate-400 shrink-0">
              {playbackIndex + 1} / {routePoints.length}
            </span>
            <input
              type="range"
              min={0}
              max={routePoints.length - 1}
              value={playbackIndex}
              onChange={(e) => setPlaybackIndex(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
