# Santayo

Tell it what you're craving (type it, or tap a pill like *Steak* or *Fried chicken*) and get restaurants within 5 or 10 km: thumbnail, star rating and average price per person. Tap one for details, reviews and TikTok review searches.

**Stack:** Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · plain CSS (BEM) · Vercel

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

## Menus

Google's Places API has no menu data, so `lib/menu.ts` looks for one on the restaurant's own website (a "Menu" link, a `/menu` page, or a menu PDF/image). The detail page shows **View menu** only when one is found, and opens it in a dialog. Sites that forbid framing get an "Open menu" link inside the dialog instead. Coverage depends on the restaurant having a real website: places with no website, or only a Facebook/Instagram page, get no menu button. Fetching is server-side, time-boxed, restricted to public http(s) hosts, and results are cached for a day.

## Notes

- Location comes from the browser and is kept in `sessionStorage` (never in the URL); coordinates are rounded to ~110 m before being sent. If permission is denied, you can search by city/area (Open-Meteo geocoding).
- TikTok has no public search/embed API, so the detail page links out to TikTok searches for the restaurant (plus YouTube/Instagram/Facebook/Reddit).

## Project structure

```
src/
  app/                 routes, route handlers (api/*) and page-level styles
  components/
    ui/                shared primitives: Thumb, Stars, Status, BackButton
    search/            SearchBox (input + food pills)
    results/           ResultsView and its parts: toolbar, list, card, pagination, location fallback
    restaurant/        detail-page sections: header, info card, reviews, social links
  hooks/               client hooks: useCoords (location), useRestaurantSearch (fetch)
  lib/
    places/            data providers (Google, demo), dedupe, provider switch
    *.ts               pure helpers: geo, price, sort, paginate, social, foods, types, guard
```

Each component sits next to its BEM stylesheet, and tests sit next to the code they cover (`*.test.ts`).

## Styling

- **BEM** (`block__element--modifier`). Each component owns one stylesheet named after its block, imported by the component (e.g. `search-box.css` for `SearchBox`). Shared tokens, base styles and the `page`, `status` and `button` blocks live in `src/app/globals.css`.
- **8pt grid.** Every spacing, size and radius is a multiple of 8 px, taken from the `--space-*`, `--radius-*` and `--control-height*` tokens. Allowed exceptions: 1 px hairline borders and the 4 px focus ring. Type sizes are not on the grid, but line-heights are. `pnpm lint:grid` enforces this.
- Grid columns that can hold truncated text must use `minmax(0, 1fr)`, otherwise long names widen the page on phones.

## Scripts

`pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm lint:grid` · `pnpm test`
