"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

export interface Coords {
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

/**
 * The visitor's location for this session: from the store if present,
 * otherwise requested from the browser. `denied` means the browser said no
 * (or has no geolocation), so the UI should ask for a place name instead.
 */
export function useCoords() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const coords = useMemo<Coords | null>(() => {
    try {
      return raw ? (JSON.parse(raw) as Coords) : null;
    } catch {
      return null;
    }
  }, [raw]);
  const [denied, setDenied] = useState(false);

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

  return { coords, denied };
}
