import { createSign } from "node:crypto";
import { lastDates } from "./usage";

/*
 * Minimal Google Cloud client (no SDK): service-account auth, the API Keys API
 * (rotation) and the Monitoring / Service Usage APIs (quota view).
 *
 * Service account roles needed:
 *   - API Keys Admin            (roles/serviceusage.apiKeysAdmin)   rotation
 *   - Monitoring Viewer         (roles/monitoring.viewer)           request counts
 *   - Service Usage Viewer      (roles/serviceusage.serviceUsageViewer) quota limits
 * Every network function takes an injectable `fetch` so it can be tested offline.
 */

type Fetch = typeof fetch;

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const KEYS_API = "https://apikeys.googleapis.com/v2";
const MONITORING_API = "https://monitoring.googleapis.com/v3";
const SERVICE_USAGE_API = "https://serviceusage.googleapis.com/v1beta1";
const PLACES_SERVICE = "places.googleapis.com";

export class GcpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "GcpError";
  }
}

/* ---------- configuration ---------- */

export interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
  token_uri?: string;
}

/** Accepts the raw JSON key file, or that JSON base64-encoded (easier to paste into env vars). */
export function parseServiceAccount(raw?: string): ServiceAccount | null {
  if (!raw) return null;
  const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw.trim(), "base64").toString("utf8");
  try {
    const j = JSON.parse(text);
    if (typeof j.client_email !== "string" || typeof j.private_key !== "string") return null;
    return {
      client_email: j.client_email,
      private_key: j.private_key.includes("\\n") ? j.private_key.replace(/\\n/g, "\n") : j.private_key,
      project_id: typeof j.project_id === "string" ? j.project_id : undefined,
      token_uri: typeof j.token_uri === "string" ? j.token_uri : undefined,
    };
  } catch {
    return null;
  }
}

export interface GcpConfig {
  projectId: string;
  serviceAccount: ServiceAccount;
}

