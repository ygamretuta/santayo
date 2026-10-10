"use client";

import { useState } from "react";
import type { Review } from "@/lib/types";
import { ReviewItem } from "./ReviewItem";

/** Reviews shown before the "Show all" button. */
const INITIAL_COUNT = 6;

export function ReviewList({ reviews }: { reviews: Review[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? reviews : reviews.slice(0, INITIAL_COUNT);

  return (
    <>
      <ul className="reviews__list">
        {visible.map((rev, i) => (
          <ReviewItem key={i} review={rev} />
        ))}
      </ul>
      {!showAll && reviews.length > INITIAL_COUNT && (
        <button type="button" className="button button--secondary reviews__more" onClick={() => setShowAll(true)}>
          Show all {reviews.length} reviews
        </button>
      )}
    </>
  );
}
