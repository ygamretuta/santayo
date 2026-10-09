import { cache } from "react";
import type { Restaurant, SearchResult } from "../types";
import { demoRestaurant, demoSearch, isDemoId } from "./demo";
import { googleDetails, googleKey, googleSearch } from "./google";

export const usingGoogle = () => Boolean(googleKey());

export async function searchRestaurants(
  query: string,
  origin: { lat: number; lng: number },
  radiusKm: number,
): Promise<SearchResult> {
  if (usingGoogle()) {
    return { source: "google", restaurants: await googleSearch(query, origin, radiusKm) };
  }
  return { source: "demo", restaurants: demoSearch(query, origin, radiusKm) };
}

export const getRestaurant = cache(async (id: string): Promise<Restaurant | null> => {
  if (!/^[\w.-]+$/.test(id)) return null;
  if (isDemoId(id)) return demoRestaurant(id);
  if (!usingGoogle()) return null;
  return googleDetails(id);
});
