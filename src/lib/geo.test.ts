import { describe, expect, it } from "vitest";
import { boundingBox, haversineKm } from "./geo";

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
