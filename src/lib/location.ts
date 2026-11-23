/* Pure helpers for judging how much to trust the visitor's location. */

const STALE_AFTER_MS = 10 * 60_000;

/** A fix is "poor" when its error is more than 20% of the search radius (never tighter than 100 m). */
export function accuracyIsPoor(accuracyM: number | undefined, radiusKm: number): boolean {
  if (accuracyM === undefined) return false;
  return accuracyM > Math.max(100, radiusKm * 1000 * 0.2);
}

/** "±40 m" or "±1.2 km". */
export function formatAccuracy(accuracyM: number): string {
  return accuracyM < 1000 ? `±${Math.max(5, Math.round(accuracyM / 5) * 5)} m` : `±${(accuracyM / 1000).toFixed(1)} km`;
}

export function isStale(at: number | undefined, now = Date.now(), maxAgeMs = STALE_AFTER_MS): boolean {
  return at !== undefined && now - at > maxAgeMs;
}

/** Rounds a coordinate to `decimals` places: 4 is about 11 m, 3 about 110 m. */
export function roundCoord(value: number, decimals = 4): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
