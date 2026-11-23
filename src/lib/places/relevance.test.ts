import { describe, expect, it } from "vitest";
import { isFoodPlace } from "./food";
import { intentFor, rankByMatch, scoreMatch } from "./relevance";

const m = (query: string, name: string, types: string[] = ["restaurant"]) => scoreMatch({ name, types }, query);

describe("steak (real places from a 500 m search)", () => {
  it("rates places that serve steak as strong", () => {
    expect(m("Steak", "Sizzling Plate Session")).toBe("strong");
    expect(m("Steak", "Blake's Wings & Steaks - SM Baguio")).toBe("strong");
    expect(m("Steak", "Anything At All", ["steak_house", "restaurant"])).toBe("strong");
  });
  it("rates grills and American places as related, and unrelated ones as none", () => {
    expect(m("Steak", "Point & Grill")).toBe("related");
    expect(m("Steak", "Chili's SM City Baguio", ["american_restaurant", "restaurant"])).toBe("related");
    expect(m("Steak", "Canto")).toBe("none");
    expect(m("Steak", "Overtones-Ito Sushi Bar and Japanese Restaurant", ["japanese_restaurant"])).toBe("none");
  });
});

describe("other pills", () => {
  it("ramen: names and categories", () => {
    expect(m("Ramen", "Ramen Nagi - SM City Baguio")).toBe("strong");
    expect(m("Ramen", "Taste of Soo Ramyeon Diner")).toBe("strong");
    expect(m("Ramen", "X", ["ramen_restaurant"])).toBe("strong");
    expect(m("Ramen", "Tokyo Tokyo", ["japanese_restaurant"])).toBe("related");
    expect(m("Ramen", "Boonsikzip")).toBe("none");
  });
  it("pizza and burger recognise local chains", () => {
    expect(m("Pizza", "Shakey's")).toBe("strong");
    expect(m("Pizza", "La Trattoria", ["italian_restaurant"])).toBe("related"); // right cuisine, not obviously pizza
    expect(m("Burger", "Army Navy Burger + Burrito")).toBe("strong");
    expect(m("Burger", "50's Diner", ["diner"])).toBe("related");
    expect(m("Burger", "Wicked Snow", ["dessert_shop"])).toBe("none");
  });
  it("fried chicken recognises Jollibee and wings", () => {
    expect(m("Fried chicken", "Jollibee Session Road", ["fast_food_restaurant"])).toBe("strong");
    expect(m("Fried chicken", "Don Henrico's")).toBe("none");
    expect(m("Fried chicken", "Wingstop")).toBe("strong");
    expect(m("Fried chicken", "Wingyard")).toBe("strong");
    expect(m("Fried chicken", "Buffalos wings N things")).toBe("strong");
  });
  it("coffee: coffee shops are strong by type even without 'coffee' in the name", () => {
    expect(m("Coffee", "Chocolate de Batirol", ["coffee_shop"])).toBe("strong");
    expect(m("Coffee", "Leandro's Bistro")).toBe("related");
  });
  it("dessert accepts bakeries and dessert shops", () => {
    expect(m("Dessert", "Sweet Tooth", ["bakery"])).toBe("strong");
    expect(m("Dessert", "Milk Fridge Baguio", ["dessert_shop"])).toBe("strong");
  });
});

describe("matching rules", () => {
  it("short words must be whole words ('tea' is not inside 'steak')", () => {
    expect(m("milk tea", "Steakhouse Grill")).toBe("none");
    expect(m("milk tea", "Tea Garden")).toBe("strong");
  });
  it("four-letter words match at the start of a word only", () => {
    expect(m("Fried chicken", "Awing Place")).toBe("none");
    expect(m("Steak", "Ribston Hall")).toBe("none"); // no steak word, so no false positive from a prefix
  });
  it("is accent- and case-insensitive", () => {
    expect(m("coffee", "CAFÉ BY THE RUINS")).toBe("strong");
    expect(m("COFFEE", "Café by the Ruins")).toBe("strong");
  });
  it("uses the longest trigger: 'korean bbq' is the Korean intent, plain 'bbq' is barbecue", () => {
    expect(intentFor("korean bbq")?.types).toContain("korean_restaurant");
    expect(intentFor("bbq")?.types).toContain("barbecue_restaurant");
  });
  it("free-text queries with no known dish fall back to name words", () => {
    expect(intentFor("lumpia")).toBeNull();
    expect(m("lumpia", "Lumpia House")).toBe("strong");
    expect(m("lumpia", "Canto")).toBe("none");
  });
  it("ignores filler words in free text", () => {
    expect(m("best restaurant near me", "Best Western Cafe")).toBe("none");
  });
});

describe("rankByMatch", () => {
  it("puts strong first, then related, then none, keeping Google's order inside each group", () => {
    const list = [
      { id: "a", match: "none" as const }, { id: "b", match: "strong" as const }, { id: "c", match: "related" as const },
      { id: "d", match: "strong" as const }, { id: "e", match: "none" as const },
    ];
    expect(rankByMatch(list).map((x) => x.id).join("")).toBe("bdcae");
  });
  it("treats a missing match as none and does not mutate the input", () => {
    const list = [{ id: "a" }, { id: "b", match: "strong" as const }];
    expect(rankByMatch(list).map((x) => x.id).join("")).toBe("ba");
    expect(list[0].id).toBe("a");
  });
});

describe("isFoodPlace", () => {
  it("accepts restaurants, cafes and bakeries, including any cuisine-specific type", () => {
    expect(isFoodPlace(["restaurant", "food"])).toBe(true);
    expect(isFoodPlace(["coffee_shop"])).toBe(true);
    expect(isFoodPlace(["bakery"])).toBe(true);
    expect(isFoodPlace(["ramen_restaurant", "point_of_interest"])).toBe(true);
  });
  it("rejects non-food places and lookalike substrings", () => {
    expect(isFoodPlace(["hotel", "lodging"])).toBe(false);
    expect(isFoodPlace(["public_bathroom"])).toBe(false);
    expect(isFoodPlace(["grocery_store", "store"])).toBe(false);
    expect(isFoodPlace([])).toBe(false);
    expect(isFoodPlace(undefined)).toBe(false);
  });
});
