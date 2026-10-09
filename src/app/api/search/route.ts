import { NextResponse, type NextRequest } from "next/server";
import { searchRestaurants } from "@/lib/places";

const MAX_RADIUS_KM = 10;

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const q = (p.get("q") ?? "").trim().slice(0, 60);
  const lat = Number(p.get("lat"));
  const lng = Number(p.get("lng"));
  const r = Number(p.get("r") ?? 5);

  if (
    !q ||
    !Number.isFinite(lat) || lat < -90 || lat > 90 ||
    !Number.isFinite(lng) || lng < -180 || lng > 180
  ) {
    return NextResponse.json({ error: "Invalid search parameters" }, { status: 400 });
  }
  const radiusKm = Math.min(Math.max(Number.isFinite(r) ? r : 5, 1), MAX_RADIUS_KM);

  try {
    return NextResponse.json(await searchRestaurants(q, { lat, lng }, radiusKm));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Restaurant search failed" }, { status: 502 });
  }
}
