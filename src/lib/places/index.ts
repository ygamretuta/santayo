import { cache } from "react";
import { connection } from "next/server";
import type { Restaurant, SearchResult } from "../types";
import { dedupeRestaurants } from "./dedupe";
import { demoRestaurant, demoSearch, isDemoId } from "./demo";
import { rankByMatch, scoreMatch } from "./relevance";
import { googleDetails, googleKey, googleLocate, googleSearch } from "./google";
import { toChoiceFromGeocoder, type PlaceChoice } from "./locate";

export const usingGoogle = () => Boolean(googleKey());

export async function searchRestaurants(
  query: string,
  origin: { lat: number; lng: number },
  radiusKm: number,
): Promise<SearchResult> {
  if (usingGoogle()) {
    const found = dedupeRestaurants(await googleSearch(query, origin, radiusKm));
    // Score, order best-fit first, and drop the raw types (server-side only).
    const scored = found.map(({ types, ...r }) => ({ ...r, match: scoreMatch({ name: r.name, types }, query) }));
    return { source: "google", restaurants: rankByMatch(scored) };
  }
  return { source: "demo", restaurants: demoSearch(query, origin, radiusKm) };
}

export const getRestaurant = cache(async (id: string): Promise<Restaurant | null> => {
  // Real lookups only: never during prerendering or dev-time validation with placeholder ids.
  await connection();
  if (!/^[\w.-]+$/.test(id)) return null;
  if (isDemoId(id)) return demoRestaurant(id);
  if (!usingGoogle()) return null;
  return googleDetails(id);
});

/** Up to five places matching what the visitor typed. Google when configured, else Open-Meteo (cities only). */
export async function locatePlaces(query: string, near?: { lat: number; lng: number }): Promise<PlaceChoice[]> {
  if (usingGoogle()) return googleLocate(query, near);
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`,
    { next: { revalidate: 86400 } },
  );
  if (!res.ok) throw new Error(`Geocoder failed (${res.status})`);
  const data = await res.json();
  return (data.results ?? []).map(toChoiceFromGeocoder).filter((c: PlaceChoice | null): c is PlaceChoice => c !== null);
}
