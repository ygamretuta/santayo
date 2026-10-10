import { describe, expect, it } from "vitest";
import { sortRestaurants } from "./sort";
import type { Restaurant } from "./types";

const mk = (id: string, o: Partial<Restaurant>): Restaurant => ({
  id, name: id, price: {}, photos: [], reviews: [], ...o,
});

const list = [
  mk("a", { rating: 4.0, reviewCount: 10, price: { avg: 500, currency: "PHP" }, distanceKm: 3 }),
  mk("b", { rating: 4.8, reviewCount: 5, price: { level: 1 }, distanceKm: 1 }),
  mk("c", { rating: 4.8, reviewCount: 50, price: {}, distanceKm: 2 }),
];
const ids = (l: Restaurant[]) => l.map((r) => r.id).join("");

describe("sortRestaurants", () => {
  it("keeps provider order for best match and never mutates the input", () => {
    expect(ids(sortRestaurants(list, "best"))).toBe("abc");
    sortRestaurants(list, "rating");
    expect(ids(list)).toBe("abc");
  });
  it("sorts by rating, breaking ties by review count", () => {
    expect(ids(sortRestaurants(list, "rating"))).toBe("cba");
  });
  it("sorts by price with unknown prices last", () => {
    expect(ids(sortRestaurants(list, "price"))).toBe("abc");
  });
  it("sorts by distance", () => {
    expect(ids(sortRestaurants(list, "distance"))).toBe("bca");
  });
});
