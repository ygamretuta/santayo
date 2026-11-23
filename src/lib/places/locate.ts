/* Turning a typed street, landmark or area into a place the visitor can pick as "where I am". */

export interface PlaceChoice {
  id: string;
  /** Short name, e.g. "Session Road". */
  label: string;
  /** Fuller line to tell similar places apart, e.g. "Session Rd, Baguio, Benguet". */
  address?: string;
  lat: number;
  lng: number;
  /** A whole city or area: distances would be measured from its middle, which is rarely where you are. */
  broad: boolean;
}

const BROAD_TYPES = new Set([
  "locality", "sublocality", "sublocality_level_1", "sublocality_level_2", "colloquial_area",
  "administrative_area_level_1", "administrative_area_level_2", "administrative_area_level_3",
  "country", "postal_code",
]);

export const isBroad = (types: readonly string[] = []) => types.some((t) => BROAD_TYPES.has(t));

/* eslint-disable @typescript-eslint/no-explicit-any -- raw Places API payload */
export function toChoice(p: any): PlaceChoice | null {
  const lat = p?.location?.latitude;
  const lng = p?.location?.longitude;
  const label = p?.displayName?.text;
  if (typeof lat !== "number" || typeof lng !== "number" || !label) return null;
  return {
    id: String(p.id ?? `${lat},${lng}`),
    label,
    address: typeof p.formattedAddress === "string" ? p.formattedAddress : undefined,
    lat,
    lng,
    broad: isBroad(p.types),
  };
}

/** Open-Meteo geocoding (no key needed): cities only, so always "broad". */
export function toChoiceFromGeocoder(r: any): PlaceChoice | null {
  if (typeof r?.latitude !== "number" || typeof r?.longitude !== "number" || !r?.name) return null;
  return {
    id: String(r.id ?? `${r.latitude},${r.longitude}`),
    label: r.name,
    address: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
    lat: r.latitude,
    lng: r.longitude,
    broad: true,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
