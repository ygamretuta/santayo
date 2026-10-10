import type { Review } from "@/lib/types";
import { Stars } from "../ui/Stars";
import { ReviewList } from "./ReviewList";
import "./reviews.css";

interface Props {
  reviews: Review[];
  /** Overall rating and total review count for the restaurant. */
  rating?: number;
  count?: number;
  demo: boolean;
}

export function Reviews({ reviews, rating, count, demo }: Props) {
  return (
    <section className="reviews">
      <header className="reviews__header">
        <h2 className="reviews__title">Reviews</h2>
        {rating != null && <Stars rating={rating} count={count} size="lg" />}
      </header>
      {reviews.length === 0 ? (
        <p className="reviews__empty">No written reviews yet.</p>
      ) : (
        <ReviewList reviews={reviews} />
      )}
      <p className="reviews__note">
        {demo ? "Demo reviews." : `Reviews from Google${reviews.length ? ` · showing ${reviews.length} recent` : ""}.`}
      </p>
    </section>
  );
}
