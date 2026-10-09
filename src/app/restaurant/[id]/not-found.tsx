import Link from "next/link";
import "./not-found.css";

export default function NotFound() {
  return (
    <main className="page page--empty">
      <p className="not-found__emoji">🍽️</p>
      <h1 className="not-found__title">We couldn’t find that restaurant</h1>
      <Link href="/" className="button">
        Start a new search
      </Link>
    </main>
  );
}
