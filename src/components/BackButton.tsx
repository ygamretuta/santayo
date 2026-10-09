"use client";

import { useRouter } from "next/navigation";
import "./back-button.css";

export function BackButton({ fallbackHref = "/" }: { fallbackHref?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallbackHref))}
      className="back-button"
    >
      <span aria-hidden>←</span> Back
    </button>
  );
}
