import { describe, expect, it } from "vitest";
import { estimateWalk, formatWalkTime, isDetour, parseDurationSeconds, parseRouteMatrix } from "./walking";

describe("estimateWalk", () => {
  it("adds 40% for winding streets and walks at 65 m a minute (fitted to real Baguio routes)", () => {
    expect(estimateWalk(0.3)).toEqual({ minutes: 6, meters: 420, estimate: true });
    expect(estimateWalk(1)).toEqual({ minutes: 22, meters: 1400, estimate: true });
  });
  it("is close on average to what Google measured, though a detouring route can be well off", () => {
    // Real samples from Session Road: [straight m, Google minutes]. The 481 m one is an 819 m walk (hills).
    const samples: [number, number][] = [[222, 5], [266, 7], [295, 8], [481, 14]];
    const errors = samples.map(([m, google]) => Math.abs(estimateWalk(m / 1000).minutes - google));
    expect(errors.reduce((a, b) => a + b, 0) / errors.length).toBeLessThan(2.5);
    expect(Math.max(...errors)).toBeLessThanOrEqual(4);
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

describe("isDetour", () => {
  const real = (meters: number) => ({ minutes: 10, meters, estimate: false });
  it("flags a walk much longer than the straight line, like a 430 m place that is an 863 m walk", () => {
    expect(isDetour(real(863), 0.43)).toBe(true);
    expect(isDetour(real(570), 0.283)).toBe(true);
  });
  it("leaves ordinary routes alone", () => {
    expect(isDetour(real(313), 0.222)).toBe(false); // 1.4x
    expect(isDetour(real(437), 0.295)).toBe(false); // 1.5x
  });
  it("ignores tiny absolute differences, estimates and unknown distances", () => {
    expect(isDetour(real(150), 0.08)).toBe(false); // 1.9x but only 70 m more
    expect(isDetour({ minutes: 5, meters: 900, estimate: true }, 0.4)).toBe(false);
    expect(isDetour(real(900), undefined)).toBe(false);
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
