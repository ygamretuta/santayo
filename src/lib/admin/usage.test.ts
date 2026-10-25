import { describe, expect, it } from "vitest";
import { dayKey, lastDates, summarize, toDayUsage } from "./usage";

describe("usage", () => {
  it("keys counters by UTC day", () => {
    expect(dayKey(new Date("2026-10-25T23:59:59Z"))).toBe("santayo:usage:2026-10-25");
    expect(dayKey(new Date("2026-10-26T00:00:00Z"))).toBe("santayo:usage:2026-10-26");
  });
  it("lists the last N dates oldest-first, across month boundaries", () => {
    expect(lastDates(3, new Date("2026-11-01T10:00:00Z"))).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
  });
  it("reads a redis hash, tolerating missing fields and string numbers", () => {
    expect(toDayUsage("d", null)).toEqual({ date: "d", search: 0, details: 0, photo: 0, errors: 0, total: 0 });
    expect(toDayUsage("d", { search: 3, details: "2", photo: 5, search_error: 1, photo_error: "2" })).toEqual({
      date: "d", search: 3, details: 2, photo: 5, errors: 3, total: 10,
    });
  });
  it("summarises today / 7 / 30 days", () => {
    const days = lastDates(30, new Date("2026-10-30T00:00:00Z")).map((d, i) =>
      toDayUsage(d, { search: i === 29 ? 4 : 1, photo: 2 }),
    );
    const s = summarize(days);
    expect(s.today.search).toBe(4);
    expect(s.last7.total).toBe(6 * 3 + 6); // six ordinary days (1 search + 2 photos) plus today
    expect(s.last7.search).toBe(6 * 1 + 4);
    expect(s.last30.photo).toBe(60);
    expect(s.last30.total).toBe(29 * 3 + 6);
  });
});