export function gcpConfig(env: Record<string, string | undefined> = process.env): GcpConfig | null {
  const serviceAccount = parseServiceAccount(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const projectId = env.GCP_PROJECT_ID || serviceAccount?.project_id;
  return serviceAccount && projectId ? { projectId, serviceAccount } : null;
}

/* ---------- auth ---------- */

const b64url = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");

/** Signed JWT assertion for the OAuth "JWT bearer" grant. */
export function buildJwt(sa: ServiceAccount, nowSec = Math.floor(Date.now() / 1000)): string {
  const unsigned = `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url({
    iss: sa.client_email,
    scope: SCOPE,
    aud: sa.token_uri ?? TOKEN_URL,
    iat: nowSec,
    exp: nowSec + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url");
  return `${unsigned}.${signature}`;
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function getAccessToken(sa: ServiceAccount, f: Fetch = fetch, nowMs = Date.now()): Promise<string> {
  const cached = tokenCache.get(sa.client_email);
  if (cached && cached.expiresAt > nowMs + 60_000) return cached.token;

  const res = await f(sa.token_uri ?? TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: buildJwt(sa, Math.floor(nowMs / 1000)),
    }),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new GcpError(res.status, body.error_description ?? body.error ?? "Could not get a Google access token");
  }
  tokenCache.set(sa.client_email, { token: body.access_token, expiresAt: nowMs + (body.expires_in ?? 3600) * 1000 });
  return body.access_token;
}

/* ---------- request helper ---------- */

async function call<T>(f: Fetch, token: string, url: string, init: RequestInit = {}): Promise<T> {
  const res = await f(url, {
    ...init,
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  const text = await res.text();
  let body: { error?: { message?: string } } = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    // non-JSON error page
  }
  if (!res.ok) throw new GcpError(res.status, (body.error?.message ?? `HTTP ${res.status}`).slice(0, 300));
  return body as T;
}

/* ---------- API Keys (rotation) ---------- */

interface Operation {
  name: string;
  done?: boolean;
  error?: { message?: string };
  response?: { name?: string };
}

const realSleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function waitForOperation(
  f: Fetch,
  token: string,
  op: Operation,
  { timeoutMs = 20_000, intervalMs = 1000, sleep = realSleep } = {},
): Promise<Operation> {
  let current = op;
  for (let waited = 0; !current.done; waited += intervalMs) {
    if (waited >= timeoutMs) throw new GcpError(504, "Timed out waiting for Google to finish the operation");
    await sleep(intervalMs);
    current = await call<Operation>(f, token, `${KEYS_API}/${current.name}`);
  }
  if (current.error) throw new GcpError(400, current.error.message ?? "Operation failed");
  return current;
}

export interface ApiKey {
  name: string; // projects/NUMBER/locations/global/keys/ID
  displayName?: string;
  createTime?: string;
}

export async function getKeyString(f: Fetch, token: string, name: string): Promise<string> {
  const { keyString } = await call<{ keyString: string }>(f, token, `${KEYS_API}/${name}/keyString`);
  return keyString;
}

/** New key restricted to the Places API only. */
export async function createKey(
  f: Fetch,
  token: string,
  projectId: string,
  displayName: string,
  opts?: Parameters<typeof waitForOperation>[3],
): Promise<{ name: string; keyString: string }> {
  const op = await call<Operation>(f, token, `${KEYS_API}/projects/${projectId}/locations/global/keys`, {
    method: "POST",
    body: JSON.stringify({ displayName, restrictions: { apiTargets: [{ service: PLACES_SERVICE }] } }),
  });
  const done = await waitForOperation(f, token, op, opts);
  const name = done.response?.name;
  if (!name) throw new GcpError(502, "Google did not return the new key's name");
  return { name, keyString: await getKeyString(f, token, name) };
}

export async function listKeys(f: Fetch, token: string, projectId: string): Promise<ApiKey[]> {
  const { keys = [] } = await call<{ keys?: ApiKey[] }>(f, token, `${KEYS_API}/projects/${projectId}/locations/global/keys`);
  return keys;
}

export async function deleteKey(f: Fetch, token: string, name: string, opts?: Parameters<typeof waitForOperation>[3]) {
  const op = await call<Operation>(f, token, `${KEYS_API}/${name}`, { method: "DELETE" });
  await waitForOperation(f, token, op, opts);
}

/** Resource name of the key whose secret equals `value` (the key string is only readable per key). */
export async function findKeyByValue(f: Fetch, token: string, projectId: string, value: string): Promise<string | null> {
  for (const key of await listKeys(f, token, projectId)) {
    if ((await getKeyString(f, token, key.name).catch(() => null)) === value) return key.name;
  }
  return null;
}

/* ---------- quota (Monitoring + Service Usage) ---------- */

export interface RequestDay {
  date: string;
  ok: number; // 2xx / 3xx
  clientError: number; // 4xx
  serverError: number; // 5xx
  total: number;
}

interface TimeSeriesResponse {
  nextPageToken?: string;
  timeSeries?: {
    metric?: { labels?: Record<string, string> };
    points?: { interval?: { endTime?: string }; value?: { int64Value?: string; doubleValue?: number } }[];
  }[];
}

/** Folds Monitoring time series (grouped by response class) into one row per day. */
export function parseRequestCounts(pages: TimeSeriesResponse[], days: number, now = new Date()): RequestDay[] {
  const rows = new Map<string, RequestDay>(
    lastDates(days, now).map((date) => [date, { date, ok: 0, clientError: 0, serverError: 0, total: 0 }]),
  );
  for (const page of pages) {
    for (const series of page.timeSeries ?? []) {
      const cls = series.metric?.labels?.response_code_class ?? "";
      for (const point of series.points ?? []) {
        const row = rows.get((point.interval?.endTime ?? "").slice(0, 10));
        if (!row) continue;
        const n = Number(point.value?.int64Value ?? point.value?.doubleValue ?? 0) || 0;
        if (cls === "4xx") row.clientError += n;
        else if (cls === "5xx") row.serverError += n;
        else row.ok += n;
        row.total += n;
      }
    }
  }
  return [...rows.values()];
}

export async function requestCounts(f: Fetch, token: string, projectId: string, days = 30, now = new Date()): Promise<RequestDay[]> {
  const start = new Date(now.getTime() - days * 86_400_000);
  const base = new URLSearchParams({
    filter: [
      'metric.type="serviceruntime.googleapis.com/api/request_count"',
      'resource.type="consumed_api"',
      `resource.labels.service="${PLACES_SERVICE}"`,
    ].join(" AND "),
    "interval.startTime": start.toISOString(),
    "interval.endTime": now.toISOString(),
    "aggregation.alignmentPeriod": "86400s",
    "aggregation.perSeriesAligner": "ALIGN_SUM",
    "aggregation.crossSeriesReducer": "REDUCE_SUM",
    "aggregation.groupByFields": "metric.label.response_code_class",
  });

  const pages: TimeSeriesResponse[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams(base);
    if (pageToken) params.set("pageToken", pageToken);
    const page = await call<TimeSeriesResponse>(f, token, `${MONITORING_API}/projects/${projectId}/timeSeries?${params}`);
    pages.push(page);
    pageToken = page.nextPageToken;
  } while (pageToken && pages.length < 5);
  return parseRequestCounts(pages, days, now);
}

export interface QuotaLimit {
  name: string;
  unit: string;
  /** null = unlimited */
  limit: number | null;
}

interface ConsumerQuotaMetrics {
  metrics?: {
    metric?: string;
    displayName?: string;
    unit?: string;
    consumerQuotaLimits?: { unit?: string; quotaBuckets?: { effectiveLimit?: string }[] }[];
  }[];
}

export function parseQuotaLimits(json: ConsumerQuotaMetrics): QuotaLimit[] {
  const out: QuotaLimit[] = [];
  for (const m of json.metrics ?? []) {
    for (const l of m.consumerQuotaLimits ?? []) {
      const raw = l.quotaBuckets?.[0]?.effectiveLimit;
      if (raw === undefined) continue;
      const n = Number(raw);
      out.push({ name: m.displayName ?? m.metric ?? "Quota", unit: l.unit ?? m.unit ?? "", limit: n < 0 ? null : n });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function quotaLimits(f: Fetch, token: string, projectId: string): Promise<QuotaLimit[]> {
  const json = await call<ConsumerQuotaMetrics>(
    f,
    token,
    `${SERVICE_USAGE_API}/projects/${projectId}/services/${PLACES_SERVICE}/consumerQuotaMetrics?view=BASIC`,
  );
  return parseQuotaLimits(json);
}

/** Last four characters are enough to tell keys apart without exposing them. */
export const maskKey = (key?: string) => (key ? `${key.slice(0, 4)}…${key.slice(-4)}` : "not set");
