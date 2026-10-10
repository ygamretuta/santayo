"use client";

import { useEffect, useRef, useState } from "react";
import type { Review } from "@/lib/types";
import { Stars } from "../ui/Stars";

/** One review card; long text is clamped to a few lines with a Read more toggle. */
export function ReviewItem({ review }: { review: Review }) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const expandedRef = useRef(false);

  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  // Only offer the toggle if the clamped text is actually cut off at this width.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (!expandedRef.current) setOverflows(el.scrollHeight > el.clientHeight + 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <li className="reviews__item">
      <div className="reviews__head">
        <span className="reviews__author">
          {review.url ? (
            <a href={review.url} target="_blank" rel="noopener noreferrer" className="reviews__author-link">
              {review.author}
            </a>
          ) : (
            review.author
          )}
        </span>
        <span className="reviews__when">{review.when}</span>
      </div>
      <Stars rating={review.rating} />
      {review.text && (
        <>
          <p ref={textRef} className={`reviews__text ${expanded ? "reviews__text--expanded" : ""}`}>
            {review.text}
          </p>
          {(overflows || expanded) && (
            <button
              type="button"
              className="reviews__toggle"
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </>
      )}
    </li>
  );
}
