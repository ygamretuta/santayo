"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { clearCoords, useCoords } from "@/hooks/useCoords";
import { useRestaurantSearch } from "@/hooks/useRestaurantSearch";
import { paginate } from "@/lib/paginate";
import { accuracyIsPoor, formatAccuracy } from "@/lib/location";
import { formatRadius, nextRadius } from "@/lib/radius";
import { sortRestaurants, type Sort } from "@/lib/sort";
import type { Match } from "@/lib/types";
import { Status } from "../ui/Status";
import { LocationFallback } from "./LocationFallback";
import { Pagination } from "./Pagination";
import { RestaurantList } from "./RestaurantList";
import { ResultsToolbar } from "./ResultsToolbar";
import "./results-view.css";

/** Search results for a term: locates the visitor, fetches, sorts and paginates. */
export function ResultsView({ q, radius, page }: { q: string; radius: number; page: number }) {
  const router = useRouter();
  const { coords, denied, locating, refresh } = useCoords();
  const search = useRestaurantSearch(q, radius, coords);
  const [sort, setSort] = useState<Sort>("best");

  const sorted = useMemo(
    () => (search && "restaurants" in search ? sortRestaurants(search.restaurants, sort) : []),
    [search, sort],
  );
  const pageData = useMemo(() => paginate(sorted, page), [sorted, page]);
  const hrefFor = (n: number) =>
    `/results?q=${encodeURIComponent(q)}&r=${radius}${n > 1 ? `&page=${n}` : ""}`;

  // Group by fit-to-search only in the default order, and only if something actually fits.
  const counts = useMemo(() => {
    const c: Record<Match, number> = { strong: 0, related: 0, none: 0 };
    sorted.forEach((r) => (c[r.match ?? "none"] += 1));
    return c;
  }, [sorted]);
  const grouped = sort === "best" && counts.strong > 0 && counts.strong < sorted.length;

  const wider = nextRadius(radius);

  if (!coords) {
    return denied ? <LocationFallback /> : <Status>📍 Finding where you are…</Status>;
  }

  return (
    <div>
      <ResultsToolbar
        q={q}
        radius={radius}
        placeLabel={coords.label}
        accuracyLabel={coords.accuracy !== undefined ? formatAccuracy(coords.accuracy) : undefined}
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          if (page > 1) router.replace(hrefFor(1));
        }}
        onChangeLocation={clearCoords}
      />

      {coords.source === "gps" && accuracyIsPoor(coords.accuracy, radius) && (
        <p className="results-view__notice" role="status">
          Your location is only accurate to about {formatAccuracy(coords.accuracy!)}, so distances may be off.{" "}
          <button type="button" className="results-view__notice-button" disabled={locating} onClick={refresh}>
            {locating ? "Locating…" : "Try again"}
          </button>
        </p>
      )}

      {search && "source" in search && search.source === "demo" && (
        <p className="results-view__notice">
          <strong>Demo data.</strong> These are placeholder restaurants. Add a{" "}
          <code>GOOGLE_MAPS_API_KEY</code> to see real places, photos and reviews.
        </p>
      )}

      {!search ? (
        <Status>🍳 Looking for {q} nearby…</Status>
      ) : "error" in search ? (
        <Status>Something went wrong: {search.error}. Please try again.</Status>
      ) : sorted.length === 0 ? (
        <Status>
          No {q} spots within {formatRadius(radius)}.{" "}
          {wider && (
            <Link href={`/results?q=${encodeURIComponent(q)}&r=${wider}`} replace className="results-view__retry">
              Try {formatRadius(wider)}
            </Link>
          )}
        </Status>
      ) : (
        <>
          <RestaurantList restaurants={pageData.items} grouped={grouped} counts={counts} />
          <Pagination page={pageData} hrefFor={hrefFor} />
        </>
      )}
    </div>
  );
}
