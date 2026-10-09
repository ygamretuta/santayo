export interface SocialLink {
  label: string;
  href: string;
  hint?: string;
}

export interface SocialLinks {
  tiktok: SocialLink[];
  other: SocialLink[];
}

const enc = encodeURIComponent;

/**
 * TikTok (and the other platforms) have no public search API, so these are
 * deep links into each platform's own search for this restaurant.
 */
export function socialLinks(r: { name: string; area?: string }): SocialLinks {
  const where = [r.name, r.area].filter(Boolean).join(" ");
  const tag = r.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

  const tiktokSearch = (q: string) => `https://www.tiktok.com/search?q=${enc(q)}`;

  const tiktok: SocialLink[] = [
    { label: `${r.name} review`, href: tiktokSearch(`${where} review`), hint: "Honest reviews" },
    { label: "Food trip & must-tries", href: tiktokSearch(`${where} must try`), hint: "What to order" },
    { label: "Mukbang & first impressions", href: tiktokSearch(`${r.name} mukbang`) },
  ];
  if (tag) {
    tiktok.push({ label: `#${tag}`, href: `https://www.tiktok.com/tag/${enc(tag)}`, hint: "Hashtag" });
  }

  return {
    tiktok,
    other: [
      { label: "YouTube", href: `https://www.youtube.com/results?search_query=${enc(`${where} review`)}` },
      { label: "Instagram", href: `https://www.instagram.com/explore/search/keyword/?q=${enc(r.name)}` },
      { label: "Facebook", href: `https://www.facebook.com/search/top?q=${enc(where)}` },
      { label: "Reddit", href: `https://www.reddit.com/search/?q=${enc(where)}` },
    ],
  };
}
