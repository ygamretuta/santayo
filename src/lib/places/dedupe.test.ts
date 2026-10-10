import { describe, expect, it } from "vitest";
import type { Restaurant } from "../types";
import { dedupeRestaurants } from "./dedupe";

const mk = (id: string, name: string, km: number, lat = 16.4, lng = 120.59): Restaurant => ({
  id, name, price: {}, photos: [], reviews: [], distanceKm: km, lat, lng,
});

describe("dedupe", () => {
  it("merges branch suffixes after a dash or in parentheses", () => {
    const out = dedupeRestaurants([
      mk("a", "Jollibee - SM Baguio", 2),
      mk("b", "Jollibee (Session Rd)", 1, 16.41),
      mk("c", "Café Blake's", 1),
      mk("d", "Cafe Blakes", 1.2, 16.5),
    ]);
    expect(out.map((r) => r.id)).toEqual(["b", "c"]);
  });
  it("drops repeated ids and collapses chains to the nearest branch", () => {
    const out = dedupeRestaurants([
      mk("a", "Jollibee - SM", 2, 16.41),
      mk("b", "Jollibee (Session)", 0.8, 16.42),
      mk("a", "Jollibee - SM", 2, 16.41),
      mk("c", "Steak House", 1),
    ]);
    expect(out.map((r) => r.id)).toEqual(["b", "c"]);
    expect(out[0].otherBranches).toBe(1);
    expect(out[1].otherBranches).toBeUndefined();
  });
  it("merges a name with its location-suffixed variant but not different restaurants", () => {
    const out = dedupeRestaurants([
      mk("a", "Grumpy Joe", 3.2, 16.41),
      mk("b", "Grumpy Joe Upper Session Road", 0.9, 16.42),
      mk("c", "Burger King", 1),
      mk("d", "Burger Joint", 1.5),
      mk("e", "Burger", 2),
    ]);
    expect(out.map((r) => r.id).sort()).toEqual(["b", "c", "d", "e"]);
  });
  it("does not count a same-spot repeat as a branch", () => {
    const out = dedupeRestaurants([mk("a", "Grill", 1), mk("b", "Grill", 1.01)]);
    expect(out).toHaveLength(1);
    expect(out[0].otherBranches).toBeUndefined();
  });
});
