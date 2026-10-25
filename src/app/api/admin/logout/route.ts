import type { NextRequest } from "next/server";
import { SESSION_COOKIE, sameOrigin } from "@/lib/admin/auth";
import { noStoreJson } from "@/lib/admin/http";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return noStoreJson({ error: "Forbidden" }, 403);
  const res = noStoreJson({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
