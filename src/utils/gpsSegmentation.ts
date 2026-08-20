import { TraccarPosition, RoutePoint } from '../types';

export interface GpsSegment {
  id: string;
  points: RoutePoint[];
  distanceKm: number;
  durationSec: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  startTime: string;
  endTime: string;
}

export interface GpsDebugInfo {
  deviceId: number | string;
  rawCount: number;
  validCount: number;
  rejectedCount: number;
  testPointsExcluded: number;
  segmentsCount: number;
  jumpsDetected: number;
  totalRealDistanceKm: number;
  firstTimestamp?: string;
  lastTimestamp?: string;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}

export interface ProcessedTripHistory {
  segments: GpsSegment[];
  allValidPoints: RoutePoint[];
  totalDistanceKm: number;
  totalDurationSec: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  debugInfo: GpsDebugInfo;
  startAddress: string;
  endAddress: string;
}

/**
 * Deterministically identifies development/deployment bootstrap test packets.
 * Specifically detects the synthetic test frame injected during port 5055 connectivity validation
 * (Centre de Dakar: Lat 14.6937, Lng -17.4583 on 2026-08-20) without affecting legitimate telemetry.
 */
export const isKnownTestPosition = (
  lat: number,
  lng: number,
  timestampStr?: string
): boolean => {
  if (!timestampStr) return false;

  // Exact coordinates of synthetic bootstrap test packet
  const isBootstrapCoord = Math.abs(lat - 14.6937) < 0.0001 && Math.abs(lng - (-17.4583)) < 0.0001;
  const isBootstrapTime = timestampStr.startsWith('2026-08-20T21:34:24');

  return isBootstrapCoord && isBootstrapTime;
};

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
 * Processes raw Traccar positions into validated, chronologically sorted, and jump-protected segments.
 * Eliminates artificial straight lines and legacy test packets without touching database storage.
 */
