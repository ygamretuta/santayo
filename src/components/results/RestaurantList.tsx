import type { Restaurant } from "@/lib/types";
import { RestaurantCard } from "./RestaurantCard";
import "./restaurant-list.css";

export function RestaurantList({ restaurants }: { restaurants: Restaurant[] }) {
  return (
    <ul className="restaurant-list">
      {restaurants.map((r) => (
        <li key={r.id} className="restaurant-list__item">
          <RestaurantCard r={r} />
        </li>
      ))}
    </ul>
  );
}
