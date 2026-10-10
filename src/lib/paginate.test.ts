import { describe, expect, it } from "vitest";
import { paginate } from "./paginate";

describe("paginate", () => {
  const list = Array.from({ length: 23 }, (_, i) => i + 1);
  it("slices 10 per page", () => {
    const p = paginate(list, 2);
    expect(p.items).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect([p.from, p.to, p.total, p.totalPages]).toEqual([11, 20, 23, 3]);
    expect(paginate(list, 3).items).toHaveLength(3);
  });
  it("clamps bad page numbers and handles empty lists", () => {
    expect(paginate(list, 99).page).toBe(3);
    expect(paginate(list, 0).page).toBe(1);
    expect(paginate(list, NaN).page).toBe(1);
    expect(paginate([], 1)).toMatchObject({ items: [], page: 1, totalPages: 1, from: 0, to: 0 });
  });
});
