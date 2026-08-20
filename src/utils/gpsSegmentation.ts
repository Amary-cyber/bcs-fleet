import type { TraccarPosition } from '../types';

export interface GpsPoint {
  id?: number | string;
  lat: number;
  lng: number;
  speed: number; // km/h
  heading: number; // degrees 0-360
  timestamp: string; // ISO string
  timeMs: number;
  attributes?: Record<string, any>;
}

export interface JumpDiagnostic {
  jumpIndex: number;
  fromPoint: GpsPoint;
  toPoint: GpsPoint;
  distanceKm: number;
  deltaTimeSec: number;
  impliedSpeedKmh: number;
  reason: string;
}

export interface GpsSegment {
  id: string;
  segmentIndex: number;
  points: GpsPoint[];
  distanceKm: number;
  durationSec: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  startTime: string;
  endTime: string;
}

export interface GpsDiagnosticReport {
  deviceId: number | string;
  rawCount: number;
  validCount: number;
  rejectedCount: number;
  testPointsExcluded: number;
  segmentsCount: number;
  jumpsDetected: number;
  totalRealDistanceKm: number;
  jumps: JumpDiagnostic[];
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}

export interface ProcessedTripHistory {
  segments: GpsSegment[];
  displayPositions: GpsPoint[]; // Unified single array used by Map, Replay & Distance
  totalDistanceKm: number;
  totalDurationSec: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  diagnostic: GpsDiagnosticReport;
  startAddress: string;
  endAddress: string;
}

/**
 * Calculates standard Haversine great-circle distance between two GPS coordinates in kilometers.
 */
export const calculateHaversineDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Identifies known test packets (e.g. bootstrap port 5055 test frame at Dakar center: 14.6937, -17.4583)
 * to prevent test anomalies from polluting commercial production trips.
 */
export const isKnownTestPosition = (p: Partial<TraccarPosition> & { lat?: number; lng?: number; timestamp?: string }): boolean => {
  const lat = Number(p.latitude ?? p.lat);
  const lng = Number(p.longitude ?? p.lng);
  const id = Number(p.id);

  // 1. Check known bootstrap packet IDs from deployment testing
  if (id === 1 || id === 2) return true;

  // 2. Check exact synthetic test coordinates injected during port 5055 validation
  const isDakarBootstrapCoord = Math.abs(lat - 14.6937) < 0.001 && Math.abs(lng - (-17.4583)) < 0.001;
  if (isDakarBootstrapCoord) return true;

  return false;
};

/**
 * Normalizes raw Traccar positions: removes corrupt data, filters test frames,
 * converts speed units, and sorts strictly chronologically.
 */
export const normalizeAndValidatePositions = (
  rawPositions: TraccarPosition[],
  deviceId: number | string
): { valid: GpsPoint[]; rejected: any[]; testExcluded: any[] } => {
  const rejected: any[] = [];
  const testExcluded: any[] = [];
  const valid: GpsPoint[] = [];

  if (!rawPositions || !Array.isArray(rawPositions)) {
    return { valid, rejected, testExcluded };
  }

  rawPositions.forEach((p) => {
    const lat = Number(p.latitude);
    const lng = Number(p.longitude);
    const timeStr = p.fixTime || p.deviceTime || p.serverTime;
    const timeMs = timeStr ? new Date(timeStr).getTime() : NaN;

    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180 ||
      isNaN(timeMs)
    ) {
      rejected.push(p);
      return;
    }

    if (isKnownTestPosition(p)) {
      testExcluded.push(p);
      return;
    }

    // Convert speed in knots from Traccar to km/h (1 knot = 1.852 km/h)
    const rawSpeed = Number(p.speed) || 0;
    const speedKmh = Math.round(rawSpeed * 1.852 * 10) / 10;
    const heading = Math.round(Number(p.course) || 0);

    valid.push({
      id: p.id,
      lat,
      lng,
      speed: speedKmh,
      heading,
      timestamp: new Date(timeMs).toISOString(),
      timeMs,
      attributes: p.attributes,
    });
  });

  // Strict chronological sort: oldest -> newest
  valid.sort((a, b) => a.timeMs - b.timeMs);

  return { valid, rejected, testExcluded };
};

/**
 * Segments validated GPS track into contiguous physical journeys.
 * Guarantees that no polyline is ever drawn across GPS jumps or teleports.
 */
