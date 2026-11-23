import { describe, expect, it } from "vitest";
import { formatDistance, haversineKm } from "./geo";
import { accuracyIsPoor, formatAccuracy, isStale, roundCoord } from "./location";

describe("accuracyIsPoor", () => {
  it("allows an error of up to 20% of the radius, with a 100 m floor", () => {
    expect(accuracyIsPoor(60, 0.5)).toBe(false);
    expect(accuracyIsPoor(100, 0.5)).toBe(false);
    expect(accuracyIsPoor(180, 0.5)).toBe(true);
    expect(accuracyIsPoor(900, 5)).toBe(false);
    expect(accuracyIsPoor(1200, 5)).toBe(true);
    expect(accuracyIsPoor(1900, 10)).toBe(false);
    expect(accuracyIsPoor(2500, 10)).toBe(true);
  });
  it("doesn't warn when the accuracy is unknown (a typed place, an older saved fix)", () => {
    expect(accuracyIsPoor(undefined, 0.5)).toBe(false);
  });
});

describe("formatAccuracy", () => {
  it("shows metres in 5 m steps, then kilometres", () => {
    expect(formatAccuracy(37)).toBe("±35 m");
    expect(formatAccuracy(2)).toBe("±5 m");
    expect(formatAccuracy(960)).toBe("±960 m");
    expect(formatAccuracy(1540)).toBe("±1.5 km");
  });
});

describe("isStale", () => {
  it("is true only after ten minutes, and never for a fix with no timestamp", () => {
    const now = 1_000_000_000;
    expect(isStale(now - 5 * 60_000, now)).toBe(false);
    expect(isStale(now - 11 * 60_000, now)).toBe(true);
    expect(isStale(undefined, now)).toBe(false);
  });
});

describe("roundCoord", () => {
  // Just under a rounding boundary on both axes: the worst case for coarse rounding.
  const p = { lat: 16.41149, lng: 120.59549 };
  const errorM = (decimals: number) =>
    haversineKm(p, { lat: roundCoord(p.lat, decimals), lng: roundCoord(p.lng, decimals) }) * 1000;

  it("3 decimals (the old behaviour) can be about 75 m off, which is 15% of a 500 m radius", () => {
    expect(errorM(3)).toBeGreaterThan(60);
    expect(errorM(3)).toBeLessThan(90);
  });
  it("4 decimals keeps the error under 10 m", () => {
    expect(errorM(4)).toBeLessThan(10);
  });
});

describe("formatDistance", () => {
  it("rounds to 10 m below a kilometre instead of 100 m", () => {
    expect(formatDistance(0.46)).toBe("460 m");
    expect(formatDistance(0.304)).toBe("300 m");
    expect(formatDistance(0.087)).toBe("90 m");
    expect(formatDistance(0.999)).toBe("1000 m");
  });
  it("shows one decimal from a kilometre up", () => {
    expect(formatDistance(1)).toBe("1.0 km");
    expect(formatDistance(2.46)).toBe("2.5 km");
  });
});
