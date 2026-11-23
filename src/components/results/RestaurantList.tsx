import { Fragment } from "react";
import type { Match, Restaurant } from "@/lib/types";
import { RestaurantCard } from "./RestaurantCard";
import "./restaurant-list.css";

const HEADING: Record<Match, string> = {
  strong: "Best matches",
  related: "Related places",
  none: "Also nearby",
};

interface Props {
  restaurants: Restaurant[];
  /** Show a heading wherever the fit-to-search group changes. */
  grouped?: boolean;
  /** Size of each group across ALL pages, for the heading counts. */
  counts?: Record<Match, number>;
}

export function RestaurantList({ restaurants, grouped, counts }: Props) {
  return (
    <ul className="restaurant-list">
      {restaurants.map((r, i) => {
        const group: Match = r.match ?? "none";
        const startsGroup = grouped && (i === 0 || (restaurants[i - 1].match ?? "none") !== group);
        return (
          <Fragment key={r.id}>
            {startsGroup && (
              // Its own full-width grid row, so the two-column card layout stays aligned.
              <li role="presentation" className="restaurant-list__group">
                <h2 className="restaurant-list__heading">
                  {HEADING[group]}
                  {counts && <span className="restaurant-list__count"> · {counts[group]}</span>}
                </h2>
              </li>
            )}
            <li className="restaurant-list__item">
              <RestaurantCard r={r} />
            </li>
          </Fragment>
        );
      })}
    </ul>
  );
}
