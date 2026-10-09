import type { Price } from "./types";

export interface PriceDisplay {
  /** Main label, e.g. "₱450" or "$$". Null when we know nothing. */
  label: string | null;
  /** Small caption under the label. */
  caption: string;
}

export function formatPrice(price: Price): PriceDisplay {
  if (price.avg != null && price.currency) {
    let label: string;
    try {
      label = new Intl.NumberFormat("en", {
        style: "currency",
        currency: price.currency,
        maximumFractionDigits: 0,
      }).format(price.avg);
    } catch {
      label = `${price.currency} ${Math.round(price.avg)}`;
    }
    return { label, caption: "avg. per person" };
  }
  if (price.level != null && price.level > 0) {
    return { label: "$".repeat(price.level), caption: "price level" };
  }
  return { label: null, caption: "price n/a" };
}

/** Midpoint of a Google-style money range ("units" arrive as strings). */
export function averageOfRange(
  start?: { units?: string; nanos?: number; currencyCode?: string },
  end?: { units?: string; nanos?: number; currencyCode?: string },
): { avg: number; currency: string } | null {
  const toNumber = (m?: { units?: string; nanos?: number }) =>
    m ? Number(m.units ?? 0) + (m.nanos ?? 0) / 1e9 : undefined;
  const lo = toNumber(start);
  const hi = toNumber(end);
  const currency = start?.currencyCode ?? end?.currencyCode;
  if (!currency || (lo == null && hi == null)) return null;
  const values = [lo, hi].filter((v): v is number => v != null && !Number.isNaN(v));
  if (values.length === 0) return null;
  return {
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    currency,
  };
}