export const processTraccarPositions = (
  rawPositions: TraccarPosition[],
  deviceId: number | string
): ProcessedTripHistory => {
  const debugInfo: GpsDebugInfo = {
    deviceId,
    rawCount: rawPositions ? rawPositions.length : 0,
    validCount: 0,
    rejectedCount: 0,
    testPointsExcluded: 0,
    segmentsCount: 0,
    jumpsDetected: 0,
    totalRealDistanceKm: 0,
  };

  if (!rawPositions || rawPositions.length === 0) {
    return {
      segments: [],
      allValidPoints: [],
      totalDistanceKm: 0,
      totalDurationSec: 0,
      avgSpeedKmh: 0,
      maxSpeedKmh: 0,
      debugInfo,
      startAddress: 'N/D',
      endAddress: 'N/D',
    };
  }

  // 1. Validation, Test Filter & Numerical Bounds Check
  const validPoints: (RoutePoint & { timeMs: number })[] = [];
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  rawPositions.forEach((p) => {
    const lat = Number(p.latitude);
    const lng = Number(p.longitude);
    const timeStr = p.fixTime || p.deviceTime || p.serverTime;
    const timeMs = timeStr ? new Date(timeStr).getTime() : NaN;

    if (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      !isNaN(timeMs)
    ) {
      // Exclude legacy test packet
      if (isKnownTestPosition(lat, lng, timeStr)) {
        debugInfo.testPointsExcluded++;
        return;
      }

      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;

      // Speed in knots from Traccar converted to km/h (1 knot = 1.852 km/h)
      const rawSpeed = Number(p.speed) || 0;
      const speedKmh = Math.round(rawSpeed * 1.852 * 10) / 10;
      const heading = Math.round(Number(p.course) || 0);

      validPoints.push({
        lat,
        lng,
        speed: speedKmh,
        heading,
        timestamp: new Date(timeMs).toISOString(),
        timeMs,
      });
    } else {
      debugInfo.rejectedCount++;
    }
  });

  debugInfo.validCount = validPoints.length;

  if (validPoints.length === 0) {
    return {
      segments: [],
      allValidPoints: [],
      totalDistanceKm: 0,
      totalDurationSec: 0,
      avgSpeedKmh: 0,
      maxSpeedKmh: 0,
      debugInfo,
      startAddress: 'N/D',
      endAddress: 'N/D',
    };
  }

  // 2. Strict Chronological Sort (Oldest -> Newest)
  validPoints.sort((a, b) => a.timeMs - b.timeMs);

  debugInfo.firstTimestamp = validPoints[0].timestamp;
  debugInfo.lastTimestamp = validPoints[validPoints.length - 1].timestamp;
  debugInfo.minLat = minLat;
  debugInfo.maxLat = maxLat;
  debugInfo.minLng = minLng;
  debugInfo.maxLng = maxLng;

  // 3. Build Realistic GPS Segments & Detect Jumps
  const segments: GpsSegment[] = [];
  let currentSegmentPoints: RoutePoint[] = [];
  let currentSegmentDist = 0;
  let overallTotalDist = 0;
  let overallMaxSpeed = 0;
  let overallSpeedSum = 0;

  for (let i = 0; i < validPoints.length; i++) {
    const pt = validPoints[i];
    if (pt.speed > overallMaxSpeed) overallMaxSpeed = pt.speed;
    overallSpeedSum += pt.speed;

    const routePt: RoutePoint = {
      lat: pt.lat,
      lng: pt.lng,
      speed: pt.speed,
      heading: pt.heading,
      timestamp: pt.timestamp,
    };

    if (currentSegmentPoints.length === 0) {
      currentSegmentPoints.push(routePt);
      continue;
    }

    const prevPt = currentSegmentPoints[currentSegmentPoints.length - 1];
    const prevTimeMs = new Date(prevPt.timestamp).getTime();
    const curTimeMs = pt.timeMs;

    const distKm = calculateHaversineDistanceKm(prevPt.lat, prevPt.lng, pt.lat, pt.lng);
    const deltaSec = Math.max(1, (curTimeMs - prevTimeMs) / 1000);
    const impliedSpeedKmh = distKm / (deltaSec / 3600);

    // Jump conditions:
    // 1. Distance jump > 3.0 km between 2 consecutive points
    // 2. Distance jump > 0.5 km with physically unrealistic speed (> 160 km/h)
    // 3. Time gap > 15 minutes (900s) AND distance > 1.0 km
    const isJump =
      distKm > 3.0 ||
      (distKm > 0.5 && impliedSpeedKmh > 160) ||
      (deltaSec > 900 && distKm > 1.0);

    if (isJump) {
      debugInfo.jumpsDetected++;

      // Finalize current segment
      const sStart = currentSegmentPoints[0];
      const sEnd = currentSegmentPoints[currentSegmentPoints.length - 1];
      const sStartMs = new Date(sStart.timestamp).getTime();
      const sEndMs = new Date(sEnd.timestamp).getTime();
      const sDuration = Math.max(0, Math.round((sEndMs - sStartMs) / 1000));
      const sSpeedSum = currentSegmentPoints.reduce((acc, p) => acc + p.speed, 0);
      const sMaxSpeed = currentSegmentPoints.reduce((acc, p) => Math.max(acc, p.speed), 0);

      segments.push({
        id: `seg-${segments.length + 1}`,
        points: currentSegmentPoints,
        distanceKm: Number(currentSegmentDist.toFixed(2)),
        durationSec: sDuration,
        avgSpeedKmh: Number((sSpeedSum / currentSegmentPoints.length).toFixed(1)),
        maxSpeedKmh: sMaxSpeed,
        startTime: sStart.timestamp,
        endTime: sEnd.timestamp,
      });

      // Start new segment
      currentSegmentPoints = [routePt];
      currentSegmentDist = 0;
    } else {
      currentSegmentDist += distKm;
      overallTotalDist += distKm;
      currentSegmentPoints.push(routePt);
    }
  }

  // Push final segment
  if (currentSegmentPoints.length > 0) {
    const sStart = currentSegmentPoints[0];
    const sEnd = currentSegmentPoints[currentSegmentPoints.length - 1];
    const sStartMs = new Date(sStart.timestamp).getTime();
    const sEndMs = new Date(sEnd.timestamp).getTime();
    const sDuration = Math.max(0, Math.round((sEndMs - sStartMs) / 1000));
    const sSpeedSum = currentSegmentPoints.reduce((acc, p) => acc + p.speed, 0);
    const sMaxSpeed = currentSegmentPoints.reduce((acc, p) => Math.max(acc, p.speed), 0);

    segments.push({
      id: `seg-${segments.length + 1}`,
      points: currentSegmentPoints,
      distanceKm: Number(currentSegmentDist.toFixed(2)),
      durationSec: sDuration,
      avgSpeedKmh: Number((sSpeedSum / currentSegmentPoints.length).toFixed(1)),
      maxSpeedKmh: sMaxSpeed,
      startTime: sStart.timestamp,
      endTime: sEnd.timestamp,
    });
  }

  debugInfo.segmentsCount = segments.length;
  debugInfo.totalRealDistanceKm = Number(overallTotalDist.toFixed(2));

  const totalDurationSec =
    validPoints.length > 1
      ? Math.max(0, Math.round((validPoints[validPoints.length - 1].timeMs - validPoints[0].timeMs) / 1000))
      : 0;

  const firstPt = validPoints[0];
  const lastPt = validPoints[validPoints.length - 1];

  return {
    segments,
    allValidPoints: validPoints.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      speed: p.speed,
      heading: p.heading,
      timestamp: p.timestamp,
    })),
    totalDistanceKm: Number(overallTotalDist.toFixed(2)),
    totalDurationSec,
    avgSpeedKmh: Number((overallSpeedSum / validPoints.length).toFixed(1)),
    maxSpeedKmh: overallMaxSpeed,
    debugInfo,
    startAddress: `${firstPt.lat.toFixed(5)}, ${firstPt.lng.toFixed(5)}`,
    endAddress: `${lastPt.lat.toFixed(5)}, ${lastPt.lng.toFixed(5)}`,
  };
};
