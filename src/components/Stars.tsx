import "./stars.css";

const STAR =
  "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2 2 9.3l6.9-1z";

function Row({ variant }: { variant: "empty" | "filled" }) {
  return (
    <span className={`stars__row stars__row--${variant}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className="stars__icon" fill="currentColor" aria-hidden>
          <path d={STAR} />
        </svg>
      ))}
    </span>
  );
}

export function Stars({
  rating,
  count,
  size = "sm",
}: {
  rating?: number;
  count?: number;
  size?: "sm" | "lg";
}) {
  if (rating == null) {
    return <span className="stars__empty">No reviews yet</span>;
  }
  return (
    <span
      className={`stars stars--${size}`}
      aria-label={`Rated ${rating} out of 5${count ? ` from ${count} reviews` : ""}`}
    >
      <span className="stars__icons">
        <Row variant="empty" />
        <span className="stars__fill" style={{ width: `${(Math.min(rating, 5) / 5) * 100}%` }}>
          <Row variant="filled" />
        </span>
      </span>
      <span className="stars__value">{rating.toFixed(1)}</span>
      {count != null && <span className="stars__count">({count.toLocaleString()})</span>}
    </span>
  );
}
