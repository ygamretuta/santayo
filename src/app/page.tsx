import Link from "next/link";
import { FOOD_PILLS } from "@/lib/foods";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-16 text-center">
      <p className="text-5xl" aria-hidden>
        🍽️
      </p>
      <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
        What are you <span className="text-orange-600">craving</span>?
      </h1>
      <p className="mt-3 text-stone-500">
        Find the best spots within 10&nbsp;km, with ratings, prices and what people are saying on TikTok.
      </p>

      <form action="/results" className="mt-8 flex gap-2">
        <input
          name="q"
          required
          maxLength={60}
          autoFocus
          autoComplete="off"
          placeholder="Steak, ramen, halo-halo…"
          aria-label="What do you want to eat?"
          className="min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-5 py-3.5 text-base shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:border-stone-700 dark:bg-stone-900 dark:focus:ring-orange-900"
        />
        <button className="rounded-full bg-orange-500 px-6 py-3.5 font-semibold text-white shadow-sm hover:bg-orange-600">
          Find food
        </button>
      </form>

      <p className="mt-8 text-sm font-medium text-stone-500">Can’t decide? Pick one</p>
      <ul className="mt-3 flex flex-wrap justify-center gap-2">
        {FOOD_PILLS.map((f) => (
          <li key={f.label}>
            <Link
              href={`/results?q=${encodeURIComponent(f.label)}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium transition hover:border-orange-400 hover:bg-orange-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800"
            >
              <span aria-hidden>{f.emoji}</span>
              {f.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
