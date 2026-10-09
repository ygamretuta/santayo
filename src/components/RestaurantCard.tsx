import Link from "next/link";
import { formatDistance } from "@/lib/geo";
import { formatPrice } from "@/lib/price";
import type { Restaurant } from "@/lib/types";
import { Stars } from "./Stars";
import { Thumb } from "./Thumb";

export function RestaurantCard({ r }: { r: Restaurant }) {
  const price = formatPrice(r.price);
  return (
    <li className="min-w-0">
      <Link
        href={`/restaurant/${encodeURIComponent(r.id)}`}
        className="group flex min-w-0 gap-3 sm:gap-4 rounded-2xl border border-stone-200 bg-white p-3 transition hover:border-orange-300 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:hover:border-orange-700"
      >
        <Thumb
          photo={r.photos[0]}
          emoji={r.emoji}
          alt={`${r.name} photo`}
          width={320}
          className="h-24 w-24 shrink-0 rounded-xl sm:h-28 sm:w-28"
        />
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div>
            <h3 className="truncate text-base font-semibold group-hover:text-orange-600 dark:group-hover:text-orange-400">
              {r.name}
            </h3>
            <p className="truncate text-sm text-stone-500">
              {[
                r.category,
                r.distanceKm != null && formatDistance(r.distanceKm),
                r.otherBranches ? `+${r.otherBranches} other branch${r.otherBranches > 1 ? "es" : ""}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <Stars rating={r.rating} count={r.reviewCount} />
            <div className="leading-tight sm:text-right">
              <div className="text-base font-semibold">{price.label ?? "—"}</div>
              <div className="text-xs text-stone-500">{price.caption}</div>
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}
