const EARTH_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

/** Axis-aligned box that fully contains the circle of `radiusKm` around `center`. */
export function boundingBox(
  center: { lat: number; lng: number },
  radiusKm: number,
) {
  const dLat = (radiusKm / EARTH_KM) * (180 / Math.PI);
  const dLng = dLat / Math.max(Math.cos(rad(center.lat)), 0.01);
  return {
    low: { latitude: center.lat - dLat, longitude: center.lng - dLng },
    high: { latitude: center.lat + dLat, longitude: center.lng + dLng },
  };
}

/** Point `km` away from `origin` along `bearingDeg` (small distances only). */
export function offsetPoint(
  origin: { lat: number; lng: number },
  km: number,
  bearingDeg: number,
) {
  const b = rad(bearingDeg);
  const dLat = ((km * Math.cos(b)) / EARTH_KM) * (180 / Math.PI);
  const dLng =
    ((km * Math.sin(b)) / (EARTH_KM * Math.max(Math.cos(rad(origin.lat)), 0.01))) *
    (180 / Math.PI);
  return { lat: origin.lat + dLat, lng: origin.lng + dLng };
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 10) * 100} m` : `${km.toFixed(1)} km`;
}