export const segmentRealGpsTrack = (
  validPoints: GpsPoint[]
): { segments: GpsSegment[]; jumps: JumpDiagnostic[] } => {
  const segments: GpsSegment[] = [];
  const jumps: JumpDiagnostic[] = [];

  if (validPoints.length === 0) {
    return { segments, jumps };
  }

  let currentPoints: GpsPoint[] = [];
  let currentDist = 0;

  for (let i = 0; i < validPoints.length; i++) {
    const pt = validPoints[i];

    if (currentPoints.length === 0) {
      currentPoints.push(pt);
      continue;
    }

    const prev = currentPoints[currentPoints.length - 1];
    const distKm = calculateHaversineDistanceKm(prev.lat, prev.lng, pt.lat, pt.lng);
    const deltaSec = Math.max(1, (pt.timeMs - prev.timeMs) / 1000);
    const impliedSpeedKmh = distKm / (deltaSec / 3600);

    let jumpReason = '';
    if (distKm > 3.0) {
      jumpReason = `Saut de distance > 3.0 km (${distKm.toFixed(2)} km)`;
    } else if (distKm > 0.5 && impliedSpeedKmh > 160) {
      jumpReason = `Vitesse implicite irréaliste (${impliedSpeedKmh.toFixed(1)} km/h sur ${distKm.toFixed(2)} km)`;
    } else if (deltaSec > 900 && distKm > 1.0) {
      jumpReason = `Interruption de communication > 15 min (${Math.round(deltaSec / 60)} min, ${distKm.toFixed(2)} km)`;
    }

    if (jumpReason) {
      jumps.push({
        jumpIndex: jumps.length + 1,
        fromPoint: prev,
        toPoint: pt,
        distanceKm: Number(distKm.toFixed(2)),
        deltaTimeSec: Math.round(deltaSec),
        impliedSpeedKmh: Number(impliedSpeedKmh.toFixed(1)),
        reason: jumpReason,
      });

      // Finalize current segment
      const sStart = currentPoints[0];
      const sEnd = currentPoints[currentPoints.length - 1];
      const sDuration = Math.max(0, Math.round((sEnd.timeMs - sStart.timeMs) / 1000));
      const sSpeedSum = currentPoints.reduce((acc, p) => acc + p.speed, 0);
      const sMaxSpeed = currentPoints.reduce((acc, p) => Math.max(acc, p.speed), 0);

      segments.push({
        id: `seg-${segments.length + 1}`,
        segmentIndex: segments.length + 1,
        points: currentPoints,
        distanceKm: Number(currentDist.toFixed(2)),
        durationSec: sDuration,
        avgSpeedKmh: Number((sSpeedSum / currentPoints.length).toFixed(1)),
        maxSpeedKmh: sMaxSpeed,
        startTime: sStart.timestamp,
        endTime: sEnd.timestamp,
      });

      // Start new contiguous segment
      currentPoints = [pt];
      currentDist = 0;
    } else {
      currentDist += distKm;
      currentPoints.push(pt);
    }
  }

  // Push final segment
  if (currentPoints.length > 0) {
    const sStart = currentPoints[0];
    const sEnd = currentPoints[currentPoints.length - 1];
    const sDuration = Math.max(0, Math.round((sEnd.timeMs - sStart.timeMs) / 1000));
    const sSpeedSum = currentPoints.reduce((acc, p) => acc + p.speed, 0);
    const sMaxSpeed = currentPoints.reduce((acc, p) => Math.max(acc, p.speed), 0);

    segments.push({
      id: `seg-${segments.length + 1}`,
      segmentIndex: segments.length + 1,
      points: currentPoints,
      distanceKm: Number(currentDist.toFixed(2)),
      durationSec: sDuration,
      avgSpeedKmh: Number((sSpeedSum / currentPoints.length).toFixed(1)),
      maxSpeedKmh: sMaxSpeed,
      startTime: sStart.timestamp,
      endTime: sEnd.timestamp,
    });
  }

  return { segments, jumps };
};

/**
 * Main entry point: transforms raw Traccar telemetry into unified, jump-protected
 * trip data for Map rendering, Replay player and Distance calculations.
 */
export const processTraccarPositions = (
  rawPositions: TraccarPosition[],
  deviceId: number | string
): ProcessedTripHistory => {
  const { valid, rejected, testExcluded } = normalizeAndValidatePositions(rawPositions, deviceId);
  const { segments, jumps } = segmentRealGpsTrack(valid);

  // Single unified array for Map, Replay & Bounds (zero desynchronization)
  const displayPositions: GpsPoint[] = segments.flatMap((s) => s.points);
  const totalDistanceKm = Number(segments.reduce((acc, s) => acc + s.distanceKm, 0).toFixed(2));

  let totalDurationSec = 0;
  if (displayPositions.length > 1) {
    totalDurationSec = Math.max(
      0,
      Math.round((displayPositions[displayPositions.length - 1].timeMs - displayPositions[0].timeMs) / 1000)
    );
  }

  const speedSum = displayPositions.reduce((acc, p) => acc + p.speed, 0);
  const avgSpeedKmh = displayPositions.length > 0 ? Number((speedSum / displayPositions.length).toFixed(1)) : 0;
  const maxSpeedKmh = displayPositions.reduce((acc, p) => Math.max(acc, p.speed), 0);

  let minLat = 90,
    maxLat = -90,
    minLng = 180,
    maxLng = -180;

  displayPositions.forEach((p) => {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  });

  const diagnostic: GpsDiagnosticReport = {
    deviceId,
    rawCount: rawPositions ? rawPositions.length : 0,
    validCount: valid.length,
    rejectedCount: rejected.length,
    testPointsExcluded: testExcluded.length,
    segmentsCount: segments.length,
    jumpsDetected: jumps.length,
    totalRealDistanceKm: totalDistanceKm,
    jumps,
    minLat: displayPositions.length > 0 ? minLat : undefined,
    maxLat: displayPositions.length > 0 ? maxLat : undefined,
    minLng: displayPositions.length > 0 ? minLng : undefined,
    maxLng: displayPositions.length > 0 ? maxLng : undefined,
  };

  const startPt = displayPositions[0];
  const endPt = displayPositions[displayPositions.length - 1];

  return {
    segments,
    displayPositions,
    totalDistanceKm,
    totalDurationSec,
    avgSpeedKmh,
    maxSpeedKmh,
    diagnostic,
    startAddress: startPt ? `${startPt.lat.toFixed(5)}, ${startPt.lng.toFixed(5)}` : 'N/D',
    endAddress: endPt ? `${endPt.lat.toFixed(5)}, ${endPt.lng.toFixed(5)}` : 'N/D',
  };
};
