import type { Restaurant } from "./types";

export type Sort = "best" | "rating" | "price" | "distance";

export const SORTS: { id: Sort; label: string }[] = [
  { id: "best", label: "Best match" },
  { id: "rating", label: "Top rated" },
  { id: "price", label: "Lowest price" },
  { id: "distance", label: "Nearest" },
];

function priceRank(r: Restaurant) {
  // Concrete averages (already in one currency per search) beat coarse levels.
  if (r.price.avg != null) return r.price.avg;
  if (r.price.level != null) return r.price.level * 1000;
  return Infinity;
}

export function sortRestaurants(list: Restaurant[], sort: Sort): Restaurant[] {
  const copy = [...list];
  switch (sort) {
    case "rating":
      return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
    case "price":
      return copy.sort((a, b) => priceRank(a) - priceRank(b));
    case "distance":
      return copy.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    default:
      return copy;
  }
}
