"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FOOD_PILLS } from "@/lib/foods";

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

  const pills = (
    <ul
      className={
        hero
          ? "mt-3 flex flex-wrap justify-center gap-2"
          : "no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
      }
    >
      {FOOD_PILLS.map((f) => (
        <li key={f.label} className="shrink-0">
          <Link
            href={`/results?q=${encodeURIComponent(f.label)}`}
            onClick={() => setValue(f.label)}
            aria-current={active === f.label.toLowerCase()}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border text-sm font-medium transition ${
              hero ? "px-4 py-2" : "px-3 py-1.5"
            } ${
              active === f.label.toLowerCase()
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-stone-200 bg-white hover:border-orange-400 hover:bg-orange-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800"
            }`}
          >
            <span aria-hidden>{f.emoji}</span>
            {f.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <form onSubmit={submit} action="/results" className={`flex gap-2 ${hero ? "mt-8" : ""}`}>
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
          className={`min-w-0 flex-1 rounded-full border border-stone-300 bg-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-stone-700 dark:bg-stone-900 dark:focus:ring-orange-900 ${
            hero ? "px-5 py-3.5 text-base shadow-sm" : "px-4 py-2"
          }`}
        />
        <button
          className={`shrink-0 rounded-full bg-orange-500 font-semibold text-white hover:bg-orange-600 ${
            hero ? "px-6 py-3.5 shadow-sm" : "px-5 py-2"
          }`}
        >
          {hero ? "Find food" : "Search"}
        </button>
      </form>
      {hero && <p className="mt-8 text-sm font-medium text-stone-500">Can’t decide? Pick one</p>}
      {pills}
    </>
  );
}
