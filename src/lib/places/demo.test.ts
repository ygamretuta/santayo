import { describe, expect, it } from "vitest";
import { demoRestaurant, demoSearch } from "./demo";

const manila = { lat: 14.5995, lng: 120.9842 };

describe("demo data", () => {
  it("is deterministic and round-trips by id", () => {
    const list = demoSearch("Fried Chicken", manila, 5);
    expect(list).toHaveLength(12);
    expect(demoRestaurant(list[3].id)?.name).toBe(list[3].name);
    expect(list.every((r) => (r.distanceKm ?? 99) <= 5)).toBe(true);
  });
  it("rejects malformed ids", () => {
    expect(demoRestaurant("demo.../etc")).toBeNull();
  });
});
