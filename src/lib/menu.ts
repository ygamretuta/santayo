import type { Menu, MenuKind } from "./types";

/*
 * Google's Places API has no menu field, so we look for one on the
 * restaurant's own website: a "Menu" link, a /menu page, or a menu PDF/image.
 * Only shown when found. All fetching is server-side, bounded and SSRF-guarded.
 */

const FETCH_TIMEOUT_MS = 4000;
const MAX_HTML_CHARS = 500_000;
const MAX_REDIRECTS = 3;
const REVALIDATE_SECONDS = 60 * 60 * 24;

/** Social/link-in-bio hosts: login walls and no real menu to find. */
const SKIP_HOSTS = /(^|\.)(facebook|instagram|tiktok|twitter|x|youtube|linktr)\.(com|ee)$/i;

/** http(s) only, no localhost/IP literals/internal names. */
export function isSafePublicUrl(raw: string | URL): boolean {
  let u: URL;
  try {
    u = typeof raw === "string" ? new URL(raw) : raw;
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  if (u.username || u.password) return false;
  if (u.port && u.port !== "80" && u.port !== "443") return false;
  const host = u.hostname.toLowerCase();
  if (!host.includes(".")) return false; // localhost, intranet names
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || host.startsWith("[")) return false;
  if (/\.(local|localhost|internal|lan|home|corp)$/.test(host)) return false;
  return true;
}

export interface LinkCandidate {
  href: string;
  text: string;
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x2F;/gi, "/").replace(/&#38;/g, "&");

export function extractLinks(html: string, base: string): LinkCandidate[] {
  const out: LinkCandidate[] = [];
  const re = /<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(re)) {
    const rawHref = decode((m[1] ?? m[2] ?? "").trim());
    if (!rawHref || rawHref.startsWith("#") || /^(javascript|mailto|tel|data):/i.test(rawHref)) continue;
    let href: string;
    try {
      href = new URL(rawHref, base).toString();
    } catch {
      continue;
    }
    const text = decode(m[3].replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
    out.push({ href, text });
  }
  return out;
}

const FILE_KIND = (path: string): MenuKind | null =>
  /\.pdf$/i.test(path) ? "pdf" : /\.(png|jpe?g|webp|gif)$/i.test(path) ? "image" : null;

function score(c: LinkCandidate, base: URL): number {
  let u: URL;
  try {
    u = new URL(c.href);
  } catch {
    return 0;
  }
  if (!isSafePublicUrl(u)) return 0;
  if (u.hostname === base.hostname && u.pathname === base.pathname && !u.search) return 0;

  const text = c.text.toLowerCase();
  const textMenu = /\bmenus?\b/.test(text) && text.length <= 40;
  const hrefMenu = /menu/i.test(u.pathname);
  if (!textMenu && !hrefMenu) return 0;

  let s = (textMenu ? 5 : 0) + (hrefMenu ? 3 : 0);
  if (FILE_KIND(u.pathname)) s += 2;
  if (u.hostname !== base.hostname) s -= 1; // prefer the restaurant's own pages
  return s;
}

/** Best menu-looking link on a page, or null. */
export function pickMenuLink(html: string, pageUrl: string): string | null {
  const base = new URL(pageUrl);
  let best: { href: string; score: number } | null = null;
  for (const c of extractLinks(html, pageUrl)) {
    const sc = score(c, base);
    if (sc >= 3 && (!best || sc > best.score)) best = { href: c.href, score: sc };
  }
  return best?.href ?? null;
}

/** fetch() that re-validates every redirect hop and is time/size bounded. */
async function safeFetch(url: string, init: RequestInit = {}): Promise<{ res: Response; url: string } | null> {
  let current = url;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    if (!isSafePublicUrl(current)) return null;
    const res = await fetch(current, {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": "SantayoBot/1.0 (menu lookup)", Accept: "text/html,application/pdf,image/*", ...init.headers },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      current = new URL(loc, current).toString();
      continue;
    }
    return { res, url: current };
  }
  return null;
}

function framingAllowed(h: Headers): boolean {
  if (h.get("x-frame-options")) return false;
  const csp = h.get("content-security-policy") ?? "";
  const fa = /frame-ancestors\s+([^;]+)/i.exec(csp)?.[1];
  return !fa || /(^|\s)\*(\s|$)/.test(fa);
}

/** A "menu" that redirects to a sign-in screen is private, not a menu. */
export function isLoginPage(url: string): boolean {
  try {
    const u = new URL(url);
    return /(^|\.)accounts\.google\.com$/i.test(u.hostname) || /\/(sign-?in|log-?in|auth)(\/|$)/i.test(u.pathname);
  } catch {
    return false;
  }
}

/** Classifies the menu URL and whether it can be shown inside our dialog. */
async function inspectMenu(url: string): Promise<Menu | null> {
  const byExt = FILE_KIND(new URL(url).pathname);
  try {
    const got = await safeFetch(url, { method: "HEAD" }) ?? (await safeFetch(url));
    if (got && isLoginPage(got.url)) return null;
    if (!got || !got.res.ok) return { url, kind: byExt ?? "page", embeddable: false };
    const type = (got.res.headers.get("content-type") ?? "").toLowerCase();
    const kind: MenuKind = type.includes("pdf") ? "pdf" : type.startsWith("image/") ? "image" : (byExt ?? "page");
    return { url: got.url, kind, embeddable: framingAllowed(got.res.headers) || kind === "image" };
  } catch {
    return { url, kind: byExt ?? "page", embeddable: false };
  }
}

/** Upper bound for the whole lookup so a slow site can't hold the page up. */
const LOOKUP_BUDGET_MS = 6000;

export function findMenu(website?: string): Promise<Menu | null> {
  return Promise.race([
    lookup(website),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), LOOKUP_BUDGET_MS)),
  ]);
}

async function lookup(website?: string): Promise<Menu | null> {
  if (!website || !isSafePublicUrl(website)) return null;
  try {
    if (SKIP_HOSTS.test(new URL(website).hostname)) return null;

    const page = await safeFetch(website);
    if (!page || !page.res.ok) return null;
    const type = (page.res.headers.get("content-type") ?? "").toLowerCase();

    // The website itself may already be the menu (a PDF, or a /menu page).
    if (type.includes("pdf") || type.startsWith("image/")) return inspectMenu(page.url);
    if (!type.includes("html")) return null;

    const html = (await page.res.text()).slice(0, MAX_HTML_CHARS);
    const link = pickMenuLink(html, page.url);
    if (link) return inspectMenu(link);
    if (/menu/i.test(new URL(page.url).pathname)) return inspectMenu(page.url);
    return null;
  } catch {
    return null; // timeouts, DNS failures, bad HTML: treat as "no menu"
  }
}
