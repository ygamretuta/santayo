import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <p className="text-5xl">🍽️</p>
      <h1 className="text-2xl font-bold">We couldn’t find that restaurant</h1>
      <Link href="/" className="rounded-full bg-orange-500 px-5 py-2 font-semibold text-white">
        Start a new search
      </Link>
    </main>
  );
}
