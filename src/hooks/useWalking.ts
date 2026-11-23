"use client";

import { useEffect, useState } from "react";
import { roundCoord } from "@/lib/location";
import type { Restaurant } from "@/lib/types";
import type { Walk } from "@/lib/walking";
import type { Coords } from "./useCoords";

interface Loaded {
  key: string;
  routes: Record<string, Walk>;
}

/**
 * Real walking times for the places on screen (one request per page of results).
 * Returns what's known so far; anything missing is shown as an estimate by the caller.
 */
export function useWalking(origin: Coords | null, places: Restaurant[]): Record<string, Walk> {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  // Demo places have no real route; Google ids contain only letters, digits, - and _.
  const ids = places.map((p) => p.id).filter((id) => /^[\w-]{10,}$/.test(id));
  const lat = origin ? roundCoord(origin.lat) : null;
  const lng = origin ? roundCoord(origin.lng) : null;
  const key = lat != null && lng != null && ids.length > 0 ? `${lat}|${lng}|${ids.join(",")}` : null;

  useEffect(() => {
    if (!key) return;
    const ac = new AbortController();
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng), ids: ids.join(",") });
    fetch(`/api/walk?${params}`, { signal: ac.signal })
      .then((res) => (res.ok ? res.json() : { routes: {} }))
      .then((body) => setLoaded({ key, routes: body.routes ?? {} }))
      .catch((err) => {
        if (err.name !== "AbortError") setLoaded({ key, routes: {} });
      });
    return () => ac.abort();
    // `ids` is derived from `key`, so depending on `key` covers it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return loaded && loaded.key === key ? loaded.routes : {};
}
