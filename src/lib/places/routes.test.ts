import { describe, expect, it } from "vitest";
import type { Walk } from "../walking";
import { fetchWalkMatrix, MAX_WALK_IDS, walkingTimes, type WalkCache } from "./routes";

const ORIGIN = { lat: 16.4115, lng: 120.5953 };
const ok = (elements: unknown[]) => new Response(JSON.stringify(elements), { status: 200 });
const denied = () => new Response(JSON.stringify([{ error: { code: 403, message: "Permission denied on the service.", status: "PERMISSION_DENIED" } }]), { status: 403 });

function fakeFetch(res: () => Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  const f = (async (url: string, init: RequestInit) => (calls.push({ url: String(url), init }), res())) as unknown as typeof fetch;
  return { f, calls };
}

function memoryCache(initial: Record<string, Walk> = {}, disabled = false) {
  const store: Record<string, Walk> = { ...initial };
  let off = disabled;
  const cache: WalkCache = {
    get: async (_o, ids) => Object.fromEntries(ids.filter((id) => store[id]).map((id) => [id, store[id]])),
    set: async (_o, walks) => void Object.assign(store, walks),
    isDisabled: async () => off,
    disable: async () => void (off = true),
  };
  return { cache, store, isOff: () => off };
}

describe("fetchWalkMatrix", () => {
  it("sends one origin, place-id destinations and WALK mode, asking only for the fields we use", async () => {
    const { f, calls } = fakeFetch(() => ok([{ destinationIndex: 0, condition: "ROUTE_EXISTS", distanceMeters: 300, duration: "240s" }]));
    const out = await fetchWalkMatrix(ORIGIN, ["placeA"], "KEY", f);
    expect(out).toEqual({ placeA: { minutes: 4, meters: 300, estimate: false } });
    expect(calls[0].url).toBe("https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("KEY");
    expect(headers["X-Goog-FieldMask"]).toBe("originIndex,destinationIndex,duration,distanceMeters,condition");
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.travelMode).toBe("WALK");
    expect(body.origins).toEqual([{ waypoint: { location: { latLng: { latitude: 16.4115, longitude: 120.5953 } } } }]);
    expect(body.destinations).toEqual([{ waypoint: { placeId: "placeA" } }]);
  });
  it("throws a RoutesError with Google's message and status", async () => {
    await expect(fetchWalkMatrix(ORIGIN, ["a"], "K", fakeFetch(denied).f)).rejects.toMatchObject({ name: "RoutesError", status: 403, message: "Permission denied on the service." });
  });
});

describe("walkingTimes", () => {
  const route = (i: number, m: number, s: number) => ({ destinationIndex: i, condition: "ROUTE_EXISTS", distanceMeters: m, duration: `${s}s` });

  it("asks Google only for places it hasn't cached, then caches the new ones", async () => {
    const { cache, store } = memoryCache({ a: { minutes: 3, meters: 200, estimate: false } });
    const { f, calls } = fakeFetch(() => ok([route(0, 500, 420)]));
    const r = await walkingTimes(ORIGIN, ["a", "b"], { fetch: f, cache, key: "K" });
    expect(r.available).toBe(true);
    expect(r.routes).toEqual({ a: { minutes: 3, meters: 200, estimate: false }, b: { minutes: 7, meters: 500, estimate: false } });
    expect(JSON.parse(calls[0].init.body as string).destinations).toEqual([{ waypoint: { placeId: "b" } }]); // only "b"
    expect(store.b).toBeDefined();
  });

  it("makes no request at all when everything is cached", async () => {
    const { cache } = memoryCache({ a: { minutes: 3, meters: 200, estimate: false } });
    const { f, calls } = fakeFetch(() => ok([]));
    expect((await walkingTimes(ORIGIN, ["a"], { fetch: f, cache, key: "K" })).routes.a.minutes).toBe(3);
    expect(calls).toHaveLength(0);
  });

  it("when Google says the Routes API is denied: returns nothing, flags it, and stops asking", async () => {
    const m = memoryCache();
    const { f, calls } = fakeFetch(denied);
    const first = await walkingTimes(ORIGIN, ["a"], { fetch: f, cache: m.cache, key: "K" });
    expect(first).toEqual({ routes: {}, available: false });
    expect(m.isOff()).toBe(true);
    await walkingTimes(ORIGIN, ["a"], { fetch: f, cache: m.cache, key: "K" });
    expect(calls).toHaveLength(1); // second call skipped the network
  });

  it("does not disable on a transient error", async () => {
    const m = memoryCache();
    const r = await walkingTimes(ORIGIN, ["a"], { fetch: fakeFetch(() => new Response("{}", { status: 500 })).f, cache: m.cache, key: "K" });
    expect(r.available).toBe(false);
    expect(m.isOff()).toBe(false);
  });

  it("reports unavailable with no API key and caps the request size", async () => {
    expect(await walkingTimes(ORIGIN, ["a"], { key: undefined })).toEqual({ routes: {}, available: false });
    const { f, calls } = fakeFetch(() => ok([]));
    const many = Array.from({ length: 25 }, (_, i) => `p${i}`);
    await walkingTimes(ORIGIN, many, { fetch: f, cache: memoryCache().cache, key: "K" });
    expect(JSON.parse(calls[0].init.body as string).destinations).toHaveLength(MAX_WALK_IDS);
  });
});
