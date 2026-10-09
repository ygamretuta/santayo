"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { DataSource, Restaurant } from "@/lib/types";
import { RestaurantCard } from "./RestaurantCard";
import "./results-view.css";

interface Coords {
  lat: number;
  lng: number;
  label?: string;
}

/* Location is kept in sessionStorage (never in the URL) behind a tiny external store. */
const STORAGE_KEY = "santayo:coords";
const listeners = new Set<() => void>();
let memory: string | null = null;

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};
const readRaw = () => {
  if (memory) return memory;
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};
function saveCoords(c: Coords) {
  memory = JSON.stringify(c);
  try {
    sessionStorage.setItem(STORAGE_KEY, memory);
  } catch {}
  listeners.forEach((l) => l());
}

type Sort = "best" | "rating" | "price" | "distance";
const SORTS: { id: Sort; label: string }[] = [
  { id: "best", label: "Best match" },
  { id: "rating", label: "Top rated" },
  { id: "price", label: "Lowest price" },
  { id: "distance", label: "Nearest" },
];

function priceRank(r: Restaurant) {
  // Concrete averages (already in one currency per search) beat coarse levels.
  if (r.price.avg != null) return r.price.avg;
  if (r.price.level != null) return r.price.level * 1000;
  return Infinity;
}

function sortRestaurants(list: Restaurant[], sort: Sort) {
  const copy = [...list];
  switch (sort) {
    case "rating":
      return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
    case "price":
      return copy.sort((a, b) => priceRank(a) - priceRank(b));
    case "distance":
      return copy.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    default:
      return copy;
  }
}

type Loaded =
  | { key: string; restaurants: Restaurant[]; source: DataSource }
  | { key: string; error: string };

export function ResultsView({ q, radius }: { q: string; radius: number }) {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const coords = useMemo<Coords | null>(() => {
    try {
      return raw ? (JSON.parse(raw) as Coords) : null;
    } catch {
      return null;
    }
  }, [raw]);

  const [denied, setDenied] = useState(false);
  const [sort, setSort] = useState<Sort>("best");
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  // Ask the browser for a location once, if we don't have one for this session.
  useEffect(() => {
    if (raw) return;
    if (!("geolocation" in navigator)) {
      queueMicrotask(() => setDenied(true));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => saveCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setDenied(true),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60_000 },
    );
  }, [raw]);

  // Coordinates are rounded (~110 m) before leaving the device.
  const lat = coords ? Math.round(coords.lat * 1000) / 1000 : null;
  const lng = coords ? Math.round(coords.lng * 1000) / 1000 : null;
  const key = lat != null && lng != null ? `${q}|${radius}|${lat}|${lng}` : null;

  useEffect(() => {
    if (!key) return;
    const ac = new AbortController();
    const params = new URLSearchParams({ q, lat: String(lat), lng: String(lng), r: String(radius) });
    fetch(`/api/search?${params}`, { signal: ac.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Search failed");
        setLoaded({ key, restaurants: body.restaurants, source: body.source });
      })
      .catch((err) => {
        if (err.name !== "AbortError") setLoaded({ key, error: err.message });
      });
    return () => ac.abort();
  }, [key, q, lat, lng, radius]);

  const current = loaded && loaded.key === key ? loaded : null;
  const sorted = useMemo(
    () => (current && "restaurants" in current ? sortRestaurants(current.restaurants, sort) : []),
    [current, sort],
  );

  if (!coords) {
    return denied ? <LocationFallback /> : <Status>📍 Finding where you are…</Status>;
  }

  return (
    <div>
      <div className="results-view__toolbar">
        <div className="results-view__filters">
          <span className="results-view__label">
            {coords.label ? `Near ${coords.label}` : "Near you"} · within
          </span>
          {[5, 10].map((km) => (
            <Link
              key={km}
              href={`/results?q=${encodeURIComponent(q)}&r=${km}`}
              replace
              aria-current={km === radius}
              className={`results-view__chip ${km === radius ? "results-view__chip--active" : ""}`}
            >
              {km} km
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              memory = null;
              try {
                sessionStorage.removeItem(STORAGE_KEY);
              } catch {}
              setDenied(false);
              listeners.forEach((l) => l());
            }}
            className="results-view__link-button"
          >
            change location
          </button>
        </div>

        <label className="results-view__sort">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="results-view__select"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id} className="results-view__option">
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {current && "source" in current && current.source === "demo" && (
        <p className="results-view__notice">
          <strong>Demo data.</strong> These are placeholder restaurants. Add a{" "}
          <code>GOOGLE_MAPS_API_KEY</code> to see real places, photos and reviews.
        </p>
      )}

      {!current ? (
        <Status>🍳 Looking for {q} nearby…</Status>
      ) : "error" in current ? (
        <Status>Something went wrong: {current.error}. Please try again.</Status>
      ) : sorted.length === 0 ? (
        <Status>
          No {q} spots within {radius} km.{" "}
          {radius < 10 && (
            <Link href={`/results?q=${encodeURIComponent(q)}&r=10`} replace className="results-view__retry">
              Try 10 km
            </Link>
          )}
        </Status>
      ) : (
        <ul className="restaurant-list">
          {sorted.map((r) => (
            <li key={r.id} className="restaurant-list__item">
              <RestaurantCard r={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Status({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="status">
      {children}
    </p>
  );
}

function LocationFallback() {
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
