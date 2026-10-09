import { SearchBox } from "@/components/SearchBox";

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

      <SearchBox variant="hero" />
    </main>
  );
}
