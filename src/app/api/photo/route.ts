import { type NextRequest } from "next/server";
import { googleKey, googlePhoto } from "@/lib/places/google";

// Only proxy real place-photo resource names so the key can't be used for anything else.
const PHOTO_NAME = /^places\/[\w-]+\/photos\/[\w-]+$/;

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name") ?? "";
  const w = Math.min(Math.max(Number(request.nextUrl.searchParams.get("w")) || 480, 64), 1600);

  if (!googleKey() || !PHOTO_NAME.test(name)) {
    return new Response("Not found", { status: 404 });
  }
  const upstream = await googlePhoto(name, w);
  if (!upstream.ok || !upstream.body) {
    return new Response("Photo unavailable", { status: 502 });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
    },
  });
}
