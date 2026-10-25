import { Ratelimit } from "@upstash/ratelimit";
import type { NextRequest } from "next/server";
import { redis } from "./redis";

const limiters = new Map<string, Ratelimit>();

function limiter(name: string, perMinute: number) {
  let l = limiters.get(name);
  if (!l && redis) {
    l = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(perMinute, "1 m"),
      prefix: `santayo:${name}`,
    });
    limiters.set(name, l);
  }
  return l;
}

const clientIp = (req: NextRequest) =>
  req.headers.get("x-real-ip") ??
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  "unknown";

/**
 * Protects routes that spend Google quota. Returns a Response to send back
 * when the request should be refused, or null to continue. Rate limiting is
 * skipped (fails open) when Upstash isn't configured or is unreachable.
 */
export async function guard(
  req: NextRequest,
  name: string,
  perMinute: number,
): Promise<Response | null> {
  if (req.headers.get("sec-fetch-site") === "cross-site") {
    return new Response("Forbidden", { status: 403 });
  }
  const l = limiter(name, perMinute);
  if (!l) return null;
  try {
    const { success, reset } = await l.limit(clientIp(req));
    if (!success) {
      return new Response("Too many requests", {
        status: 429,
        headers: { "Retry-After": String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))) },
      });
    }
  } catch (err) {
    console.error("rate limit check failed", err);
  }
  return null;
}
