import type { Match } from "../types";

/*
 * How well does a place fit what was searched for?
 *
 * Google's text search returns its best guesses up to a page, however weak, and
 * most local places are only tagged plain "restaurant". So we score each result
 * ourselves from its name and Google's category:
 *   strong  - its category or name says it serves this (e.g. a steak_house, "Sizzling Plate")
 *   related - the right kind of cuisine or place (e.g. a Japanese restaurant for ramen)
 *   none    - nothing connects it to the search
 * It cannot see menus (no provider has them for most places), so it is a ranking aid, not a guarantee.
 */

interface Intent {
  /** Query phrases that select this intent. */
  triggers: string[];
  /** Google place types that make a place a strong match. */
  types: string[];
  /** Name fragments that make a place a strong match (includes well-known local chains). */
  words: string[];
  relatedTypes: string[];
  relatedWords: string[];
}

const INTENTS: Intent[] = [
  { triggers: ["steak", "steaks", "steakhouse", "sizzling"], types: ["steak_house"],
    words: ["steak", "sizzling", "chophouse", "chops", "smokehouse", "carnivore", "wagyu"],
    relatedTypes: ["barbecue_restaurant", "american_restaurant", "brazilian_restaurant"],
    relatedWords: ["grill", "bbq", "barbecue", "bistro", "roast", "churrasc", "carne", "meat"] },
  { triggers: ["fried chicken", "chicken", "wings", "chickenjoy"], types: [],
    words: ["chicken", "wing", "jollibee", "kfc", "popeyes", "bonchon", "wingstop", "max's", "chowking", "mang inasal", "inasal", "andok", "manokan"],
    relatedTypes: ["fast_food_restaurant"], relatedWords: ["diner", "grill", "fast food", "lechon"] },
  { triggers: ["ramen", "ramyun", "noodles", "noodle"], types: ["ramen_restaurant"],
    words: ["ramen", "ramyun", "ramyeon", "noodle", "udon", "tsukemen", "ippudo", "nagi", "ichiran"],
    relatedTypes: ["japanese_restaurant"], relatedWords: ["japanese", "nippon", "tokyo", "teppan", "yakitori", "katsu", "izakaya", "sushi"] },
  { triggers: ["pizza", "pizzeria"], types: ["pizza_restaurant"],
    words: ["pizza", "pizzeria", "shakey", "greenwich", "yellow cab", "domino", "papa john", "napoli"],
    relatedTypes: ["italian_restaurant"], relatedWords: ["italian", "pasta", "trattoria", "wood fire", "cucina"] },
  { triggers: ["burger", "burgers", "hamburger"], types: ["hamburger_restaurant"],
    words: ["burger", "smash", "patty", "mcdonald", "mcdo", "wendy", "army navy", "armynavy", "carl's", "shake shack", "minute burger"],
    relatedTypes: ["fast_food_restaurant", "american_restaurant", "diner"], relatedWords: ["diner", "grill", "american", "fries", "shack"] },
  { triggers: ["sushi", "sashimi", "maki"], types: ["sushi_restaurant"],
    words: ["sushi", "maki", "sashimi", "omakase", "izakaya", "tempura"],
    relatedTypes: ["japanese_restaurant", "ramen_restaurant"], relatedWords: ["japanese", "nippon", "teppan", "tokyo", "yakitori", "katsu", "bento"] },
  { triggers: ["korean bbq", "kbbq", "samgyupsal", "samgyeopsal", "korean"], types: ["korean_restaurant"],
    words: ["korean", "samgyup", "samgyeop", "kbbq", "bulgogi", "seoul", "gogi", "hanwoo"],
    relatedTypes: ["barbecue_restaurant"], relatedWords: ["grill", "barbecue", "bbq", "buffet"] },
  { triggers: ["bbq", "barbecue", "barbeque"], types: ["barbecue_restaurant"],
    words: ["bbq", "barbecue", "barbeque", "smokehouse", "inihaw", "grill"],
    relatedTypes: ["steak_house", "korean_restaurant"], relatedWords: ["steak", "ribs", "chops", "roast"] },
  { triggers: ["pasta", "spaghetti", "italian"], types: ["italian_restaurant"],
    words: ["pasta", "spaghetti", "italian", "trattoria", "carbonara", "lasagna", "cucina"],
    relatedTypes: ["pizza_restaurant"], relatedWords: ["pizza", "bistro", "cafe"] },
  { triggers: ["tacos", "taco", "burrito", "mexican"], types: ["mexican_restaurant"],
    words: ["taco", "burrito", "mexican", "chimichanga", "nacho", "cantina", "quesadilla", "taqueria"],
    relatedTypes: [], relatedWords: ["grill", "cantina", "bar"] },
  { triggers: ["seafood", "fish", "crab", "shrimp"], types: ["seafood_restaurant"],
    words: ["seafood", "fish", "crab", "shrimp", "lobster", "oyster", "prawn", "squid", "isda", "kinilaw", "bangus", "tuna", "boodle"],
    relatedTypes: [], relatedWords: ["grill", "fresh", "pier", "harbor", "ocean"] },
  { triggers: ["dimsum", "dim sum", "siomai", "dumpling", "dumplings"], types: ["chinese_restaurant"],
    words: ["dimsum", "dim sum", "siomai", "dumpling", "hakaw", "bao", "chinese", "din tai", "tim ho", "mann hann"],
    relatedTypes: ["asian_restaurant"], relatedWords: ["asian", "noodle", "wok", "canton", "hong kong", "tea house", "teahouse"] },
  { triggers: ["curry", "kare", "indian"], types: ["indian_restaurant"],
    words: ["curry", "indian", "masala", "tandoor", "biryani", "kare", "tikka", "naan", "spice"],
    relatedTypes: ["thai_restaurant", "asian_restaurant"], relatedWords: ["thai", "nepal", "himalayan", "india", "asian"] },
  { triggers: ["salad", "salads", "healthy", "vegan", "vegetarian"], types: ["vegan_restaurant", "vegetarian_restaurant"],
    words: ["salad", "greens", "garden", "vegan", "vegetarian", "healthy", "bowl", "veggie", "organic", "farm"],
    relatedTypes: ["mediterranean_restaurant", "cafe"], relatedWords: ["cafe", "kitchen", "juice", "smoothie", "deli"] },
  { triggers: ["dessert", "desserts", "cake", "ice cream", "sweets", "pastry"],
    types: ["dessert_shop", "dessert_restaurant", "ice_cream_shop", "bakery", "chocolate_shop", "donut_shop", "candy_store", "confectionery"],
    words: ["dessert", "cake", "ice cream", "gelato", "pastry", "pastries", "sweet", "bakery", "donut", "chocolate", "waffle", "crepe", "halo", "brownie", "cookie", "cheesecake", "patisserie", "sundae", "churro", "mochi", "tart", "creamery"],
    relatedTypes: ["cafe", "coffee_shop", "breakfast_restaurant"], relatedWords: ["cafe", "café", "coffee", "bake", "sugar", "treat", "tea"] },
  { triggers: ["coffee", "cafe", "café", "espresso", "latte"], types: ["coffee_shop", "cafe", "coffee_roastery", "coffee_stand"],
    words: ["coffee", "cafe", "café", "espresso", "roast", "brew", "kape", "barista", "latte", "starbucks", "caffe", "caffè", "batirol"],
    relatedTypes: ["bakery", "breakfast_restaurant", "brunch_restaurant", "tea_house"], relatedWords: ["bake", "bistro", "tea", "kitchen", "roaster"] },
  { triggers: ["milk tea", "boba", "bubble tea", "tea"], types: ["tea_house"],
    words: ["milk tea", "boba", "bubble", "tea", "gong cha", "chatime", "macao", "tiger sugar", "milkshake"],
    relatedTypes: ["coffee_shop", "cafe", "juice_shop"], relatedWords: ["cafe", "juice", "shake", "drink"] },
  { triggers: ["breakfast", "brunch", "pancakes", "tapsilog"], types: ["breakfast_restaurant", "brunch_restaurant"],
    words: ["breakfast", "brunch", "pancake", "waffle", "tapsilog", "silog", "egg", "all day"],
    relatedTypes: ["cafe", "coffee_shop", "bakery", "diner"], relatedWords: ["cafe", "diner", "kitchen", "bake"] },
  { triggers: ["filipino", "pinoy", "sisig", "adobo", "lechon", "carinderia"], types: ["filipino_restaurant"],
    words: ["filipino", "pinoy", "lola", "lolo", "kusina", "carinderia", "turo-turo", "sisig", "adobo", "lechon", "bulalo", "kainan", "bahay", "mang", "aling"],
    relatedTypes: [], relatedWords: ["grill", "resto", "eatery", "kitchen", "kubo"] },
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Three-letter fragments ("tea", "bbq") must be whole words; four-letter ones may start a word
 * ("wing" finds "Wingyard"); longer ones may sit inside a word ("chicken" in "chickenjoy").
 */
function hasWord(haystack: string, word: string): boolean {
  const w = norm(word);
  if (!w) return false;
  if (w.length >= 5 || w.includes(" ")) return haystack.includes(w);
  const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tail = w.length === 4 ? "" : "s?([^a-z0-9]|$)";
  return new RegExp(`(^|[^a-z0-9])${escaped}${tail}`).test(haystack);
}
const hasAny = (haystack: string, words: string[]) => words.some((w) => hasWord(haystack, w));

const STOPWORDS = new Set(["the", "and", "for", "with", "near", "restaurant", "restaurants", "food", "place", "places", "best", "good", "cheap"]);

function queryTokens(query: string): string[] {
  return norm(query).split(" ").filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/** The intent whose longest trigger phrase appears in the query, if any. */
export function intentFor(query: string): Intent | null {
  const q = norm(query);
  let best: { intent: Intent; len: number } | null = null;
  for (const intent of INTENTS) {
    for (const t of intent.triggers) {
      if (hasWord(q, t) && (!best || t.length > best.len)) best = { intent, len: t.length };
    }
  }
  return best?.intent ?? null;
}

export function scoreMatch(place: { name: string; types?: readonly string[] }, query: string): Match {
  const name = norm(place.name);
  const types = place.types ?? [];
  const intent = intentFor(query);

  const nameHasQueryWord = queryTokens(query).some((t) => hasWord(name, t));
  if (intent) {
    if (types.some((t) => intent.types.includes(t)) || hasAny(name, intent.words) || nameHasQueryWord) return "strong";
    if (types.some((t) => intent.relatedTypes.includes(t)) || hasAny(name, intent.relatedWords)) return "related";
    return "none";
  }
  return nameHasQueryWord ? "strong" : "none";
}

const ORDER: Record<Match, number> = { strong: 0, related: 1, none: 2 };

/** Stable: best groups first, Google's own order kept inside each group. */
export function rankByMatch<T extends { match?: Match }>(list: T[]): T[] {
  return list
    .map((item, i) => ({ item, i }))
    .sort((a, b) => ORDER[a.item.match ?? "none"] - ORDER[b.item.match ?? "none"] || a.i - b.i)
    .map((x) => x.item);
}
