export type PriceLevel = 0 | 1 | 2 | 3 | 4;

export interface Price {
  /** Average spend per person, in `currency`, when the provider gives a range. */
  avg?: number;
  currency?: string;
  /** Coarse 0-4 "$" level, used when no concrete range is available. */
  level?: PriceLevel;
}

export interface Review {
  author: string;
  avatar?: string;
  url?: string;
  rating: number;
  when: string;
  text: string;
}

/** How well a result fits the search: see lib/places/relevance.ts. */
export type Match = "strong" | "related" | "none";

export interface Restaurant {
  id: string;
  name: string;
  rating?: number;
  reviewCount?: number;
  price: Price;
  /** Provider photo references (resolved to URLs through /api/photo). */
  photos: string[];
  emoji?: string;
  category?: string;
  summary?: string;
  address?: string;
  /** City / locality, used to make social searches more precise. */
  area?: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  /** Other branches of the same chain hidden from search results. */
  otherBranches?: number;
  /** Fit to the search; set on search results. */
  match?: Match;
  /** Google place types; used on the server for scoring, stripped before sending. */
  types?: string[];
  openNow?: boolean;
  hours?: string[];
  phone?: string;
  website?: string;
  mapsUrl?: string;
  reviews: Review[];
}

export type DataSource = "google" | "demo";

export interface SearchResult {
  source: DataSource;
  restaurants: Restaurant[];
}

export type MenuKind = "pdf" | "image" | "page";

export interface Menu {
  url: string;
  kind: MenuKind;
  /** False when the target forbids framing, so we can only link out to it. */
  embeddable: boolean;
}
