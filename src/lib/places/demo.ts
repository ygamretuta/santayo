import { offsetPoint } from "../geo";
import type { Restaurant, Review } from "../types";

/**
 * Deterministic fake restaurants so the app is fully usable (and deployable)
 * before a Google Maps API key is configured. IDs encode the query + index,
 * so the detail page can rebuild the exact same restaurant.
 */

const EMOJI: Record<string, string> = {
  steak: "🥩",
  "fried-chicken": "🍗",
  ramen: "🍜",
  pizza: "🍕",
  burger: "🍔",
  sushi: "🍣",
  pasta: "🍝",
  tacos: "🌮",
  seafood: "🦐",
  dessert: "🍰",
  coffee: "☕",
  dimsum: "🥟",
  salad: "🥗",
  curry: "🍛",
};

const TEMPLATES = [
  "The {F} House",
  "{F} & Co.",
  "Casa {F}",
  "{F} Republic",
  "Big {F} Kitchen",
  "Lola's {F}",
  "{F} Corner",
  "Smoke & {F}",
  "Golden {F}",
  "Urban {F}",
  "{F} Lab",
  "Kuya's {F}",
];

const REVIEWS: [string, string][] = [
  ["Worth the trip", "Generous portions and the flavours were spot on. Service was quick even at peak hours."],
  ["Solid, not spectacular", "Good food, a little pricey for what you get, but the staff were lovely."],
  ["New favourite", "Ordered the house special and it did not disappoint. Already planning to come back."],
  ["Great for groups", "Plenty of seating, easy to share dishes. Parking was a bit tight."],
  ["Hit or miss", "Some dishes were great, others a bit bland. Ambience made up for it."],
];

const AUTHORS = ["Mika R.", "Jon D.", "Ana L.", "Paolo S.", "Bea C."];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const slugify = (q: string) =>
  q.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "food";

const titleCase = (slug: string) =>
  slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export function isDemoId(id: string) {
  return id.startsWith("demo.");
}

export function demoRestaurant(
  id: string,
  ctx?: { origin: { lat: number; lng: number }; radiusKm: number },
): Restaurant | null {
  const m = /^demo\.([a-z0-9-]+)\.(\d{1,2})$/.exec(id);
  if (!m) return null;
  const [, slug, nStr] = m;
  const n = Number(nStr);
  const rand = mulberry32(hash(`${slug}:${n}`));

  const food = titleCase(slug);
  const name = TEMPLATES[n % TEMPLATES.length].replace("{F}", food);
  const level = (1 + Math.floor(rand() * 3)) as 1 | 2 | 3;
  const distanceKm = ctx ? 0.4 + rand() * (ctx.radiusKm - 0.4) : undefined;
  const pos =
    ctx && distanceKm != null
      ? offsetPoint(ctx.origin, distanceKm, rand() * 360)
      : undefined;

  const reviews: Review[] = REVIEWS.map(([title, body], i) => ({
    author: AUTHORS[(i + n) % AUTHORS.length],
    rating: Math.min(5, 3 + ((i + n) % 3)),
    when: `${i + 1} month${i ? "s" : ""} ago`,
    text: `${title}. ${body}`,
  }));

  return {
    id,
    name,
    rating: Math.round((3.4 + rand() * 1.5) * 10) / 10,
    reviewCount: 20 + Math.floor(rand() * 2400),
    price: { avg: Math.round((120 + level * 150 + rand() * 120) / 10) * 10, currency: "PHP", level },
    photos: [],
    emoji: EMOJI[slug] ?? "🍽️",
    category: `${food} restaurant`,
    summary: `Demo listing. Connect a Google Maps API key to see real ${food.toLowerCase()} spots near you.`,
    address: "Demo address — connect a Google Maps API key",
    area: undefined,
    lat: pos?.lat,
    lng: pos?.lng,
    distanceKm,
    openNow: rand() > 0.25,
    hours: [
      "Monday: 10:00 AM – 10:00 PM",
      "Tuesday: 10:00 AM – 10:00 PM",
      "Wednesday: 10:00 AM – 10:00 PM",
      "Thursday: 10:00 AM – 10:00 PM",
      "Friday: 10:00 AM – 11:00 PM",
      "Saturday: 10:00 AM – 11:00 PM",
      "Sunday: 10:00 AM – 9:00 PM",
    ],
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`,
    reviews,
  };
}

export function demoSearch(
  query: string,
  origin: { lat: number; lng: number },
  radiusKm: number,
): Restaurant[] {
  const slug = slugify(query);
  return Array.from({ length: 12 }, (_, n) =>
    demoRestaurant(`demo.${slug}.${n}`, { origin, radiusKm }),
  ).filter((r): r is Restaurant => r != null);
}
