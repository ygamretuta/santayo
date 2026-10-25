import { after } from "next/server";
import { redis } from "../redis";

/*
 * App-side counters for calls we make to Google, kept per UTC day in Redis.
 * Needs no Google credentials. Place details are cached by Next for an hour,
 * so "details" counts page renders that asked for a place, not billed requests;
 * search and photo calls are uncached, so those counts are exact.
 */

export type GoogleCall = "search" | "details" | "photo";
export const CALL_KINDS: GoogleCall[] = ["search", "details", "photo"];

const RETENTION_DAYS = 100;

export const dayKey = (d = new Date()) => `santayo:usage:${d.toISOString().slice(0, 10)}`;

/** Fire-and-forget: runs after the response, and never throws into the caller. */
export function trackGoogleCall(kind: GoogleCall, ok: boolean) {
  if (!redis) return;
  const write = async () => {
    const key = dayKey(); // computed here, after the response, never during render
    try {
      const p = redis!.pipeline().hincrby(key, kind, 1);
      if (!ok) p.hincrby(key, `${kind}_error`, 1);
      await p.expire(key, RETENTION_DAYS * 86400).exec();
    } catch {
      // Analytics must never break a search.
    }
  };
  try {
    after(write);
  } catch {
    void write(); // called outside a request scope
  }
}

export interface DayUsage {
  date: string;
  search: number;
  details: number;
  photo: number;
  errors: number;
  total: number;
}

export interface UsageSummary {
  days: DayUsage[]; // oldest first
  today: DayUsage;
  last7: Omit<DayUsage, "date">;
  last30: Omit<DayUsage, "date">;
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

export function toDayUsage(date: string, hash: Record<string, unknown> | null): DayUsage {
  const h = hash ?? {};
  const search = num(h.search);
  const details = num(h.details);
  const photo = num(h.photo);
  return {
    date,
    search,
    details,
    photo,
    errors: num(h.search_error) + num(h.details_error) + num(h.photo_error),
    total: search + details + photo,
  };
}

function sum(days: DayUsage[]): Omit<DayUsage, "date"> {
  return days.reduce(
    (a, d) => ({
      search: a.search + d.search,
      details: a.details + d.details,
      photo: a.photo + d.photo,
      errors: a.errors + d.errors,
      total: a.total + d.total,
    }),
    { search: 0, details: 0, photo: 0, errors: 0, total: 0 },
  );
}

export function summarize(days: DayUsage[]): UsageSummary {
  return { days, today: days[days.length - 1], last7: sum(days.slice(-7)), last30: sum(days.slice(-30)) };
}

/** The last `count` UTC dates, oldest first. */
export function lastDates(count: number, now = new Date()): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - (count - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

/** null when Redis isn't configured. */
export async function readUsage(count = 30): Promise<UsageSummary | null> {
  if (!redis) return null;
  const dates = lastDates(count);
  const p = redis.pipeline();
  dates.forEach((d) => p.hgetall(`santayo:usage:${d}`));
  const rows = (await p.exec()) as (Record<string, unknown> | null)[];
  return summarize(dates.map((d, i) => toDayUsage(d, rows[i])));
}
