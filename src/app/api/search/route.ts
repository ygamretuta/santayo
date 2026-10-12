import { NextResponse, type NextRequest } from "next/server";
import { searchRestaurants } from "@/lib/places";
import { clampRadius, DEFAULT_RADIUS_KM } from "@/lib/radius";
import { guard } from "@/lib/guard";

export async function GET(request: NextRequest) {
  const blocked = await guard(request, "search", 20);
  if (blocked) return blocked;
  const p = request.nextUrl.searchParams;
  const q = (p.get("q") ?? "").trim().slice(0, 60);
  const lat = Number(p.get("lat"));
  const lng = Number(p.get("lng"));
  const r = Number(p.get("r") ?? DEFAULT_RADIUS_KM);

  if (
    !q ||
    !Number.isFinite(lat) || lat < -90 || lat > 90 ||
    !Number.isFinite(lng) || lng < -180 || lng > 180
  ) {
    return NextResponse.json({ error: "Invalid search parameters" }, { status: 400 });
  }
  const radiusKm = clampRadius(r);

  try {
    return NextResponse.json(await searchRestaurants(q, { lat, lng }, radiusKm));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Restaurant search failed" }, { status: 502 });
  }
}
