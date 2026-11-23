/* Walking time: real figures from Google's Routes API when available, otherwise an honest estimate. */

export interface Walk {
  minutes: number;
  meters: number;
  /** True when computed from straight-line distance rather than a real route. */
  estimate: boolean;
}

/** Streets wind; a real route is typically about a third longer than the straight line. */
const WINDING_FACTOR = 1.35;
/** 4.8 km/h, an easy walking pace. */
const METERS_PER_MINUTE = 80;

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
