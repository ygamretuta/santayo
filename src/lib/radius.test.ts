import { describe, expect, it } from "vitest";
import { clampRadius, DEFAULT_RADIUS_KM, formatRadius, nextRadius, parseRadius } from "./radius";

describe("radius", () => {
  it("defaults to 500 m", () => {
    expect(DEFAULT_RADIUS_KM).toBe(0.5);
    expect(parseRadius(undefined)).toBe(0.5);
    expect(parseRadius(null)).toBe(0.5);
    expect(parseRadius("")).toBe(0.5);
  });
  it("accepts only the offered radii", () => {
    expect(parseRadius("0.5")).toBe(0.5);
    expect(parseRadius("5")).toBe(5);
    expect(parseRadius("10")).toBe(10);
    expect(parseRadius("7")).toBe(0.5);
    expect(parseRadius("abc")).toBe(0.5);
  });
  it("clamps API input to 0.5-10 km", () => {
    expect(clampRadius(0.1)).toBe(0.5);
    expect(clampRadius(3)).toBe(3);
    expect(clampRadius(99)).toBe(10);
    expect(clampRadius(NaN)).toBe(0.5);
  });
  it("formats metres and kilometres", () => {
    expect(formatRadius(0.5)).toBe("500 m");
    expect(formatRadius(5)).toBe("5 km");
    expect(formatRadius(10)).toBe("10 km");
  });
  it("finds the next larger radius", () => {
    expect(nextRadius(0.5)).toBe(5);
    expect(nextRadius(5)).toBe(10);
    expect(nextRadius(10)).toBeNull();
  });
});
