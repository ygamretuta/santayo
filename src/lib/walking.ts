/* Walking time: real figures from Google's Routes API when available, otherwise an honest estimate. */

export interface Walk {
  minutes: number;
  meters: number;
  /** True when computed from straight-line distance rather than a real route. */
  estimate: boolean;
}

/*
 * Fitted to 48 real Google walking routes around Baguio (hilly, winding streets): routes ran a
 * median 1.42x the straight line at a median 65 m/min. That brought the average error from
 * 3.5 min (1.35x at 80 m/min) down to 2.2 min. Real routes replace these whenever Google answers.
 */
const WINDING_FACTOR = 1.4;
/** 3.9 km/h effective, including slopes and crossings. */
const METERS_PER_MINUTE = 65;

export function estimateWalk(straightKm: number): Walk {
  const meters = Math.round(straightKm * 1000 * WINDING_FACTOR);
  return { minutes: Math.max(1, Math.round(meters / METERS_PER_MINUTE)), meters, estimate: true };
}

/** "6 min", "~6 min" for an estimate, "1 h 5 min" past an hour. */
export function formatWalkTime(w: Walk): string {
  const text = w.minutes < 60 ? `${w.minutes} min` : `${Math.floor(w.minutes / 60)} h${w.minutes % 60 ? ` ${w.minutes % 60} min` : ""}`;
  return w.estimate ? `~${text}` : text;
}

/** Google durations look like "512s". */
export function parseDurationSeconds(d: unknown): number | null {
  const m = typeof d === "string" ? /^(\d+(?:\.\d+)?)s$/.exec(d) : null;
  return m ? Number(m[1]) : null;
}

/**
 * A real route that is much longer than the straight line (the "430 m away" place that is an
 * 860 m walk). Worth showing; ordinary 1.2-1.4x routes are not.
 */
export function isDetour(w: Walk, straightKm: number | undefined): boolean {
  if (w.estimate || straightKm === undefined) return false;
  const straightM = straightKm * 1000;
  return w.meters >= straightM * 1.6 && w.meters - straightM >= 150;
}

interface MatrixElement {
  destinationIndex?: number;
  condition?: string;
  distanceMeters?: number;
  duration?: string;
}

/** Routes API matrix response -> walking time per destination id. Elements without a route are skipped. */
export function parseRouteMatrix(elements: MatrixElement[], ids: readonly string[]): Record<string, Walk> {
  const out: Record<string, Walk> = {};
  for (const e of elements) {
    const id = e.destinationIndex !== undefined ? ids[e.destinationIndex] : undefined;
    const seconds = parseDurationSeconds(e.duration);
    if (!id || e.condition !== "ROUTE_EXISTS" || seconds === null || typeof e.distanceMeters !== "number") continue;
    out[id] = { minutes: Math.max(1, Math.round(seconds / 60)), meters: e.distanceMeters, estimate: false };
  }
  return out;
}
