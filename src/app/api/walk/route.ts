import { NextResponse, type NextRequest } from "next/server";
import { guard } from "@/lib/guard";
import { MAX_WALK_IDS, walkingTimes } from "@/lib/places/routes";

/** Real walking times from the visitor's spot to up to ten places (the current page of results). */
export async function GET(request: NextRequest) {
  const blocked = await guard(request, "walk", 30);
  if (blocked) return blocked;

  const p = request.nextUrl.searchParams;
  const lat = Number(p.get("lat"));
  const lng = Number(p.get("lng"));
  if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Invalid location" }, { status: 400 });
  }

  // Google place ids only ("demo.*" ids and anything odd are dropped).
  const ids = (p.get("ids") ?? "")
    .split(",")
    .filter((id) => /^[\w-]{10,200}$/.test(id))
    .slice(0, MAX_WALK_IDS);
  if (ids.length === 0) return NextResponse.json({ routes: {}, available: false });

  return NextResponse.json(await walkingTimes({ lat, lng }, ids));
}
