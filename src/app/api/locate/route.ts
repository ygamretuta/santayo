import { NextResponse, type NextRequest } from "next/server";
import { guard } from "@/lib/guard";
import { locatePlaces } from "@/lib/places";

/** "Where am I?": streets, landmarks and areas matching what was typed. Replaces the city-centre-only geocoder. */
export async function GET(request: NextRequest) {
  const blocked = await guard(request, "locate", 10);
  if (blocked) return blocked;

  const p = request.nextUrl.searchParams;
  const q = (p.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ error: "Type at least two characters." }, { status: 400 });

  const lat = Number(p.get("lat"));
  const lng = Number(p.get("lng"));
  const near =
    p.has("lat") && Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lng) && Math.abs(lng) <= 180
      ? { lat, lng }
      : undefined;

  try {
    return NextResponse.json({ choices: await locatePlaces(q, near) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Place lookup failed" }, { status: 502 });
  }
}
