import { describe, expect, it } from "vitest";
import { averageOfRange, formatPrice } from "./price";

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
