import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";

/*
 * Admin auth: a single password (ADMIN_PASSWORD) trades for a signed, HTTP-only,
 * same-site cookie. The repo is public, so everything here relies on secrets
 * held in env vars, never in code.
 */

export const SESSION_COOKIE = "santayo_admin";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;
const MIN_SECRET_LENGTH = 32;

const sessionSecret = () => process.env.ADMIN_SESSION_SECRET;

export function adminConfigured(): boolean {
  const secret = sessionSecret();
  return Boolean(process.env.ADMIN_PASSWORD && secret && secret.length >= MIN_SECRET_LENGTH);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest();

/** Constant-time password check (both sides hashed so lengths always match). */
export function passwordMatches(input: string, expected = process.env.ADMIN_PASSWORD): boolean {
  if (!expected) return false;
  return timingSafeEqual(sha256(input), sha256(expected));
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const hmac = (data: string, secret: string) => createHmac("sha256", secret).update(data).digest();

/** `payload.signature`, where payload is `{exp}` (unix seconds). */
export function signSession(secret: string, nowMs = Date.now(), ttlSeconds = SESSION_TTL_SECONDS): string {
  const payload = b64url(JSON.stringify({ exp: Math.floor(nowMs / 1000) + ttlSeconds }));
  return `${payload}.${b64url(hmac(payload, secret))}`;
}

export function verifySession(token: string | undefined, secret: string | undefined, nowMs = Date.now()): boolean {
  if (!token || !secret || secret.length < MIN_SECRET_LENGTH) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return false;

  const expected = hmac(payload, secret);
  let given: Buffer;
  try {
    given = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > Math.floor(nowMs / 1000);
  } catch {
    return false;
  }
}

/** True when the request carries a valid admin session cookie. */
export async function isAdmin(): Promise<boolean> {
  // Session expiry compares against the current time, so this must run at request time.
  await connection();
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value, sessionSecret());
}

export function newSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: signSession(sessionSecret()!),
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    },
  };
}

/** State-changing requests must come from this site (belt and braces on top of SameSite=Strict). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
