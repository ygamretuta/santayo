import Link from "next/link";
import "./logo.css";

/** Site wordmark; links to the home page. */
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Santayo home">
      <span className="logo__mark" aria-hidden>
        🍽️
      </span>
      <span className="logo__text">Santayo</span>
    </Link>
  );
}
