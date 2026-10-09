import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackButton } from "@/components/BackButton";
import { Stars } from "@/components/Stars";
import { Thumb } from "@/components/Thumb";
import { formatPrice } from "@/lib/price";
import { getRestaurant } from "@/lib/places";
import { socialLinks } from "@/lib/social";
import "./detail.css";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = await getRestaurant(decodeURIComponent((await params).id));
  return { title: r ? `${r.name} · Santayo` : "Restaurant · Santayo" };
}

export default function RestaurantPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p role="status" className="status">🍽️ Loading restaurant…</p>}>
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
  const multi = r.photos.length > 1;

  return (
    <main className="page page--detail">
      <BackButton />

      <div className={`detail__gallery ${multi ? "detail__gallery--multi" : ""}`}>
        <Thumb
          photo={r.photos[0]}
          emoji={r.emoji}
          alt={`${r.name} photo`}
          width={1200}
          priority
          className="detail__photo detail__photo--main"
        />
        {r.photos.slice(1, 3).map((p, i) => (
          <Thumb
            key={p}
            photo={p}
            alt={`${r.name} photo ${i + 2}`}
            width={600}
            className="detail__photo detail__photo--extra"
          />
        ))}
      </div>

      <section className="detail__intro">
        <h1 className="detail__name">{r.name}</h1>
        <p className="detail__category">{r.category}</p>
        <div className="detail__facts">
          <Stars rating={r.rating} count={r.reviewCount} size="lg" />
          <span className="detail__price">
            {price.label ?? "—"} <span className="detail__price-caption">{price.caption}</span>
          </span>
          {r.openNow != null && (
            <span className={`detail__status ${r.openNow ? "detail__status--open" : "detail__status--closed"}`}>
              {r.openNow ? "Open now" : "Closed now"}
            </span>
          )}
        </div>
        {r.summary && <p className="detail__summary">{r.summary}</p>}
      </section>

      <section className="info-card">
        <div className="info-card__column">
          <h2 className="info-card__heading">Details</h2>
          {r.address && <p>📍 {r.address}</p>}
          {r.phone && (
            <p>
              📞 <a className="info-card__link" href={`tel:${r.phone}`}>{r.phone}</a>
            </p>
          )}
          {r.website && (
            <p>
              🌐{" "}
              <a className="info-card__link" href={r.website} target="_blank" rel="noopener noreferrer">
                Website
              </a>
            </p>
          )}
          {r.mapsUrl && (
            <div>
              <a href={r.mapsUrl} target="_blank" rel="noopener noreferrer" className="button">
                Open in Maps
              </a>
            </div>
          )}
        </div>
        {r.hours && (
          <div className="info-card__column">
            <h2 className="info-card__heading">Hours</h2>
            <ul className="info-card__hours">
              {r.hours.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="reviews">
        <h2 className="reviews__title">Reviews</h2>
        {r.reviews.length === 0 ? (
          <p className="reviews__empty">No written reviews yet.</p>
        ) : (
          <ul className="reviews__list">
            {r.reviews.map((rev, i) => (
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
        <p className="reviews__note">{isDemo ? "Demo reviews." : "Reviews from Google."}</p>
      </section>

      <section className="social">
        <h2 className="social__title">What people are saying online</h2>
        <p className="social__intro">
          Opens TikTok search for {r.name}. We link to the search, since TikTok has no public API for
          embedding results.
        </p>
        <ul className="social__tiktok-list">
          {social.tiktok.map((l) => (
            <li key={l.href}>
              <a href={l.href} target="_blank" rel="noopener noreferrer" className="social__tiktok-link">
                <span aria-hidden className="social__icon">🎵</span>
                <span className="social__text">
                  <span className="social__label">{l.label}</span>
                  {l.hint && <span className="social__hint">{l.hint} · TikTok</span>}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <div className="social__others">
          {social.other.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="social__other">
              {l.label} ↗
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
