import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackButton } from "@/components/BackButton";
import { Stars } from "@/components/Stars";
import { Thumb } from "@/components/Thumb";
import { formatPrice } from "@/lib/price";
import { getRestaurant } from "@/lib/places";
import { socialLinks } from "@/lib/social";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = await getRestaurant(decodeURIComponent((await params).id));
  return { title: r ? `${r.name} · Santayo` : "Restaurant · Santayo" };
}

export default function RestaurantPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p role="status" className="py-24 text-center text-stone-500">🍽️ Loading restaurant…</p>}>
      <RestaurantDetails params={params} />
    </Suspense>
  );
}

async function RestaurantDetails({ params }: { params: Params }) {
  const r = await getRestaurant(decodeURIComponent((await params).id));
  if (!r) notFound();

  const price = formatPrice(r.price);
  const social = socialLinks(r);
  const isDemo = r.id.startsWith("demo.");

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-4 sm:px-6">
      <BackButton />

      <div className={`mt-3 grid gap-2 ${r.photos.length > 1 ? "sm:grid-cols-3" : ""}`}>
        <Thumb
          photo={r.photos[0]}
          emoji={r.emoji}
          alt={`${r.name} photo`}
          width={1200}
          priority
          className={`aspect-[16/10] rounded-2xl ${r.photos.length > 1 ? "sm:col-span-2 sm:row-span-2 sm:min-h-72" : ""}`}
        />
        {r.photos.slice(1, 3).map((p, i) => (
          <Thumb key={p} photo={p} alt={`${r.name} photo ${i + 2}`} width={600} className="hidden aspect-[16/10] rounded-2xl sm:block" />
        ))}
      </div>

      <section className="mt-6">
        <h1 className="text-3xl font-extrabold tracking-tight">{r.name}</h1>
        <p className="mt-1 text-stone-500">{r.category}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Stars rating={r.rating} count={r.reviewCount} size="lg" />
          <span className="font-semibold">
            {price.label ?? "—"} <span className="text-sm font-normal text-stone-500">{price.caption}</span>
          </span>
          {r.openNow != null && (
            <span className={r.openNow ? "font-medium text-green-600" : "font-medium text-red-600"}>
              {r.openNow ? "Open now" : "Closed now"}
            </span>
          )}
        </div>
        {r.summary && <p className="mt-4 max-w-prose text-stone-600 dark:text-stone-300">{r.summary}</p>}
      </section>

      <section className="mt-6 grid gap-6 rounded-2xl border border-stone-200 p-5 sm:grid-cols-2 dark:border-stone-800">
        <div className="space-y-3 text-sm">
          <h2 className="text-lg font-bold">Details</h2>
          {r.address && <p>📍 {r.address}</p>}
          {r.phone && (
            <p>
              📞 <a className="text-orange-600 hover:underline" href={`tel:${r.phone}`}>{r.phone}</a>
            </p>
          )}
          {r.website && (
            <p>
              🌐{" "}
              <a className="text-orange-600 hover:underline" href={r.website} target="_blank" rel="noopener noreferrer">
                Website
              </a>
            </p>
          )}
          <div className="flex gap-2 pt-1">
            {r.mapsUrl && (
              <a
                href={r.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600"
              >
                Open in Maps
              </a>
            )}
          </div>
        </div>
        {r.hours && (
          <div className="text-sm">
            <h2 className="mb-3 text-lg font-bold">Hours</h2>
            <ul className="space-y-1 text-stone-600 dark:text-stone-300">
              {r.hours.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Reviews</h2>
        {r.reviews.length === 0 ? (
          <p className="mt-2 text-stone-500">No written reviews yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {r.reviews.map((rev, i) => (
              <li key={i} className="rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">
                    {rev.url ? (
                      <a href={rev.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {rev.author}
                      </a>
                    ) : (
                      rev.author
                    )}
                  </span>
                  <span className="text-sm text-stone-500">{rev.when}</span>
                </div>
                <div className="mt-1">
                  <Stars rating={rev.rating} />
                </div>
                {rev.text && <p className="mt-2 text-stone-700 dark:text-stone-300">{rev.text}</p>}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-stone-500">
          {isDemo ? "Demo reviews." : "Reviews from Google."}
        </p>
      </section>

      <section className="mb-12 mt-8">
        <h2 className="text-xl font-bold">What people are saying online</h2>
        <p className="mt-1 text-sm text-stone-500">
          Opens TikTok search for {r.name}. We link to the search, since TikTok has no public API for
          embedding results.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {social.tiktok.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl bg-stone-900 px-4 py-3 text-white transition hover:bg-black dark:bg-stone-800 dark:hover:bg-stone-700"
              >
                <span aria-hidden className="text-xl">🎵</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{l.label}</span>
                  {l.hint && <span className="block text-xs text-stone-300">{l.hint} · TikTok</span>}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {social.other.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-stone-300 px-4 py-1.5 text-sm font-medium hover:border-orange-400 dark:border-stone-700"
            >
              {l.label} ↗
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
