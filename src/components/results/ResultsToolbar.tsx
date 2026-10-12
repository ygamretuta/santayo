"use client";

import Link from "next/link";
import { formatRadius, RADII_KM } from "@/lib/radius";
import { SORTS, type Sort } from "@/lib/sort";
import "./results-toolbar.css";

interface Props {
  q: string;
  radius: number;
  /** Where results are centred, e.g. "Baguio City"; falls back to "you". */
  placeLabel?: string;
  sort: Sort;
  onSortChange: (sort: Sort) => void;
  onChangeLocation: () => void;
}

/** Radius chips, "change location" and the sort dropdown. */
export function ResultsToolbar({ q, radius, placeLabel, sort, onSortChange, onChangeLocation }: Props) {
  return (
    <div className="results-toolbar">
      <div className="results-toolbar__filters">
        <span className="results-toolbar__label">
          {placeLabel ? `Near ${placeLabel}` : "Near you"} · within
        </span>
        {RADII_KM.map((km) => (
          <Link
            key={km}
            href={`/results?q=${encodeURIComponent(q)}&r=${km}`}
            replace
            aria-current={km === radius}
            className={`results-toolbar__chip ${km === radius ? "results-toolbar__chip--active" : ""}`}
          >
            {formatRadius(km)}
          </Link>
        ))}
        <button type="button" onClick={onChangeLocation} className="results-toolbar__link-button">
          change location
        </button>
      </div>

      <label className="results-toolbar__sort">
        Sort
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as Sort)}
          className="results-toolbar__select"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id} className="results-toolbar__option">
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
