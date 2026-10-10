"use client";

import { useEffect, useState } from "react";
import type { DataSource, Restaurant } from "@/lib/types";
import type { Coords } from "./useCoords";

export type SearchState =
  | { restaurants: Restaurant[]; source: DataSource }
  | { error: string };

type Loaded = { key: string } & SearchState;

/**
 * Fetches /api/search for the current term, radius and location.
 * Returns null while a request for the current inputs is in flight.
 */
export function useRestaurantSearch(q: string, radius: number, coords: Coords | null): SearchState | null {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  // Coordinates are rounded (~110 m) before leaving the device.
  const lat = coords ? Math.round(coords.lat * 1000) / 1000 : null;
  const lng = coords ? Math.round(coords.lng * 1000) / 1000 : null;
  const key = lat != null && lng != null ? `${q}|${radius}|${lat}|${lng}` : null;

  useEffect(() => {
    if (!key) return;
    const ac = new AbortController();
    const params = new URLSearchParams({ q, lat: String(lat), lng: String(lng), r: String(radius) });
    fetch(`/api/search?${params}`, { signal: ac.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Search failed");
        setLoaded({ key, restaurants: body.restaurants, source: body.source });
      })
      .catch((err) => {
        if (err.name !== "AbortError") setLoaded({ key, error: err.message });
      });
    return () => ac.abort();
  }, [key, q, lat, lng, radius]);

  return loaded && loaded.key === key ? loaded : null;
}
