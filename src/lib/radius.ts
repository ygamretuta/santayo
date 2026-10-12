/** Search radii offered in the UI, smallest first. */
export const RADII_KM = [0.5, 5, 10] as const;

export const DEFAULT_RADIUS_KM = 0.5;
export const MIN_RADIUS_KM = RADII_KM[0];
export const MAX_RADIUS_KM = RADII_KM[RADII_KM.length - 1];

/** Radius from a URL/query value; anything that isn't an offered radius falls back to the default. */
export function parseRadius(value?: string | null): number {
  const n = Number(value);
  return (RADII_KM as readonly number[]).includes(n) ? n : DEFAULT_RADIUS_KM;
}

/** Clamps an arbitrary requested radius to the supported range (API input). */
export function clampRadius(km: number): number {
  return Number.isFinite(km) ? Math.min(Math.max(km, MIN_RADIUS_KM), MAX_RADIUS_KM) : DEFAULT_RADIUS_KM;
}

/** "500 m" below one kilometre, otherwise "5 km". */
export function formatRadius(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`;
}

/** The next larger offered radius, or null when already at the largest. */
export function nextRadius(km: number): number | null {
  return RADII_KM.find((r) => r > km) ?? null;
}
