import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { useFleet } from '../contexts/FleetContext';
import { traccarApi } from '../services/traccar/traccarApi';
import {
  processTraccarPositions,
  ProcessedTripHistory,
  GpsPoint,
  GpsSegment,
} from '../utils/gpsSegmentation';
import {
  History,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Navigation,
  Calendar,
  AlertCircle,
  Clock,
  Gauge,
  Bug,
  ChevronDown,
  ChevronUp,
  MapPin,
  Compass,
  Zap,
  Layers,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Crosshair,
  ShieldAlert,
  Plus,
  Minus,
} from 'lucide-react';
import { MapTileLayerType } from '../components/map/MapView';

const HISTORY_TILE_LAYERS: Record<
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
    name: 'OpenStreetMap Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    subdomains: ['a', 'b', 'c'],
  },
  topo: {
    name: 'Relief & Topographie',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap &copy; OpenStreetMap',
    subdomains: ['a', 'b', 'c'],
  },
};

interface TripHistoryPageProps {
  selectedVehicleIdFromNav?: string | null;
}

export const TripHistoryPage: React.FC<TripHistoryPageProps> = ({ selectedVehicleIdFromNav }) => {
  const { vehicles } = useFleet();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    selectedVehicleIdFromNav || vehicles[0]?.id || ''
  );
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [processedData, setProcessedData] = useState<ProcessedTripHistory | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDebugOpen, setIsDebugOpen] = useState<boolean>(false);
  const [activeLayer, setActiveLayer] = useState<MapTileLayerType>('voyager');
  const [showLayerSelector, setShowLayerSelector] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Playback Player State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackIndex, setPlaybackIndex] = useState<number>(0);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(2);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);
  const polylineLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const animatedMarkerRef = useRef<L.Marker | null>(null);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Single unified positions array for Map, Replay and Distance (Zero desynchronization)
  const displayPositions: GpsPoint[] = processedData?.displayPositions || [];
  const currentPoint: GpsPoint | null = displayPositions[playbackIndex] || displayPositions[0] || null;

  // Invalidate Map Size helper (Essential for zero-grey map on resize/fullscreen)
  const invalidateMapSize = useCallback(() => {
    if (mapRef.current) {
      requestAnimationFrame(() => {
        mapRef.current?.invalidateSize();
      });
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 150);
    }
  }, []);

  // Fit bounds strictly to the real displayed trip points
  const fitTripBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map || displayPositions.length === 0) return;

    const bounds = L.latLngBounds([]);
    displayPositions.forEach((p) => bounds.extend([p.lat, p.lng]));

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [displayPositions]);

  // Handle selected vehicle sync
  useEffect(() => {
    if (selectedVehicleIdFromNav && vehicles.some((v) => v.id === selectedVehicleIdFromNav)) {
      setSelectedVehicleId(selectedVehicleIdFromNav);
    } else if (vehicles.length > 0 && (!selectedVehicleId || !vehicles.some((v) => v.id === selectedVehicleId))) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [selectedVehicleIdFromNav, vehicles, selectedVehicleId]);

  // Fullscreen change synchronization
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      invalidateMapSize();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('resize', invalidateMapSize);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('resize', invalidateMapSize);
    };
  }, [invalidateMapSize]);

  // Fetch real positions from Traccar API for selected device and date
  useEffect(() => {
    const selectedVeh = vehicles.find((v) => v.id === selectedVehicleId);
    if (selectedVeh && selectedVeh.traccar_id) {
      setIsLoading(true);
      const fromIso = `${selectedDate}T00:00:00Z`;
      const toIso = `${selectedDate}T23:59:59Z`;

      traccarApi
        .getDevicePositions(selectedVeh.traccar_id, fromIso, toIso)
        .then((rawPositions) => {
          setIsLoading(false);
          if (rawPositions && rawPositions.length > 0) {
            const processed = processTraccarPositions(rawPositions, selectedVeh.traccar_id!);
            setProcessedData(processed);
            setPlaybackIndex(0);
          } else {
            setProcessedData(null);
          }
        })
        .catch((err) => {
          console.warn('Notice: Traccar history fetch:', err);
          setIsLoading(false);
          setProcessedData(null);
        });
    } else {
      setProcessedData(null);
    }
  }, [selectedVehicleId, selectedDate, vehicles]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [14.7869, -17.3767],
      zoom: 13,
      zoomControl: false,
    });

    const cfg = HISTORY_TILE_LAYERS[activeLayer];
    const initialTile = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      subdomains: cfg.subdomains || 'abc',
      maxZoom: 19,
    }).addTo(map);

    activeTileLayerRef.current = initialTile;
    polylineLayerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Switch Layer Instantly
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }

    const cfg = HISTORY_TILE_LAYERS[activeLayer];
    const newLayer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      subdomains: cfg.subdomains || 'abc',
      maxZoom: 19,
    }).addTo(map);

    activeTileLayerRef.current = newLayer;
  }, [activeLayer]);

  // Draw Multi-Segment Polylines & Markers (Guarantees NO connecting lines across jumps!)
  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = polylineLayerGroupRef.current;
    if (!map || !layerGroup) return;

    // Clear previous layers
    layerGroup.clearLayers();
    if (animatedMarkerRef.current) {
      animatedMarkerRef.current.remove();
      animatedMarkerRef.current = null;
    }

    if (!processedData || processedData.segments.length === 0 || displayPositions.length === 0) {
      return;
    }

    const bounds = L.latLngBounds([]);

    // 1. Render Each Segment Independently
    processedData.segments.forEach((segment: GpsSegment, sIdx: number) => {
      const segPoints = segment.points;

      if (segPoints.length === 1) {
        // Single isolated point
        const p = segPoints[0];
        const marker = L.circleMarker([p.lat, p.lng], {
          radius: 6,
          color: '#06B6D4',
          fillColor: '#06B6D4',
          fillOpacity: 0.9,
        }).bindTooltip(
          `<b>Point isolé</b>: ${new Date(p.timestamp).toLocaleTimeString('fr-FR', {
            timeZone: 'Africa/Dakar',
          })} (${p.speed} km/h)`
        );
        layerGroup.addLayer(marker);
        bounds.extend([p.lat, p.lng]);
        return;
      }

      // Draw Multi-colored Sub-segments based on Traccar speed
      for (let i = 1; i < segPoints.length; i++) {
        const p1 = segPoints[i - 1];
        const p2 = segPoints[i];
        bounds.extend([p1.lat, p1.lng]);
        bounds.extend([p2.lat, p2.lng]);

        const speed = p2.speed;
        const color = speed > 90 ? '#EF4444' : speed >= 50 ? '#F59E0B' : '#06B6D4';

        const poly = L.polyline(
          [
            [p1.lat, p1.lng],
            [p2.lat, p2.lng],
          ],
          {
            color,
            weight: 5,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
          }
        );
        layerGroup.addLayer(poly);
      }

      // Segment Start indicator if multiple segments exist
      if (processedData.segments.length > 1) {
        const sStart = segPoints[0];
        const segBadge = L.circleMarker([sStart.lat, sStart.lng], {
          radius: 5,
          color: '#3B82F6',
          fillColor: '#3B82F6',
          fillOpacity: 0.9,
        }).bindTooltip(`<b>Segment #${sIdx + 1}</b> (${segPoints.length} points)`);
        layerGroup.addLayer(segBadge);
      }
    });

    // 2. Start (Green) and Final (Red) Markers strictly on displayPositions
    const startPt = displayPositions[0];
    const endPt = displayPositions[displayPositions.length - 1];

    if (startPt) {
      const startMarker = L.circleMarker([startPt.lat, startPt.lng], {
        radius: 9,
        color: '#10B981',
        fillColor: '#10B981',
        fillOpacity: 1,
        weight: 2,
      }).bindTooltip(
        `<b>Départ Réel</b>: ${new Date(startPt.timestamp).toLocaleTimeString('fr-FR', {
          timeZone: 'Africa/Dakar',
        })}`
      );
      layerGroup.addLayer(startMarker);
    }

    if (endPt) {
      const endMarker = L.circleMarker([endPt.lat, endPt.lng], {
        radius: 9,
        color: '#EF4444',
        fillColor: '#EF4444',
        fillOpacity: 1,
        weight: 2,
      }).bindTooltip(
        `<b>Dernière Position</b>: ${new Date(endPt.timestamp).toLocaleTimeString('fr-FR', {
          timeZone: 'Africa/Dakar',
        })}`
      );
      layerGroup.addLayer(endMarker);
    }

    // 3. Fit Map Bounds (Strictly matching real display points)
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }

    // 4. Initial Animated Marker
    const initialPt = displayPositions[playbackIndex] || startPt;
    if (initialPt) {
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
    }
  }, [processedData]);

  // Handle Playback Animation Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
      return;
    }

    const interval = Math.max(50, 1000 / speedMultiplier);

    animationTimerRef.current = setInterval(() => {
      setPlaybackIndex((prev) => {
        if (prev >= displayPositions.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, interval);

    return () => {
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
    };
  }, [isPlaying, speedMultiplier, displayPositions.length]);

  // Update animated marker position on index change
  useEffect(() => {
    const pt = displayPositions[playbackIndex];
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
  }, [playbackIndex, displayPositions]);

  // Toggle Browser Native Fullscreen Mode
  const toggleFullscreen = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Le mode plein écran n\'est pas disponible dans ce navigateur:', err);
    } finally {
      invalidateMapSize();
    }
  };

  const selectedVeh = vehicles.find((v) => v.id === selectedVehicleId);

  // Format Duration string helper
  const formatDuration = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="space-y-4 pb-8">
      {/* ============================================================ */}
      {/* 1. HEADER & FILTER BAR                                       */}
      {/* ============================================================ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white font-mono flex items-center gap-2">
              <History className="w-6 h-6 text-cyan-400" />
              HISTORIQUE &amp; REPLAY GPS RÉEL
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              100% Traccar Live
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Visualisation fidèle et replay des coordonnées réelles enregistrées sur le serveur Traccar.
          </p>
        </div>

        {/* Filter Selection Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Véhicule</label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 font-mono"
            >
              {vehicles.length === 0 ? (
                <option value="">Aucun véhicule disponible</option>
              ) : (
                vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.plate_number})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Date d'Analyse</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-500"
            />
          </div>

          {/* Diagnostic Debug Toggle Button */}
          <div className="self-end">
            <button
              onClick={() => setIsDebugOpen(!isDebugOpen)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                isDebugOpen
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Afficher les métriques de segmentation et diagnostic GPS"
            >
              <Bug className="w-3.5 h-3.5" />
              <span>GPS Diagnostic</span>
              {isDebugOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. ADMIN / DEVELOPER GPS DIAGNOSTIC HUD                      */}
      {/* ============================================================ */}
      {isDebugOpen && (
        <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-400">
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              PANNEAU DIAGNOSTIC TÉLÉMÉTRIQUE TRACCAR &amp; SAUTS GPS
            </span>
            <span className="text-[10px] text-slate-400">
              Isolation des discontinuités physiques et trames de test
            </span>
          </div>

          {processedData ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs font-mono">
                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Device ID</div>
                  <div className="font-bold text-cyan-400">{processedData.diagnostic.deviceId}</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Points Bruts</div>
                  <div className="font-bold text-white">{processedData.diagnostic.rawCount}</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Test Exclus</div>
                  <div className="font-bold text-amber-400">{processedData.diagnostic.testPointsExcluded}</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Points Utiles</div>
                  <div className="font-bold text-emerald-400">{displayPositions.length}</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Segments</div>
                  <div className="font-bold text-cyan-400">{processedData.diagnostic.segmentsCount}</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Sauts Détectés</div>
                  <div className="font-bold text-emerald-400">{processedData.diagnostic.jumpsDetected}</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Distance Réelle</div>
                  <div className="font-bold text-cyan-400">{processedData.totalDistanceKm} km</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Zone GPS</div>
                  <div className="font-bold text-slate-300 truncate">
                    {processedData.diagnostic.minLat?.toFixed(3)}°N
                  </div>
                </div>
              </div>

              {/* Jumps Detail Audit Table */}
              {processedData.diagnostic.jumps.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-amber-500/20 text-xs font-mono">
                  <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Détail des discontinuités / sauts GPS isolés :
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] text-slate-300">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500">
                          <th className="py-1">#</th>
                          <th>FROM (Lat, Lng)</th>
                          <th>TO (Lat, Lng)</th>
                          <th>Distance</th>
                          <th>Écart Temps</th>
                          <th>Vitesse Implicite</th>
                          <th>Raison de la coupure</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedData.diagnostic.jumps.map((j) => (
                          <tr key={j.jumpIndex} className="border-b border-slate-900/60">
                            <td className="py-1 text-cyan-400">#{j.jumpIndex}</td>
                            <td>
                              {j.fromPoint.lat.toFixed(4)}, {j.fromPoint.lng.toFixed(4)}
                            </td>
                            <td>
                              {j.toPoint.lat.toFixed(4)}, {j.toPoint.lng.toFixed(4)}
                            </td>
                            <td className="text-amber-400 font-bold">{j.distanceKm} km</td>
                            <td>{j.deltaTimeSec}s</td>
                            <td className="text-rose-400">{j.impliedSpeedKmh} km/h</td>
                            <td className="text-slate-400">{j.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-slate-400">Aucune télémétrie chargée pour le diagnostic.</div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. REAL TRIP METRICS SUMMARY                                 */}
      {/* ============================================================ */}
      {processedData && displayPositions.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Distance Réelle
            </div>
            <div className="text-xl font-black text-cyan-400 font-mono mt-1">
              {processedData.totalDistanceKm} km
            </div>
          </div>

          <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Durée du Parcours
            </div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-1">
              {formatDuration(processedData.totalDurationSec)}
            </div>
          </div>

          <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Vitesse Moyenne
            </div>
            <div className="text-xl font-black text-white font-mono mt-1">
              {processedData.avgSpeedKmh} km/h
            </div>
          </div>

          <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Vitesse Max
            </div>
            <div className="text-xl font-black text-rose-400 font-mono mt-1">
              {processedData.maxSpeedKmh} km/h
            </div>
          </div>

          <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Positions Replay
            </div>
            <div className="text-xl font-black text-amber-400 font-mono mt-1">
              {displayPositions.length}
            </div>
          </div>

          <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Segments Contigus
            </div>
            <div className="text-xl font-black text-slate-300 font-mono mt-1">
              {processedData.segments.length} segment(s)
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            {isLoading
              ? 'Récupération des coordonnées GPS en direct de Traccar...'
              : 'Aucune donnée GPS enregistrée pour cette période.'}
          </span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. MAP CONTAINER & REPLAY WORKSPACE (FULLSCREEN COMPATIBLE)  */}
      {/* ============================================================ */}
      <div
        ref={containerRef}
        className={`glass-panel p-4 rounded-2xl border border-slate-800 space-y-4 relative ${
          isFullscreen ? 'fixed inset-0 z-[100] rounded-none border-0 p-4 bg-slate-950 flex flex-col' : ''
        }`}
      >
        {/* Leaflet Map Target */}
        <div className={`w-full rounded-xl overflow-hidden border border-slate-800 relative shadow-2xl ${
          isFullscreen ? 'flex-1 min-h-0' : 'h-[480px]'
        }`}>
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* ============================================================ */}
          {/* PROFESSIONAL MAP CONTROLS STACK (TOP RIGHT - Z-INDEX 1000)   */}
          {/* ============================================================ */}
          <div
            className="absolute top-4 right-4 z-[1000] flex flex-col space-y-2 pointer-events-auto select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Zoom In (+) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                mapRef.current?.zoomIn();
              }}
              className="bcs-map-control-btn"
              title="Zoom avant (+)"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Zoom Out (−) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                mapRef.current?.zoomOut();
              }}
              className="bcs-map-control-btn"
              title="Zoom arrière (−)"
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* Layer Selector (🗺) */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLayerSelector(!showLayerSelector);
                }}
                className={`bcs-map-control-btn ${showLayerSelector ? 'active' : ''}`}
                title="Changer le fond de carte"
              >
                <Layers className="w-4 h-4" />
              </button>

              {showLayerSelector && (
                <div
                  className="absolute right-0 mt-2 w-52 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl p-2 z-[1010] space-y-1 text-xs backdrop-blur-xl animate-in fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                    Fonds Cartographiques
                  </div>
                  {(Object.keys(HISTORY_TILE_LAYERS) as MapTileLayerType[]).map((layerKey) => (
                    <button
                      key={layerKey}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveLayer(layerKey);
                        setShowLayerSelector(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                        activeLayer === layerKey
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{HISTORY_TILE_LAYERS[layerKey].name}</span>
                      {activeLayer === layerKey && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recenter Trip / FitBounds (⌖) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                fitTripBounds();
              }}
              className="bcs-map-control-btn"
              title="Recentrer le trajet complet"
            >
              <Crosshair className="w-4 h-4" />
            </button>

            {/* Native Fullscreen Button (⛶) */}
            <button
              onClick={toggleFullscreen}
              className={`bcs-map-control-btn ${isFullscreen ? 'active !text-amber-400 !border-amber-500/50' : ''}`}
              title={isFullscreen ? '✕ Quitter le plein écran (Échap)' : '⛶ Mode Plein Écran'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>

          {/* Telemetry HUD Overlay (Top Left - Z-INDEX 900) */}
          {processedData && currentPoint && (
            <div className="absolute top-4 left-4 glass-card p-3 rounded-xl border border-slate-700/90 z-[900] text-xs font-mono space-y-1.5 shadow-2xl backdrop-blur-xl pointer-events-auto">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-cyan-400 font-bold">{selectedVeh?.name || 'Traceur'}</span>
              </div>
              <div className="text-white flex items-center gap-2">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Vitesse: <strong className="text-emerald-400 font-bold">{currentPoint.speed} km/h</strong>
                </span>
              </div>
              <div className="text-slate-300 flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Cap: {currentPoint.heading}°</span>
              </div>
              <div className="text-slate-400 flex items-center gap-2 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {new Date(currentPoint.timestamp).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'Africa/Dakar',
                  })}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 pt-0.5 border-t border-slate-800">
                GPS: {currentPoint.lat.toFixed(5)}, {currentPoint.lng.toFixed(5)}
              </div>
            </div>
          )}

          {/* Speed Legend Overlay (Bottom Left - Z-INDEX 900) */}
          {processedData && displayPositions.length > 0 && (
            <div className="absolute bottom-4 left-4 glass-card px-3 py-2 rounded-xl border border-slate-800 z-[900] text-[10px] font-mono flex items-center space-x-3 shadow-xl pointer-events-none">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4]" />
                <span className="text-slate-300">&lt; 50 km/h</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                <span className="text-slate-300">50 - 90 km/h</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                <span className="text-slate-300">&gt; 90 km/h</span>
              </div>
            </div>
          )}

          {/* Empty Placeholder when no points exist */}
          {!processedData && !isLoading && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-slate-400 text-xs gap-2 p-6 text-center">
              <Navigation className="w-10 h-10 text-slate-600 animate-pulse mb-1" />
              <span className="font-bold text-slate-200 text-sm">
                Aucune donnée GPS enregistrée pour cette période.
              </span>
              <span className="text-[11px] text-slate-500 max-w-md">
                Les coordonnées proviennent exclusivement des réceptions Traccar en production.
                Sélectionnez une autre date ou vérifiez l'activité du traceur.
              </span>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* 5. ANIMATED REPLAY TIMELINE & CONTROLS                       */}
        {/* ============================================================ */}
        {processedData && displayPositions.length > 0 && (
          <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
            {/* Control Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setPlaybackIndex((prev) => Math.max(0, prev - 1));
                }}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Point précédent (⏮)"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold transition-all shadow-lg shadow-cyan-950/50"
                title={isPlaying ? 'Mettre en pause' : 'Lancer le Replay GPS'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setPlaybackIndex((prev) => Math.min(displayPositions.length - 1, prev + 1));
                }}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Point suivant (⏭)"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setPlaybackIndex(0);
                }}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Revenir au départ (↺)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Speed Multiplier Selector */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <FastForward className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
                {[0.5, 1, 2, 4, 8, 16].map((mult) => (
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

            {/* Exact Replay Counter & Seek Slider */}
            <div className="flex-1 w-full flex items-center space-x-3">
              <span className="text-xs font-mono text-cyan-400 font-bold shrink-0 min-w-[75px]">
                {playbackIndex + 1} / {displayPositions.length}
              </span>
              <input
                type="range"
                min={0}
                max={displayPositions.length - 1}
                value={playbackIndex}
                onChange={(e) => setPlaybackIndex(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <span className="text-[11px] font-mono text-slate-400 shrink-0">
                {currentPoint
                  ? new Date(currentPoint.timestamp).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      timeZone: 'Africa/Dakar',
                    })
                  : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
