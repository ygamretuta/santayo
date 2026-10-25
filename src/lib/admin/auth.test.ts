import { describe, expect, it } from "vitest";
import { passwordMatches, sameOrigin, signSession, verifySession } from "./auth";

const secret = "x".repeat(40);
const now = 1_800_000_000_000;

describe("passwordMatches", () => {
  it("accepts only the exact password", () => {
    expect(passwordMatches("correct horse", "correct horse")).toBe(true);
    expect(passwordMatches("correct horsf", "correct horse")).toBe(false);
    expect(passwordMatches("", "correct horse")).toBe(false);
    expect(passwordMatches("a much longer wrong password than expected", "short")).toBe(false);
  });
  it("rejects everything when no password is configured", () => {
    expect(passwordMatches("anything", undefined)).toBe(false);
    expect(passwordMatches("", "")).toBe(false);
  });
});

describe("sessions", () => {
  it("round-trips a valid token", () => {
    expect(verifySession(signSession(secret, now), secret, now + 1000)).toBe(true);
  });
  it("expires after the TTL", () => {
    const token = signSession(secret, now, 60);
    expect(verifySession(token, secret, now + 59_000)).toBe(true);
    expect(verifySession(token, secret, now + 61_000)).toBe(false);
  });
  it("rejects tampering, wrong secrets and malformed tokens", () => {
    const token = signSession(secret, now);
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ exp: 9_999_999_999 })).toString("base64url");
    expect(verifySession(`${forged}.${sig}`, secret, now)).toBe(false);
    expect(verifySession(`${payload}.${sig}x`, secret, now)).toBe(false);
    expect(verifySession(token, "y".repeat(40), now)).toBe(false);
    expect(verifySession(`${token}.extra`, secret, now)).toBe(false);
    expect(verifySession("garbage", secret, now)).toBe(false);
    expect(verifySession(undefined, secret, now)).toBe(false);
  });
  it("refuses to verify with a missing or short secret", () => {
    const token = signSession(secret, now);
    expect(verifySession(token, undefined, now)).toBe(false);
    expect(verifySession(token, "short", now)).toBe(false);
  });
});

describe("sameOrigin", () => {
  const req = (h: Record<string, string>) => new Request("https://santayo.example/api/admin/login", { method: "POST", headers: h });
  it("allows the site's own origin", () => {
    expect(sameOrigin(req({ origin: "https://santayo.example", host: "santayo.example" }))).toBe(true);
    expect(sameOrigin(req({ origin: "https://santayo.example", host: "internal", "x-forwarded-host": "santayo.example" }))).toBe(true);
  });
  it("blocks other origins and missing headers", () => {
    expect(sameOrigin(req({ origin: "https://evil.example", host: "santayo.example" }))).toBe(false);
    expect(sameOrigin(req({ host: "santayo.example" }))).toBe(false);
    expect(sameOrigin(req({ origin: "not a url", host: "santayo.example" }))).toBe(false);
  });
});
