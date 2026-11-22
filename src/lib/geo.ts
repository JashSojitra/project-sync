import type { LngLat } from "@/lib/demo/types";

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Great-circle distance in kilometres. */
export function distanceKm(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Illustrative driving estimate, NOT live traffic. A deliberately simple model:
 * 1.35 road-circuity factor at a 34 km/h suburban average, plus 3 minutes to get moving.
 */
export function etaMinutes(a: LngLat, b: LngLat): number {
  const km = distanceKm(a, b) * 1.35;
  return Math.round(3 + (km / 34) * 60);
}

/** Point at `meters` from `origin` along `bearingDeg`. */
export function offset(origin: LngLat, meters: number, bearingDeg: number): LngLat {
  const d = meters / 1000 / EARTH_RADIUS_KM;
  const brng = toRad(bearingDeg);
  const lat1 = toRad(origin[1]);
  const lng1 = toRad(origin[0]);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lng2 =
    lng1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return [toDeg(lng2), toDeg(lat2)];
}

export function lerp(a: LngLat, b: LngLat, t: number): LngLat {
  const k = Math.min(1, Math.max(0, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
}

/** Initial bearing from a to b in degrees (0 = north). */
export function bearing(a: LngLat, b: LngLat): number {
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLng = toRad(b[0] - a[0]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Closed polygon ring approximating a circle, for GeoJSON layers. */
export function circleRing(center: LngLat, radiusKm: number, steps = 96): LngLat[] {
  const ring: LngLat[] = [];
  for (let i = 0; i <= steps; i++) ring.push(offset(center, radiusKm * 1000, (i / steps) * 360));
  return ring;
}

export function boundsOf(points: LngLat[]): [LngLat, LngLat] {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const [lng, lat] of points) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
