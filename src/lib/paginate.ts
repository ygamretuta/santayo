export const PAGE_SIZE = 10;

export interface Page<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
  /** 1-based index of the first / last item shown. */
  from: number;
  to: number;
}

/** Slices `list` into a page; out-of-range page numbers are clamped. */
export function paginate<T>(list: T[], page: number, size = PAGE_SIZE): Page<T> {
  const totalPages = Math.max(1, Math.ceil(list.length / size));
  const current = Math.min(Math.max(Number.isFinite(page) ? Math.floor(page) : 1, 1), totalPages);
  const start = (current - 1) * size;
  const items = list.slice(start, start + size);
  return {
    items,
    page: current,
    totalPages,
    total: list.length,
    from: items.length ? start + 1 : 0,
    to: start + items.length,
  };
}
