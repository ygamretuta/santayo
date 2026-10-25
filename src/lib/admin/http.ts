import { NextResponse } from "next/server";

/** JSON response that must never be cached (admin data, session cookies). */
export function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
