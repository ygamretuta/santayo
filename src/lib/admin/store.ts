import { redis } from "../redis";

/* Small Redis-backed state for the admin: which keys are current/previous, an audit log, a lock. */

const KEY = (slot: string) => `santayo:admin:key:${slot}`;
const LOG = "santayo:admin:log";
const LOG_LIMIT = 50;

export const keyState = {
  async get(slot: "current" | "previous"): Promise<string | null> {
    return redis ? ((await redis.get<string>(KEY(slot))) ?? null) : null;
  },
  async set(slot: "current" | "previous", name: string | null): Promise<void> {
    if (!redis) throw new Error("Redis isn't configured");
    if (name === null) await redis.del(KEY(slot));
    else await redis.set(KEY(slot), name);
  },
};

export interface LogEntry {
  at: string;
  action: "rotate" | "revoke" | "login" | "login-failed";
  ok: boolean;
  detail?: string;
}

export async function appendLog(entry: Omit<LogEntry, "at">): Promise<void> {
  if (!redis) return;
  try {
    await redis.pipeline().lpush(LOG, JSON.stringify({ at: new Date().toISOString(), ...entry })).ltrim(LOG, 0, LOG_LIMIT - 1).exec();
  } catch {
    // The audit log is best-effort.
  }
}

export async function readLog(count = 10): Promise<LogEntry[]> {
  if (!redis) return [];
  try {
    const rows = await redis.lrange<LogEntry | string>(LOG, 0, count - 1);
    return rows.map((r) => (typeof r === "string" ? (JSON.parse(r) as LogEntry) : r));
  } catch {
    return [];
  }
}

/** One rotation at a time. Returns false if another is already running. */
export async function withLock<T>(name: string, ttlSeconds: number, fn: () => Promise<T>): Promise<{ ran: true; value: T } | { ran: false }> {
  if (!redis) return { ran: true, value: await fn() };
  const key = `santayo:admin:lock:${name}`;
  const got = await redis.set(key, "1", { nx: true, ex: ttlSeconds });
  if (!got) return { ran: false };
  try {
    return { ran: true, value: await fn() };
  } finally {
    await redis.del(key).catch(() => {});
  }
}
