import { averageOfRange } from "../price";
import { boundingBox, haversineKm } from "../geo";
import type { PriceLevel, Restaurant, Review } from "../types";

const BASE = "https://places.googleapis.com/v1";

export const googleKey = () => process.env.GOOGLE_MAPS_API_KEY;

const PRICE_LEVELS: Record<string, PriceLevel> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

/* eslint-disable @typescript-eslint/no-explicit-any -- raw Places API payloads */
function mapPlace(p: any, origin?: { lat: number; lng: number }): Restaurant {
  const range = averageOfRange(p.priceRange?.startPrice, p.priceRange?.endPrice);
  const lat = p.location?.latitude as number | undefined;
  const lng = p.location?.longitude as number | undefined;
  const locality = p.addressComponents?.find((c: any) =>
    c.types?.includes("locality"),
  )?.longText;

  return {
    id: p.id,
    name: p.displayName?.text ?? "Unnamed restaurant",
    rating: p.rating,
    reviewCount: p.userRatingCount,
    price: {
      avg: range?.avg,
      currency: range?.currency,
      level: PRICE_LEVELS[p.priceLevel as string],
    },
    photos: (p.photos ?? []).slice(0, 8).map((ph: any) => ph.name as string),
    category: p.primaryTypeDisplayName?.text,
    summary: p.editorialSummary?.text,
    address: p.formattedAddress,
    area: locality,
    lat,
    lng,
    distanceKm:
      origin && lat != null && lng != null
        ? haversineKm(origin, { lat, lng })
        : undefined,
    openNow: p.currentOpeningHours?.openNow,
    hours: p.regularOpeningHours?.weekdayDescriptions,
    phone: p.nationalPhoneNumber,
    website: p.websiteUri,
    mapsUrl: p.googleMapsUri,
    reviews: (p.reviews ?? []).map(
      (r: any): Review => ({
        author: r.authorAttribution?.displayName ?? "Google user",
        avatar: r.authorAttribution?.photoUri,
        url: r.authorAttribution?.uri,
        rating: r.rating,
        when: r.relativePublishTimeDescription ?? "",
        text: r.text?.text ?? r.originalText?.text ?? "",
      }),
    ),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const SEARCH_FIELDS = [
  "places.id",
  "places.displayName",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.priceRange",
  "places.photos",
  "places.formattedAddress",
  "places.location",
  "places.primaryTypeDisplayName",
  "places.currentOpeningHours.openNow",
].join(",");

const DETAIL_FIELDS = [
  "id",
  "displayName",
  "rating",
  "userRatingCount",
  "priceLevel",
  "priceRange",
  "photos",
  "formattedAddress",
  "addressComponents",
  "location",
  "primaryTypeDisplayName",
  "editorialSummary",
  "currentOpeningHours.openNow",
  "regularOpeningHours.weekdayDescriptions",
  "nationalPhoneNumber",
  "websiteUri",
  "googleMapsUri",
  "reviews",
].join(",");

/** One request per search (Google caps text search at 20 places per request). */
export async function googleSearch(
  query: string,
  origin: { lat: number; lng: number },
  radiusKm: number,
): Promise<Restaurant[]> {
  const res = await fetch(`${BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": googleKey()!,
      "X-Goog-FieldMask": SEARCH_FIELDS,
    },
    body: JSON.stringify({
      textQuery: `${query} restaurant`,
      includedType: "restaurant",
      strictTypeFiltering: true,
      pageSize: 20,
      languageCode: "en",
      // Text search only restricts to rectangles; we trim to the circle below.
      locationRestriction: { rectangle: boundingBox(origin, radiusKm) },
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Places search failed (${res.status})`);
  const data = await res.json();

  return (data.places ?? [])
    .map((p: unknown) => mapPlace(p, origin))
    .filter((r: Restaurant) => r.distanceKm == null || r.distanceKm <= radiusKm);
}

export async function googleDetails(id: string): Promise<Restaurant | null> {
  const res = await fetch(`${BASE}/places/${encodeURIComponent(id)}?languageCode=en`, {
    headers: {
      "X-Goog-Api-Key": googleKey()!,
      "X-Goog-FieldMask": DETAIL_FIELDS,
    },
    next: { revalidate: 3600 },
  });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`Places details failed (${res.status})`);
  return mapPlace(await res.json());
}

/**
 * Streams a place photo; the API key never reaches the browser. Not stored in
 * Next's data cache (full-size photos exceed its 2 MB item limit and log an
 * error); /api/photo's Cache-Control header lets the CDN and browser cache it.
 */
export async function googlePhoto(name: string, width: number): Promise<Response> {
  return fetch(`${BASE}/${name}/media?maxWidthPx=${width}&key=${googleKey()}`, { cache: "no-store" });
}
