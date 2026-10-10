"use client";

import { useState } from "react";
import { saveCoords } from "@/hooks/useCoords";
import "./location-fallback.css";

/** Shown when the browser won't share a location: look up a city/area by name. */
export function LocationFallback() {
  const [place, setPlace] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    if (!place.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(place)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Lookup failed");
      saveCoords({ lat: body.lat, lng: body.lng, label: body.label });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="location-fallback">
      <p className="location-fallback__title">We couldn’t get your location</p>
      <p className="location-fallback__text">
        Allow location access in your browser, or tell us where to look.
      </p>
      <form onSubmit={lookup} className="location-fallback__form">
        <input
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="City or area, e.g. Makati"
          aria-label="City or area"
          className="location-fallback__input"
        />
        <button disabled={busy} className="button location-fallback__button">
          {busy ? "…" : "Search"}
        </button>
      </form>
      {error && <p className="location-fallback__error">{error}</p>}
    </div>
  );
}
