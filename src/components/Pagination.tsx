import Link from "next/link";
import type { Page } from "@/lib/paginate";
import "./pagination.css";

interface Props {
  page: Page<unknown>;
  /** Builds the URL for a given page number. */
  hrefFor: (page: number) => string;
}

export function Pagination({ page, hrefFor }: Props) {
  if (page.totalPages <= 1) return null;
  const numbers = Array.from({ length: page.totalPages }, (_, i) => i + 1);
  const prev = page.page - 1;
  const next = page.page + 1;

  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="pagination__summary" role="status">
        Showing {page.from}–{page.to} of {page.total} places
      </p>
      <ul className="pagination__list">
        <li>
          <Link
            href={hrefFor(Math.max(prev, 1))}
            aria-label="Previous page"
            aria-disabled={prev < 1}
            tabIndex={prev < 1 ? -1 : undefined}
            className={`pagination__link ${prev < 1 ? "pagination__link--disabled" : ""}`}
          >
            <span aria-hidden>←</span>
            <span className="pagination__label">Prev</span>
          </Link>
        </li>
        {numbers.map((n) => (
          <li key={n}>
            <Link
              href={hrefFor(n)}
              aria-label={`Page ${n}`}
              aria-current={n === page.page ? "page" : undefined}
              className={`pagination__link ${n === page.page ? "pagination__link--active" : ""}`}
            >
              {n}
            </Link>
          </li>
        ))}
        <li>
          <Link
            href={hrefFor(Math.min(next, page.totalPages))}
            aria-label="Next page"
            aria-disabled={next > page.totalPages}
            tabIndex={next > page.totalPages ? -1 : undefined}
            className={`pagination__link ${next > page.totalPages ? "pagination__link--disabled" : ""}`}
          >
            <span className="pagination__label">Next</span>
            <span aria-hidden>→</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
