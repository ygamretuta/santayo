"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { isStale } from "@/lib/location";

export interface Coords {
  lat: number;
  lng: number;
  /** Where the distances are measured from, e.g. "Session Road, Baguio". Unset for a GPS fix. */
  label?: string;
  /** Browser-reported error radius in metres (GPS fixes only). */
  accuracy?: number;
  /** When the fix was taken (ms since epoch), so a stale one can be refreshed. */
  at?: number;
  source?: "gps" | "picked";
  /** A picked place that is a whole city or area, so distances are from its middle. */
  broad?: boolean;
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

export function saveCoords(c: Coords) {
  memory = JSON.stringify(c);
  try {
    sessionStorage.setItem(STORAGE_KEY, memory);
  } catch {}
  listeners.forEach((l) => l());
}

export function clearCoords() {
  memory = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
  listeners.forEach((l) => l());
}

const parseCoords = (raw: string | null): Coords | null => {
  try {
    return raw ? (JSON.parse(raw) as Coords) : null;
  } catch {
    return null;
  }
};

const getPosition = (options: PositionOptions) =>
  new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));

/**
 * Asks the browser for the visitor's position, preferring a precise (GPS / Wi-Fi) fix.
 * If that times out or isn't available it settles for a coarse one; a permission
 * refusal is rethrown immediately.
 */
export async function locateMe(): Promise<Coords> {
  let pos: GeolocationPosition;
  try {
    pos = await getPosition({ enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 });
  } catch (e) {
    if ((e as GeolocationPositionError).code === 1) throw e;
    pos = await getPosition({ enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 });
  }
  return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, at: Date.now(), source: "gps" };
}

let refreshing = false;
function refreshSilently() {
  if (refreshing || !("geolocation" in navigator)) return;
  refreshing = true;
  locateMe()
    .then(saveCoords)
    .catch(() => {})
    .finally(() => (refreshing = false));
}

/**
 * The visitor's location for this session: from the store if present, otherwise requested
 * from the browser. `denied` means the browser said no (or has no geolocation), so the UI
 * should ask for a place instead. A GPS fix older than ten minutes is quietly refreshed.
 */
export function useCoords() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const coords = useMemo(() => parseCoords(raw), [raw]);
  const [denied, setDenied] = useState(false);
  const [locating, setLocating] = useState(false);

  /** User-triggered "use my location": shows progress and reports a refusal. */
  const refresh = useCallback(() => {
    if (!("geolocation" in navigator)) return setDenied(true);
    setLocating(true);
    locateMe()
      .then((c) => {
        saveCoords(c);
        setDenied(false);
      })
      .catch(() => setDenied(true))
      .finally(() => setLocating(false));
  }, []);

  // First visit: ask the browser once.
  useEffect(() => {
    if (raw) return;
    if (!("geolocation" in navigator)) {
      queueMicrotask(() => setDenied(true));
      return;
    }
    locateMe().then(saveCoords).catch(() => setDenied(true));
  }, [raw]);

  // Moving around: refresh an old GPS fix when the page loads and when the tab comes back.
  useEffect(() => {
    const check = () => {
      const c = parseCoords(readRaw());
      if (c?.source === "gps" && isStale(c.at)) refreshSilently();
    };
    check();
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return { coords, denied, locating, refresh };
}
