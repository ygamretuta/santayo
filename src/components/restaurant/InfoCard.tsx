import { Suspense } from "react";
import type { Restaurant } from "@/lib/types";
import { MenuLink } from "./MenuLink";
import "./info-card.css";

/** Address, phone, website, maps link and opening hours. */
export function InfoCard({ r }: { r: Restaurant }) {
  return (
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
        <div className="info-card__actions">
          {r.mapsUrl && (
            <a href={r.mapsUrl} target="_blank" rel="noopener noreferrer" className="button">
              Open in Maps
            </a>
          )}
          {/* Menu lookup hits the restaurant's website, so it streams in after the page. */}
          <Suspense fallback={null}>
            <MenuLink website={r.website} name={r.name} />
          </Suspense>
        </div>
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
  );
}
