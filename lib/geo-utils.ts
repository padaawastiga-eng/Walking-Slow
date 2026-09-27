/**
 * Geodesic Utilities for GPS Navigation
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_METERS = 6371000; // Mean earth radius in meters

/**
 * Converts degrees to radians
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees
 */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculates exact geodesic Haversine distance between two points in meters
 */
export function getHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculates initial geodesic bearing from point 1 to point 2 in degrees (0..360)
 */
export function getGeodesicBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δλ = toRadians(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  const bearing = (toDegrees(θ) + 360) % 360;

  return bearing;
}

/**
 * Calculates the shortest distance from a point to a line segment (a - b) in meters
 * and returns the nearest point on the line segment.
 */
export function getDistanceToSegment(
  p: LatLng,
  a: LatLng,
  b: LatLng
): { distance: number; closestPoint: LatLng } {
  // Convert lat/lng to approximate local Mercator projection in meters
  const latAvg = toRadians((a.lat + b.lat + p.lat) / 3);
  const cosLat = Math.cos(latAvg);

  const px = p.lng * cosLat * ((2 * Math.PI * EARTH_RADIUS_METERS) / 360);
  const py = p.lat * ((2 * Math.PI * EARTH_RADIUS_METERS) / 360);

  const ax = a.lng * cosLat * ((2 * Math.PI * EARTH_RADIUS_METERS) / 360);
  const ay = a.lat * ((2 * Math.PI * EARTH_RADIUS_METERS) / 360);

  const bx = b.lng * cosLat * ((2 * Math.PI * EARTH_RADIUS_METERS) / 360);
  const by = b.lat * ((2 * Math.PI * EARTH_RADIUS_METERS) / 360);

  const dx = bx - ax;
  const dy = by - ay;

  if (dx === 0 && dy === 0) {
    return {
      distance: getHaversineDistance(p.lat, p.lng, a.lat, a.lng),
      closestPoint: a,
    };
  }

  // Projection scalar t along line segment ab
  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projY = ay + t * dy;

  // Convert back to lat/lng
  const closestLat = projY / ((2 * Math.PI * EARTH_RADIUS_METERS) / 360);
  const closestLng =
    projX / (cosLat * ((2 * Math.PI * EARTH_RADIUS_METERS) / 360));

  const distance = getHaversineDistance(p.lat, p.lng, closestLat, closestLng);

  return {
    distance,
    closestPoint: { lat: closestLat, lng: closestLng },
  };
}

/**
 * Calculates perpendicular/shortest distance from a user position to a polyline route
 */
export function getDistanceToPolyline(
  userPos: LatLng,
  polyline: LatLng[]
): { minDistance: number; closestPoint: LatLng; segmentIndex: number } {
  if (polyline.length < 2) {
    const dist = polyline.length === 1 ? getHaversineDistance(userPos.lat, userPos.lng, polyline[0].lat, polyline[0].lng) : 0;
    return {
      minDistance: dist,
      closestPoint: polyline[0] || userPos,
      segmentIndex: 0,
    };
  }

  let minDistance = Infinity;
  let closestPoint = polyline[0];
  let segmentIndex = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const result = getDistanceToSegment(userPos, polyline[i], polyline[i + 1]);
    if (result.distance < minDistance) {
      minDistance = result.distance;
      closestPoint = result.closestPoint;
      segmentIndex = i;
    }
  }

  return { minDistance, closestPoint, segmentIndex };
}

/**
 * Calculate total distance of a polyline in meters
 */
export function getPolylineLength(polyline: LatLng[]): number {
  let total = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    total += getHaversineDistance(
      polyline[i].lat,
      polyline[i].lng,
      polyline[i + 1].lat,
      polyline[i + 1].lng
    );
  }
  return total;
}

/**
 * Returns human-readable relative direction instruction given target bearing vs heading
 */
export function getRelativeDirectionAdvice(
  bearing: number,
  heading: number | null
): { label: string; arrowRotation: number } {
  if (heading === null || isNaN(heading)) {
    return { label: 'Lurus Mengikuti Arah', arrowRotation: bearing };
  }

  // Relative angle diff (-180 to +180)
  let diff = (bearing - heading + 360) % 360;
  if (diff > 180) diff -= 360;

  let label = 'Lurus Ke Depan';
  if (diff >= -22.5 && diff <= 22.5) {
    label = 'LURUS KE DEPAN';
  } else if (diff > 22.5 && diff <= 67.5) {
    label = 'SERONG KANAN';
  } else if (diff > 67.5 && diff <= 112.5) {
    label = 'BELOK KANAN';
  } else if (diff > 112.5 && diff <= 157.5) {
    label = 'TAJAM KANAN';
  } else if (diff < -22.5 && diff >= -67.5) {
    label = 'SERONG KIRI';
  } else if (diff < -67.5 && diff >= -112.5) {
    label = 'BELOK KIRI';
  } else if (diff < -112.5 && diff >= -157.5) {
    label = 'TAJAM KIRI';
  } else {
    label = 'PUTAR BALIK';
  }

  return {
    label,
    arrowRotation: diff,
  };
}

/**
 * Formats distance in meters or kilometers
 */
export function formatDistance(meters: number): string {
  if (isNaN(meters) || meters < 0) return '0 m';
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Formats speed in km/h from m/s or km/h
 */
export function formatSpeed(speedMetersPerSec: number | null): string {
  if (speedMetersPerSec === null || isNaN(speedMetersPerSec) || speedMetersPerSec < 0) {
    return '0,0 km/jam';
  }
  const kmh = speedMetersPerSec * 3.6;
  return `${kmh.toFixed(1).replace('.', ',')} km/jam`;
}

/**
 * Formats time duration in HH:MM:SS or MM:SS
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Calculates estimated time remaining in seconds given remaining distance and current speed
 */
export function calculateETA(distanceMeters: number, speedMps: number | null): string {
  // Default walking speed: ~1.25 m/s (4.5 km/h) if current speed is unavailable or stationary
  const effectiveSpeed = (speedMps && speedMps > 0.3) ? speedMps : 1.25;
  const timeSeconds = distanceMeters / effectiveSpeed;
  return formatDuration(timeSeconds);
}
