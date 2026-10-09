import { NextResponse, type NextRequest } from "next/server";

/** Fallback for people who decline location access: look up a city/area by name. */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`,
    { next: { revalidate: 86400 } },
  );
  if (!res.ok) return NextResponse.json({ error: "Lookup failed" }, { status: 502 });

  const hit = (await res.json()).results?.[0];
  if (!hit) return NextResponse.json({ error: "Place not found" }, { status: 404 });

  return NextResponse.json({
    lat: hit.latitude,
    lng: hit.longitude,
    label: [hit.name, hit.admin1, hit.country].filter(Boolean).join(", "),
  });
}
