import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SearchBox } from "@/components/search/SearchBox";
import { Logo } from "@/components/ui/Logo";
import { Status } from "@/components/ui/Status";
import { ResultsView } from "@/components/results/ResultsView";
import "./results-page.css";

type SearchParams = Promise<{ q?: string | string[]; r?: string | string[]; page?: string | string[] }>;

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const q = first((await searchParams).q).trim();
  return { title: q ? `${q} near you · Santayo` : "Results · Santayo" };
}

export default function ResultsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<Status>🍳 Loading…</Status>}>
      <Results searchParams={searchParams} />
    </Suspense>
  );
}

async function Results({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = first(sp.q).trim().slice(0, 60);
  if (!q) redirect("/");
  const radius = first(sp.r) === "10" ? 10 : 5;
  const page = Math.max(1, parseInt(first(sp.page), 10) || 1);

  return (
    <main className="page">
      <header className="results-page__header">
        <Logo />
        <div className="results-page__search">
          <SearchBox key={q} initial={q} variant="compact" />
        </div>
      </header>
      <h1 className="results-page__title">
        <span className="results-page__term">{q}</span> near you
      </h1>
      <ResultsView q={q} radius={radius} page={page} />
    </main>
  );
}
