"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FOOD_PILLS } from "@/lib/foods";
import "./search-box.css";

interface Props {
  /** Current search term (results page). Remount with `key={q}` to resync. */
  initial?: string;
  variant: "hero" | "compact";
}

/** Search input + food pills; pressing a pill fills the input and searches. */
export function SearchBox({ initial = "", variant }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const hero = variant === "hero";
  const active = initial.trim().toLowerCase();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q) router.push(`/results?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className={`search-box search-box--${variant}`}>
      <form onSubmit={submit} action="/results" className="search-box__form">
        <input
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          maxLength={60}
          autoFocus={hero}
          autoComplete="off"
          enterKeyHint="search"
          placeholder={hero ? "Steak, ramen, halo-halo…" : "What do you want to eat?"}
          aria-label="What do you want to eat?"
          className="search-box__input"
        />
        <button className={`button ${hero ? "button--lg" : ""}`}>{hero ? "Find food" : "Search"}</button>
      </form>
      {hero && <p className="search-box__hint">Can’t decide? Pick one</p>}
      <ul className="search-box__pills">
        {FOOD_PILLS.map((f) => {
          const isActive = active === f.label.toLowerCase();
          return (
            <li key={f.label} className="search-box__pill-item">
              <Link
                href={`/results?q=${encodeURIComponent(f.label)}`}
                onClick={() => setValue(f.label)}
                aria-current={isActive}
                className={`search-box__pill ${isActive ? "search-box__pill--active" : ""}`}
              >
                <span aria-hidden>{f.emoji}</span>
                {f.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
