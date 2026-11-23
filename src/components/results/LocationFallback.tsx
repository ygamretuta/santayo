"use client";

import { LocationPicker } from "./LocationPicker";
import "./location-fallback.css";

/** Shown when the browser won't share a location: pick where you are instead. */
export function LocationFallback({ onUseMyLocation, locating }: { onUseMyLocation: () => void; locating: boolean }) {
  return (
    <div className="location-fallback">
      <p className="location-fallback__title">We couldn’t get your location</p>
      <p className="location-fallback__text">Allow location access in your browser, or tell us where you are.</p>
      <LocationPicker onUseMyLocation={onUseMyLocation} locating={locating} />
    </div>
  );
}
