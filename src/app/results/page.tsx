import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ResultsView } from "@/components/ResultsView";

type SearchParams = Promise<{ q?: string | string[]; r?: string | string[] }>;

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const q = first((await searchParams).q).trim();
  return { title: q ? `${q} near you · Santayo` : "Results · Santayo" };
}

export default function ResultsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p role="status" className="py-24 text-center text-stone-500">🍳 Loading…</p>}>
      <Results searchParams={searchParams} />
    </Suspense>
  );
}

async function Results({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = first(sp.q).trim().slice(0, 60);
  if (!q) redirect("/");
  const radius = first(sp.r) === "10" ? 10 : 5;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <Link href="/" className="text-lg font-bold text-orange-600">
          Santayo
        </Link>
        <form action="/results" className="flex min-w-0 flex-1 gap-2">
          <input
            name="q"
            defaultValue={q}
            maxLength={60}
            aria-label="What do you want to eat?"
            className="min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-4 py-2 dark:border-stone-700 dark:bg-stone-900"
          />
          <button className="rounded-full bg-orange-500 px-5 py-2 font-semibold text-white hover:bg-orange-600">
            Search
          </button>
        </form>
      </header>
      <h1 className="mb-4 text-2xl font-bold">
        <span className="capitalize">{q}</span> near you
      </h1>
      <ResultsView q={q} radius={radius} />
    </main>
  );
}
