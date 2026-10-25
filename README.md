# Santayo

Tell it what you're craving (type it, or tap a pill like *Steak* or *Fried chicken*) and get restaurants within 500 m, 5 km or 10 km (500 m is the default): thumbnail, star rating and average price per person. Tap one for details, reviews and TikTok review searches.

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

## Admin dashboard

`/admin` is a small, password-protected dashboard to see Google API usage and rotate the Google Maps key.

| Control | What it does | Needs |
| --- | --- | --- |
| **App usage** | Daily count of Google calls this app makes (searches, place lookups, photos, errors), last 30 days | Redis (Upstash) |
| **Google quota** | Request counts by day and response class, plus per-minute rate limits, reported by Google Cloud | A read-only service account |
| **Rotate key** | Creates a new key (Places API only), **tests it**, writes it to Vercel and redeploys | Service account with key admin + a Vercel token and deploy hook |
| **Revoke previous key** | Deletes the old key once the new deployment is live (Google keeps deleted keys 30 days) | Same as rotate |

The dashboard works in tiers: with only `ADMIN_PASSWORD` + `ADMIN_SESSION_SECRET` (and Redis) you get sign-in and app usage; each control that still needs setup is shown disabled with the exact env vars it is missing.

### Setup

1. **Sign-in** (required): set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` (32+ characters), see `.env.example` for generators.
2. **Google quota and rotation:** in the Google Cloud project that owns your Maps key:
   - Enable **API Keys API**, **Service Usage API** and **Cloud Monitoring API**.
   - Create a service account and grant it **API Keys Admin**, **Monitoring Viewer** and **Service Usage Viewer** (leave out API Keys Admin if you only want the quota view).
   - Create a JSON key for it and set `GOOGLE_SERVICE_ACCOUNT_JSON` to the file contents, or its base64 (`base64 -i key.json`). The project defaults to the one inside the file; override with `GCP_PROJECT_ID`.
3. **Rotation only:** in Vercel create an API token (scoped to your team) and a **Deploy Hook** (Project Settings, Git, Deploy Hooks, branch `main`), then set `VERCEL_API_TOKEN` and `VERCEL_DEPLOY_HOOK_URL`, plus `VERCEL_PROJECT_ID` (and `VERCEL_TEAM_ID` for team projects). Store all of these as **sensitive** env vars.

### How rotation stays safe

1. Notes which key is live, then creates a new key restricted to the Places API.
2. Calls Google with the new key. If it doesn't work, it is deleted and **nothing else changes**.
3. Writes it to Vercel (if that fails, the new key is deleted) and triggers a redeploy.
4. The old key keeps serving traffic. **Revoke previous key** refuses to run while the server is still using the old key, so you can't cut off the live deployment.

### Security notes

The repo is public, so all protection comes from secrets in env vars: one password (compared in constant time, 5 attempts per minute per IP), an HMAC-signed `HttpOnly`, `SameSite=Strict` session cookie (8 hours), same-origin checks on every request, no caching, and `noindex`. Every admin action is written to an audit log shown on the dashboard. Google does not expose remaining free credit or spend through any API, so check **Billing, Reports** in the Cloud console for that.

## Palette (60-30-10)

A scheme of three blues-and-orange hues, with tints and shades of each for the supporting detail. All tokens live in `src/app/globals.css`, with a warm-dark variant under `prefers-color-scheme: dark`.

| Share | Hue | Used for |
| --- | --- | --- |
| 60% | Orange `#d7733f` | header band on every page, warm cream page canvas |
| 30% | Sky blue `#72bbe2` | pale-blue cards and panels, selected pills/chips/pages |
| 10% | Blue `#2789bd` | buttons, links, prices, TikTok tiles, focus |

- **Contrast (WCAG AA, 4.5:1 for small text):** dark brown ink passes on orange (5.2:1) and sky (7.4:1 with navy ink), so both use the exact hex. White on `#2789bd` is only 3.9:1, so buttons use the deeper `#1f76a5` (5.0:1) and link text `#1b6e9b` (4.7:1+). The exact `#2789bd` is kept for focus rings and edges.
- Text is warm brown, never pure black. Sky tints and the blue accent share a hue, so depth (a slightly deeper tint) separates the facts panel from the review cards.

## Styling

- **BEM** (`block__element--modifier`). Each component owns one stylesheet named after its block, imported by the component (e.g. `search-box.css` for `SearchBox`). Shared tokens, base styles and the `page`, `status` and `button` blocks live in `src/app/globals.css`.
- **8pt grid.** Every spacing, size and radius is a multiple of 8 px, taken from the `--space-*`, `--radius-*` and `--control-height*` tokens. Allowed exceptions: 1 px hairline borders and the 4 px focus ring. Type sizes are not on the grid, but line-heights are. `pnpm lint:grid` enforces this.
- Grid columns that can hold truncated text must use `minmax(0, 1fr)`, otherwise long names widen the page on phones.

## Scripts

`pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm lint:grid` · `pnpm test`

## License

[MIT](LICENSE) © 2026 Ygam Retuta
