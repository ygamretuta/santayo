"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { DataSource, Restaurant } from "@/lib/types";
import { RestaurantCard } from "./RestaurantCard";

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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-stone-500">
            {coords.label ? `Near ${coords.label}` : "Near you"} · within
          </span>
          {[5, 10].map((km) => (
            <Link
              key={km}
              href={`/results?q=${encodeURIComponent(q)}&r=${km}`}
              replace
              aria-current={km === radius}
              className={`rounded-full border px-3 py-1 font-medium ${
                km === radius
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-stone-300 hover:border-orange-400 dark:border-stone-700"
              }`}
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
            className="text-stone-500 underline-offset-2 hover:underline"
          >
            change location
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-stone-500">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg border border-stone-300 bg-transparent px-2 py-1 text-stone-900 dark:border-stone-700 dark:text-stone-100"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id} className="text-stone-900">
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {current && "source" in current && current.source === "demo" && (
        <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
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
            <Link href={`/results?q=${encodeURIComponent(q)}&r=10`} replace className="text-orange-600 underline">
              Try 10 km
            </Link>
          )}
        </Status>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {sorted.map((r) => (
            <RestaurantCard key={r.id} r={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Status({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="py-16 text-center text-stone-500">
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
    <div className="mx-auto max-w-md py-12 text-center">
      <p className="text-lg font-semibold">We couldn’t get your location</p>
      <p className="mt-1 text-sm text-stone-500">
        Allow location access in your browser, or tell us where to look.
      </p>
      <form onSubmit={lookup} className="mt-5 flex gap-2">
        <input
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="City or area, e.g. Makati"
          aria-label="City or area"
          className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-transparent px-4 py-2.5 dark:border-stone-700"
        />
        <button
          disabled={busy}
          className="rounded-xl bg-orange-500 px-4 py-2.5 font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
        >
          {busy ? "…" : "Search"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
