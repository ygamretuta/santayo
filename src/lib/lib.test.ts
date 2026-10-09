import { describe, expect, it } from "vitest";
import { dedupeRestaurants } from "./dedupe";
import { boundingBox, haversineKm } from "./geo";
import { averageOfRange, formatPrice } from "./price";
import { demoRestaurant, demoSearch } from "./places/demo";
import { socialLinks } from "./social";

const manila = { lat: 14.5995, lng: 120.9842 };

describe("geo", () => {
  it("computes distance", () => {
    expect(haversineKm(manila, { lat: 14.5547, lng: 121.0244 })).toBeCloseTo(6.4, 0);
    expect(haversineKm(manila, manila)).toBe(0);
  });
  it("bounding box contains the circle", () => {
    const b = boundingBox(manila, 10);
    expect(haversineKm(manila, { lat: b.high.latitude, lng: manila.lng })).toBeCloseTo(10, 1);
  });
});

describe("price", () => {
  it("averages a range", () => {
    expect(
      averageOfRange(
        { units: "400", currencyCode: "PHP" },
        { units: "600", currencyCode: "PHP" },
      ),
    ).toEqual({ avg: 500, currency: "PHP" });
  });
  it("handles open-ended ranges and missing data", () => {
    expect(averageOfRange({ units: "1000", currencyCode: "PHP" })?.avg).toBe(1000);
    expect(averageOfRange()).toBeNull();
  });
  it("formats avg, level, and unknown", () => {
    expect(formatPrice({ avg: 450, currency: "PHP" }).label).toContain("450");
    expect(formatPrice({ level: 2 }).label).toBe("$$");
    expect(formatPrice({}).label).toBeNull();
  });
});

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

describe("social", () => {
  it("builds encoded TikTok search links", () => {
    const s = socialLinks({ name: "Lola's Kitchen", area: "Makati" });
    expect(s.tiktok[0].href).toBe("https://www.tiktok.com/search?q=Lola's%20Kitchen%20Makati%20review");
    expect(s.tiktok.some((l) => l.href.endsWith("/tag/lolaskitchen"))).toBe(true);
  });
});

describe("dedupe", () => {
  const mk = (id: string, name: string, km: number, lat = 16.4, lng = 120.59): Parameters<typeof dedupeRestaurants>[0][number] => ({
    id, name, price: {}, photos: [], reviews: [], distanceKm: km, lat, lng,
  });
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
