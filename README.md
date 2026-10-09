# Santayo

Tell it what you're craving (type it, or tap a pill like *Steak* or *Fried chicken*) and get restaurants within 5 or 10 km: thumbnail, star rating and average price per person. Tap one for details, reviews and TikTok review searches.

**Stack:** Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind 4 · Vercel

## Run it

```bash
pnpm install
cp .env.example .env.local   # optional, see below
pnpm dev
```

## Data

- **With `GOOGLE_MAPS_API_KEY`** set (Google Cloud → enable *Places API (New)*), results, photos, prices and reviews are real. The key stays server-side; photos are proxied through `/api/photo`.
- **Without it**, the app serves deterministic, clearly-labelled demo restaurants so everything is usable.

Average price comes from Google's `priceRange` (midpoint); when a place only has a coarse price level it shows `$`–`$$$$` instead.

## Notes

- Location comes from the browser and is kept in `sessionStorage` (never in the URL); coordinates are rounded to ~110 m before being sent. If permission is denied, you can search by city/area (Open-Meteo geocoding).
- TikTok has no public search/embed API, so the detail page links out to TikTok searches for the restaurant (plus YouTube/Instagram/Facebook/Reddit).

## Scripts

`pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm test`
