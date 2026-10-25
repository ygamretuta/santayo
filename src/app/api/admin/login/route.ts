import type { NextRequest } from "next/server";
import { adminConfigured, newSessionCookie, passwordMatches, sameOrigin } from "@/lib/admin/auth";
import { noStoreJson } from "@/lib/admin/http";
import { appendLog } from "@/lib/admin/store";
import { guard } from "@/lib/guard";

const FAILURE_DELAY_MS = 600;

export async function POST(request: NextRequest) {
  const blocked = await guard(request, "admin-login", 5);
  if (blocked) return blocked;
  if (!sameOrigin(request)) return noStoreJson({ error: "Forbidden" }, 403);
  if (!adminConfigured()) return noStoreJson({ error: "Admin isn't configured on this server." }, 503);

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password.slice(0, 200) : "";

  if (!passwordMatches(password)) {
    await new Promise((r) => setTimeout(r, FAILURE_DELAY_MS)); // slow down guessing
    await appendLog({ action: "login-failed", ok: false });
    return noStoreJson({ error: "Wrong password." }, 401);
  }

  await appendLog({ action: "login", ok: true });
  const cookie = newSessionCookie();
  const res = noStoreJson({ ok: true });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
