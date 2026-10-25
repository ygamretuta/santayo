import { cache } from "react";
import { connection } from "next/server";
import type { Restaurant, SearchResult } from "../types";
import { dedupeRestaurants } from "./dedupe";
import { demoRestaurant, demoSearch, isDemoId } from "./demo";
import { googleDetails, googleKey, googleSearch } from "./google";

export const usingGoogle = () => Boolean(googleKey());

export async function searchRestaurants(
  query: string,
  origin: { lat: number; lng: number },
  radiusKm: number,
): Promise<SearchResult> {
  if (usingGoogle()) {
    return { source: "google", restaurants: dedupeRestaurants(await googleSearch(query, origin, radiusKm)) };
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
