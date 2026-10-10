import { describe, expect, it } from "vitest";
import { socialLinks } from "./social";

describe("social", () => {
  it("builds encoded TikTok search links", () => {
    const s = socialLinks({ name: "Lola's Kitchen", area: "Makati" });
    expect(s.tiktok[0].href).toBe("https://www.tiktok.com/search?q=Lola's%20Kitchen%20Makati%20review");
    expect(s.tiktok.some((l) => l.href.endsWith("/tag/lolaskitchen"))).toBe(true);
  });
});
