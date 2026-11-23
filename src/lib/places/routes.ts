import { trackGoogleCall } from "../admin/usage";
import { redis } from "../redis";
import { roundCoord } from "../location";
import { parseRouteMatrix, type Walk } from "../walking";
import { googleKey } from "./google";

/*
 * Real walking times from Google's Routes API (route matrix, WALK mode).
 * The Routes API must be enabled on the key's Google project; when it isn't, we remember that for
 * ten minutes and the UI falls back to estimates. Results are cached for a day per spot + place,
 * so paging back and forth doesn't bill again.
 */

const ENDPOINT = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";
const CACHE_SECONDS = 24 * 60 * 60;
const DISABLED_SECONDS = 10 * 60;
export const MAX_WALK_IDS = 10;

export class RoutesError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "RoutesError";
  }
}

type Fetch = typeof fetch;

/** One request: one origin to up to MAX_WALK_IDS places. Billed per origin-destination element. */
export async function fetchWalkMatrix(
  origin: { lat: number; lng: number },
  ids: string[],
  key: string,
  f: Fetch = fetch,
): Promise<Record<string, Walk>> {
  const res = await f(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,condition",
    },
    body: JSON.stringify({
      origins: [{ waypoint: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } } }],
      destinations: ids.map((placeId) => ({ waypoint: { placeId } })),
      travelMode: "WALK",
    }),
    cache: "no-store",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (Array.isArray(body) ? body[0]?.error : body?.error) ?? {};
    throw new RoutesError(res.status, String(err.message ?? `HTTP ${res.status}`).slice(0, 200));
  }
  return parseRouteMatrix(Array.isArray(body) ? body : [], ids);
}

/** Where cached walks and the "Routes API is off" flag live. */
export interface WalkCache {
  get(origin: string, ids: string[]): Promise<Record<string, Walk>>;
  set(origin: string, walks: Record<string, Walk>): Promise<void>;
  isDisabled(): Promise<boolean>;
  disable(): Promise<void>;
}

const originKey = (o: { lat: number; lng: number }) => `${roundCoord(o.lat)}:${roundCoord(o.lng)}`;

export const redisWalkCache: WalkCache = {
  async get(origin, ids) {
    if (!redis || ids.length === 0) return {};
    const rows = await redis.mget<(Walk | null)[]>(...ids.map((id) => `santayo:walk:${origin}:${id}`));
    const out: Record<string, Walk> = {};
    ids.forEach((id, i) => rows[i] && (out[id] = rows[i]!));
    return out;
  },
  async set(origin, walks) {
    if (!redis) return;
    const p = redis.pipeline();
    for (const [id, w] of Object.entries(walks)) p.set(`santayo:walk:${origin}:${id}`, w, { ex: CACHE_SECONDS });
    await p.exec();
  },
  async isDisabled() {
    return redis ? Boolean(await redis.get("santayo:walk:disabled")) : false;
  },
  async disable() {
    await redis?.set("santayo:walk:disabled", "1", { ex: DISABLED_SECONDS });
  },
};

export interface WalkResult {
  routes: Record<string, Walk>;
  /** False when real routes can't be had (no key, Routes API off); the UI then estimates. */
  available: boolean;
}

export async function walkingTimes(
  origin: { lat: number; lng: number },
  ids: string[],
  deps: { fetch?: Fetch; cache?: WalkCache; key?: string | undefined } = {},
): Promise<WalkResult> {
  const key = "key" in deps ? deps.key : googleKey();
  const cache = deps.cache ?? redisWalkCache;
  if (!key) return { routes: {}, available: false };

  const wanted = ids.slice(0, MAX_WALK_IDS);
  const here = originKey(origin);
  const cached = await cache.get(here, wanted).catch(() => ({}) as Record<string, Walk>);
  const missing = wanted.filter((id) => !cached[id]);
  if (missing.length === 0) return { routes: cached, available: true };
  if (await cache.isDisabled().catch(() => false)) return { routes: cached, available: Object.keys(cached).length > 0 };

  try {
    const fresh = await fetchWalkMatrix(origin, missing, key, deps.fetch);
    trackGoogleCall("route", true, missing.length);
    await cache.set(here, fresh).catch(() => {});
    return { routes: { ...cached, ...fresh }, available: true };
  } catch (e) {
    trackGoogleCall("route", false, 0); // a failed request is not billed: count the error, not elements
    // 401/403: the Routes API isn't enabled or allowed for this key. Stop asking for a while.
    if (e instanceof RoutesError && (e.status === 401 || e.status === 403)) await cache.disable().catch(() => {});
    return { routes: cached, available: Object.keys(cached).length > 0 };
  }
}
