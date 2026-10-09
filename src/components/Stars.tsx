const STAR =
  "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2 2 9.3l6.9-1z";

function Row({ color }: { color: string }) {
  return (
    <span className={`flex ${color}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden>
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
    return <span className="text-sm text-stone-500">No reviews yet</span>;
  }
  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-label={`Rated ${rating} out of 5${count ? ` from ${count} reviews` : ""}`}
    >
      <span className="relative inline-flex">
        <Row color="text-stone-300 dark:text-stone-700" />
        <span
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${(Math.min(rating, 5) / 5) * 100}%` }}
        >
          <Row color="text-amber-500" />
        </span>
      </span>
      <span className={size === "lg" ? "text-lg font-semibold" : "text-sm font-semibold"}>
        {rating.toFixed(1)}
      </span>
      {count != null && (
        <span className="text-sm text-stone-500">({count.toLocaleString()})</span>
      )}
    </span>
  );
}
