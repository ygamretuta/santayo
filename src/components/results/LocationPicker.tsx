"use client";

import { useState } from "react";
import { savePickedPlace } from "@/hooks/useCoords";
import { roundCoord } from "@/lib/location";
import type { PlaceChoice } from "@/lib/places/locate";
import "./location-picker.css";

interface Props {
  /** Current position, used to rank nearby matches first. */
  near?: { lat: number; lng: number };
  /** Re-ask the browser for a precise fix. */
  onUseMyLocation?: () => void;
  locating?: boolean;
  /** Called after a place is chosen (to close a panel). */
  onPicked?: () => void;
}

/** Search a street, landmark or area and choose it as "where I am", or use the device location. */
export function LocationPicker({ near, onUseMyLocation, locating, onPicked }: Props) {
  const [text, setText] = useState("");
  const [choices, setChoices] = useState<PlaceChoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = text.trim();
    if (q.length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q });
      if (near) {
        params.set("lat", String(roundCoord(near.lat)));
        params.set("lng", String(roundCoord(near.lng)));
      }
      const res = await fetch(`/api/locate?${params}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Lookup failed");
      setChoices(body.choices);
    } catch (err) {
      setChoices(null);
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  function pick(c: PlaceChoice) {
    savePickedPlace(c);
    onPicked?.();
  }

  return (
    <div className="location-picker">
      {onUseMyLocation && (
        <button type="button" className="button button--secondary location-picker__locate" disabled={locating} onClick={onUseMyLocation}>
          {locating ? "Locating…" : "📍 Use my current location"}
        </button>
      )}

      <form onSubmit={search} className="location-picker__form">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="A street, landmark or area, e.g. Session Road"
          aria-label="Search for a street, landmark or area"
          className="location-picker__input"
        />
        <button disabled={busy || text.trim().length < 2} className="button">
          {busy ? "…" : "Search"}
        </button>
      </form>

      {error && <p className="location-picker__error">{error}</p>}

      {choices && choices.length === 0 && <p className="location-picker__note">Nothing found. Try a nearby street or landmark.</p>}

      {choices && choices.length > 0 && (
        <ul className="location-picker__list">
          {choices.map((c) => (
            <li key={c.id}>
              <button type="button" className="location-picker__choice" onClick={() => pick(c)}>
                <span className="location-picker__label">{c.label}</span>
                {c.broad && <span className="location-picker__tag">whole area</span>}
                {c.address && <span className="location-picker__address">{c.address}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
