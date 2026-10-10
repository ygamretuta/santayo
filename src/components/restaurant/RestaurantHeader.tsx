import { formatPrice } from "@/lib/price";
import type { Restaurant } from "@/lib/types";
import { Stars } from "../ui/Stars";
import { Thumb } from "../ui/Thumb";
import "./restaurant-header.css";

/** Photo gallery plus name, category, rating, price and open/closed status. */
export function RestaurantHeader({ r }: { r: Restaurant }) {
  const price = formatPrice(r.price);
  const multi = r.photos.length > 1;

  return (
    <>
      <div className={`restaurant-header__gallery ${multi ? "restaurant-header__gallery--multi" : ""}`}>
        <Thumb
          photo={r.photos[0]}
          emoji={r.emoji}
          alt={`${r.name} photo`}
          width={1200}
          priority
          className="restaurant-header__photo restaurant-header__photo--main"
        />
        {r.photos.slice(1, 3).map((p, i) => (
          <Thumb
            key={p}
            photo={p}
            alt={`${r.name} photo ${i + 2}`}
            width={600}
            className="restaurant-header__photo restaurant-header__photo--extra"
          />
        ))}
      </div>

      <section className="restaurant-header__intro">
        <h1 className="restaurant-header__name">{r.name}</h1>
        <p className="restaurant-header__category">{r.category}</p>
        <div className="restaurant-header__facts">
          <Stars rating={r.rating} count={r.reviewCount} size="lg" />
          <span className="restaurant-header__price">
            {price.label ?? "—"}{" "}
            <span className="restaurant-header__price-caption">{price.caption}</span>
          </span>
          {r.openNow != null && (
            <span
              className={`restaurant-header__status ${
                r.openNow ? "restaurant-header__status--open" : "restaurant-header__status--closed"
              }`}
            >
              {r.openNow ? "Open now" : "Closed now"}
            </span>
          )}
        </div>
        {r.summary && <p className="restaurant-header__summary">{r.summary}</p>}
      </section>
    </>
  );
}
