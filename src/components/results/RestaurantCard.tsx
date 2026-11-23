import Link from "next/link";
import { formatDistance } from "@/lib/geo";
import { formatPrice } from "@/lib/price";
import { estimateWalk, formatWalkTime, type Walk } from "@/lib/walking";
import type { Restaurant } from "@/lib/types";
import { Stars } from "../ui/Stars";
import { Thumb } from "../ui/Thumb";
import "./restaurant-card.css";

export function RestaurantCard({ r, walk }: { r: Restaurant; walk?: Walk }) {
  const price = formatPrice(r.price);
  // A real route when we have one, otherwise an estimate from the straight-line distance.
  const walking = walk ?? (r.distanceKm != null ? estimateWalk(r.distanceKm) : undefined);
  return (
    <Link href={`/restaurant/${encodeURIComponent(r.id)}`} className="restaurant-card">
      <Thumb
        photo={r.photos[0]}
        emoji={r.emoji}
        alt={`${r.name} photo`}
        width={320}
        className="restaurant-card__thumb"
      />
      <div className="restaurant-card__body">
        <div>
          <h3 className="restaurant-card__name">{r.name}</h3>
          <p
            className="restaurant-card__meta"
            title={walk ? `Walking route: ${walk.meters} m` : walking ? "Estimated from the straight-line distance" : undefined}
          >
            {[
              r.category,
              r.distanceKm != null && formatDistance(r.distanceKm),
              walking && `🚶 ${formatWalkTime(walking)}`,
              r.otherBranches ? `+${r.otherBranches} other branch${r.otherBranches > 1 ? "es" : ""}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="restaurant-card__footer">
          <Stars rating={r.rating} count={r.reviewCount} />
          <div className="restaurant-card__price">
            <div className="restaurant-card__price-label">{price.label ?? "—"}</div>
            <div className="restaurant-card__price-caption">{price.caption}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
