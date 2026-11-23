import { describe, expect, it } from "vitest";
import { estimateWalk, formatWalkTime, parseDurationSeconds, parseRouteMatrix } from "./walking";

describe("estimateWalk", () => {
  it("adds 35% for winding streets and walks at 80 m a minute", () => {
    expect(estimateWalk(0.3)).toEqual({ minutes: 5, meters: 405, estimate: true });
    expect(estimateWalk(1)).toEqual({ minutes: 17, meters: 1350, estimate: true });
  });
  it("never says 0 minutes", () => {
    expect(estimateWalk(0.01).minutes).toBe(1);
    expect(estimateWalk(0).minutes).toBe(1);
  });
});

describe("formatWalkTime", () => {
  it("marks estimates with a tilde and real routes without", () => {
    expect(formatWalkTime({ minutes: 6, meters: 400, estimate: true })).toBe("~6 min");
    expect(formatWalkTime({ minutes: 6, meters: 400, estimate: false })).toBe("6 min");
  });
  it("switches to hours past 60 minutes", () => {
    expect(formatWalkTime({ minutes: 65, meters: 5000, estimate: false })).toBe("1 h 5 min");
    expect(formatWalkTime({ minutes: 120, meters: 9000, estimate: false })).toBe("2 h");
  });
});

describe("parseDurationSeconds", () => {
  it("reads Google's '512s' format", () => {
    expect(parseDurationSeconds("512s")).toBe(512);
    expect(parseDurationSeconds("12.5s")).toBe(12.5);
    expect(parseDurationSeconds("5m")).toBeNull();
    expect(parseDurationSeconds(undefined)).toBeNull();
  });
});

describe("parseRouteMatrix", () => {
  const ids = ["placeA", "placeB", "placeC"];
  it("maps each element back to its place id", () => {
    const out = parseRouteMatrix(
      [
        { destinationIndex: 1, condition: "ROUTE_EXISTS", distanceMeters: 640, duration: "540s" },
        { destinationIndex: 0, condition: "ROUTE_EXISTS", distanceMeters: 210, duration: "170s" },
      ],
      ids,
    );
    expect(out).toEqual({
      placeB: { minutes: 9, meters: 640, estimate: false },
      placeA: { minutes: 3, meters: 210, estimate: false },
    });
  });
  it("skips places with no route, malformed elements and out-of-range indexes", () => {
    const out = parseRouteMatrix(
      [
        { destinationIndex: 0, condition: "ROUTE_NOT_FOUND" },
        { destinationIndex: 1, condition: "ROUTE_EXISTS", distanceMeters: 100 },
        { destinationIndex: 9, condition: "ROUTE_EXISTS", distanceMeters: 100, duration: "60s" },
        { condition: "ROUTE_EXISTS", distanceMeters: 100, duration: "60s" },
      ],
      ids,
    );
    expect(out).toEqual({});
  });
  it("rounds up very short walks to one minute", () => {
    expect(parseRouteMatrix([{ destinationIndex: 0, condition: "ROUTE_EXISTS", distanceMeters: 20, duration: "15s" }], ids).placeA.minutes).toBe(1);
  });
});
