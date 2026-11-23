/** Google place types that mean "somewhere you can eat or drink" (exact names, no substring tricks). */
const FOOD_TYPES = new Set([
  "restaurant", "cafe", "coffee_shop", "coffee_roastery", "coffee_stand", "bakery", "dessert_shop",
  "dessert_restaurant", "ice_cream_shop", "meal_takeaway", "meal_delivery", "food_court", "sandwich_shop",
  "donut_shop", "juice_shop", "tea_house", "pub", "bar_and_grill", "diner", "bistro", "brewery", "deli",
  "snack_bar", "chocolate_shop", "candy_store", "confectionery", "acai_shop", "bagel_shop", "brunch_restaurant",
  "breakfast_restaurant", "fast_food_restaurant",
]);

/** True for restaurants, cafes, bakeries and the like; false for shops, hotels, offices. */
export function isFoodPlace(types: readonly string[] = []): boolean {
  return types.some((t) => FOOD_TYPES.has(t) || t.endsWith("_restaurant"));
}
