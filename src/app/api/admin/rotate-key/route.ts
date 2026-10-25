import type { NextRequest } from "next/server";
import { isAdmin, sameOrigin } from "@/lib/admin/auth";
import { noStoreJson } from "@/lib/admin/http";
import { revokePreviousKey, rotateKey } from "@/lib/admin/rotate";
import { liveRotateDeps } from "@/lib/admin/rotation";
import { appendLog, withLock } from "@/lib/admin/store";
import { guard } from "@/lib/guard";

// Creating a key, waiting for it to work and calling Vercel can take a while.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const blocked = await guard(request, "admin-rotate", 4);
  if (blocked) return blocked;
  if (!sameOrigin(request)) return noStoreJson({ error: "Forbidden" }, 403);
  if (!(await isAdmin())) return noStoreJson({ error: "Not signed in." }, 401);

  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (action !== "rotate" && action !== "revoke") return noStoreJson({ error: "Unknown action." }, 400);

  const deps = liveRotateDeps();
  if ("error" in deps) return noStoreJson({ error: deps.error }, 503);

  const outcome = await withLock("key-rotation", 120, () => (action === "rotate" ? rotateKey(deps) : revokePreviousKey(deps)));
  if (!outcome.ran) return noStoreJson({ error: "Another rotation is already running. Try again in a minute." }, 409);

  const result = outcome.value;
  await appendLog({
    action,
    ok: result.ok,
    detail: result.steps.filter((s) => !s.ok).map((s) => `${s.step}: ${s.detail ?? "failed"}`).join(" | ") || undefined,
  });
  return noStoreJson(result, result.ok ? 200 : 502);
}
