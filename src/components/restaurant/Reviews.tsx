import type { Review } from "@/lib/types";
import { Stars } from "../ui/Stars";
import "./reviews.css";

export function Reviews({ reviews, demo }: { reviews: Review[]; demo: boolean }) {
  return (
    <section className="reviews">
      <h2 className="reviews__title">Reviews</h2>
      {reviews.length === 0 ? (
        <p className="reviews__empty">No written reviews yet.</p>
      ) : (
        <ul className="reviews__list">
          {reviews.map((rev, i) => (
            <li key={i} className="reviews__item">
              <div className="reviews__head">
                <span className="reviews__author">
                  {rev.url ? (
                    <a href={rev.url} target="_blank" rel="noopener noreferrer" className="reviews__author-link">
                      {rev.author}
                    </a>
                  ) : (
                    rev.author
                  )}
                </span>
                <span className="reviews__when">{rev.when}</span>
              </div>
              <Stars rating={rev.rating} />
              {rev.text && <p className="reviews__text">{rev.text}</p>}
            </li>
          ))}
        </ul>
      )}
      <p className="reviews__note">{demo ? "Demo reviews." : "Reviews from Google."}</p>
    </section>
  );
}
