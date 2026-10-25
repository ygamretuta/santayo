import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildJwt, createKey, deleteKey, findKeyByValue, gcpConfig, GcpError, getAccessToken, maskKey,
  parseQuotaLimits, parseRequestCounts, parseServiceAccount, requestCounts, waitForOperation,
} from "./gcp";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const sa = { client_email: "bot@proj.iam.gserviceaccount.com", private_key: privateKey, project_id: "proj" };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const noSleep = { sleep: async () => {}, intervalMs: 1 };

/** A fake fetch driven by a "METHOD url-substring" -> response table; records every call. */
function fakeFetch(routes: Record<string, () => Response>) {
  const calls: { method: string; url: string; body?: string }[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({ method, url: String(url), body: init?.body as string | undefined });
    const hit = Object.keys(routes).find((k) => `${method} ${url}`.includes(k));
    if (!hit) return json({ error: { message: `unexpected ${method} ${url}` } }, 500);
    return routes[hit]();
  }) as unknown as typeof fetch;
  return { f, calls };
}

describe("service account", () => {
  it("parses raw or base64 JSON and fixes escaped newlines", () => {
    const raw = JSON.stringify({ client_email: "a@b", private_key: "line1\\nline2", project_id: "p" });
    expect(parseServiceAccount(raw)?.private_key).toBe("line1\nline2");
    expect(parseServiceAccount(Buffer.from(raw).toString("base64"))?.client_email).toBe("a@b");
  });
  it("rejects junk and incomplete keys", () => {
    expect(parseServiceAccount(undefined)).toBeNull();
    expect(parseServiceAccount("not json")).toBeNull();
    expect(parseServiceAccount('{"client_email":"a@b"}')).toBeNull();
  });
  it("takes the project from GCP_PROJECT_ID, else from the key file", () => {
    const raw = JSON.stringify(sa);
    expect(gcpConfig({ GOOGLE_SERVICE_ACCOUNT_JSON: raw })?.projectId).toBe("proj");
    expect(gcpConfig({ GOOGLE_SERVICE_ACCOUNT_JSON: raw, GCP_PROJECT_ID: "other" })?.projectId).toBe("other");
    expect(gcpConfig({})).toBeNull();
  });
});

describe("JWT + access token", () => {
  it("builds an RS256 JWT that verifies against the public key", () => {
    const jwt = buildJwt(sa, 1_800_000_000);
    const [h, c, s] = jwt.split(".");
    expect(JSON.parse(Buffer.from(h, "base64url").toString())).toEqual({ alg: "RS256", typ: "JWT" });
    const claims = JSON.parse(Buffer.from(c, "base64url").toString());
    expect(claims).toMatchObject({ iss: sa.client_email, aud: "https://oauth2.googleapis.com/token", iat: 1_800_000_000, exp: 1_800_003_600 });
    expect(claims.scope).toContain("cloud-platform");
    expect(createVerify("RSA-SHA256").update(`${h}.${c}`).verify(publicKey, Buffer.from(s, "base64url"))).toBe(true);
  });
  it("exchanges it for a token and caches it", async () => {
    const { f, calls } = fakeFetch({ "POST https://oauth2.googleapis.com/token": () => json({ access_token: "tok", expires_in: 3600 }) });
    const other = { ...sa, client_email: "cache@proj.iam.gserviceaccount.com" };
    expect(await getAccessToken(other, f, 1000)).toBe("tok");
    expect(await getAccessToken(other, f, 2000)).toBe("tok");
    expect(calls).toHaveLength(1);
    expect(String(calls[0].body)).toContain("grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer");
  });
  it("surfaces Google's reason when auth fails", async () => {
    const { f } = fakeFetch({ "POST https://oauth2.googleapis.com/token": () => json({ error: "invalid_grant", error_description: "Invalid JWT Signature." }, 400) });
    await expect(getAccessToken({ ...sa, client_email: "bad@proj" }, f)).rejects.toThrow("Invalid JWT Signature.");
  });
});

describe("API keys", () => {
  const KEYS = "https://apikeys.googleapis.com/v2";
  it("creates a Places-restricted key, waits for the operation, then reads the key string", async () => {
    let polls = 0;
    const { f, calls } = fakeFetch({
      [`POST ${KEYS}/projects/proj/locations/global/keys`]: () => json({ name: "operations/op1", done: false }),
      [`GET ${KEYS}/operations/op1`]: () => (++polls < 2 ? json({ name: "operations/op1", done: false }) : json({ name: "operations/op1", done: true, response: { name: "projects/1/locations/global/keys/k1" } })),
      [`GET ${KEYS}/projects/1/locations/global/keys/k1/keyString`]: () => json({ keyString: "AIzaNEW" }),
    });
    expect(await createKey(f, "t", "proj", "santayo-x", noSleep)).toEqual({ name: "projects/1/locations/global/keys/k1", keyString: "AIzaNEW" });
    const create = JSON.parse(calls[0].body!);
    expect(create.restrictions.apiTargets).toEqual([{ service: "places.googleapis.com" }]);
    expect(create.displayName).toBe("santayo-x");
    expect(polls).toBe(2);
  });
  it("fails clearly when the operation errors or times out", async () => {
    const failing = fakeFetch({ "GET": () => json({ name: "operations/op", done: true, error: { message: "quota exceeded" } }) });
    await expect(waitForOperation(failing.f, "t", { name: "operations/op" }, noSleep)).rejects.toThrow("quota exceeded");
    const stuck = fakeFetch({ "GET": () => json({ name: "operations/op", done: false }) });
    await expect(waitForOperation(stuck.f, "t", { name: "operations/op" }, { sleep: async () => {}, intervalMs: 1000, timeoutMs: 3000 })).rejects.toThrow(/Timed out/);
  });
  it("finds a key by its secret value", async () => {
    const { f } = fakeFetch({
      [`GET ${KEYS}/projects/proj/locations/global/keys`]: () => json({ keys: [{ name: "projects/1/locations/global/keys/a" }, { name: "projects/1/locations/global/keys/b" }] }),
      "keys/a/keyString": () => json({ keyString: "AIzaA" }),
      "keys/b/keyString": () => json({ keyString: "AIzaB" }),
    });
    expect(await findKeyByValue(f, "t", "proj", "AIzaB")).toBe("projects/1/locations/global/keys/b");
    expect(await findKeyByValue(f, "t", "proj", "nope")).toBeNull();
  });
  it("deletes a key and reports permission errors with Google's message", async () => {
    const ok = fakeFetch({ "DELETE": () => json({ name: "operations/d", done: true }) });
    await expect(deleteKey(ok.f, "t", "projects/1/locations/global/keys/a", noSleep)).resolves.toBeUndefined();
    const denied = fakeFetch({ "DELETE": () => json({ error: { message: "Permission denied" } }, 403) });
    await expect(deleteKey(denied.f, "t", "k", noSleep)).rejects.toMatchObject({ status: 403, message: "Permission denied" });
    await expect(deleteKey(denied.f, "t", "k", noSleep)).rejects.toBeInstanceOf(GcpError);
  });
});

describe("quota", () => {
  const now = new Date("2026-10-25T12:00:00Z");
  const series = (cls: string, points: [string, string][]) => ({
    metric: { labels: { response_code_class: cls } },
    points: points.map(([endTime, n]) => ({ interval: { endTime }, value: { int64Value: n } })),
  });
  it("folds time series into per-day rows by response class", () => {
    const rows = parseRequestCounts(
      [{ timeSeries: [series("2xx", [["2026-10-25T12:00:00Z", "100"], ["2026-10-24T12:00:00Z", "40"]]), series("4xx", [["2026-10-25T12:00:00Z", "5"]]), series("5xx", [["2026-10-24T12:00:00Z", "2"]])] }],
      3, now,
    );
    expect(rows.map((r) => r.date)).toEqual(["2026-10-23", "2026-10-24", "2026-10-25"]);
    expect(rows[2]).toMatchObject({ ok: 100, clientError: 5, serverError: 0, total: 105 });
    expect(rows[1]).toMatchObject({ ok: 40, serverError: 2, total: 42 });
    expect(rows[0].total).toBe(0);
  });
  it("ignores points outside the window and pages through results", async () => {
    let page = 0;
    const { f, calls } = fakeFetch({
      "GET https://monitoring.googleapis.com/v3/projects/proj/timeSeries": () =>
        ++page === 1
          ? json({ nextPageToken: "n", timeSeries: [series("2xx", [["2026-10-25T12:00:00Z", "7"], ["2020-01-01T00:00:00Z", "999"]])] })
          : json({ timeSeries: [series("2xx", [["2026-10-25T12:00:00Z", "3"]])] }),
    });
    const rows = await requestCounts(f, "t", "proj", 2, now);
    expect(rows[1].total).toBe(10);
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toContain("places.googleapis.com");
    expect(calls[0].url).toContain("ALIGN_SUM");
    expect(calls[1].url).toContain("pageToken=n");
  });
  it("reads effective quota limits, treating -1 as unlimited", () => {
    expect(parseQuotaLimits({ metrics: [
      { displayName: "Text Search requests", consumerQuotaLimits: [{ unit: "1/min/{project}", quotaBuckets: [{ effectiveLimit: "600" }] }] },
      { displayName: "Autocomplete requests", consumerQuotaLimits: [{ unit: "1/min/{project}", quotaBuckets: [{ effectiveLimit: "-1" }] }] },
      { displayName: "No bucket", consumerQuotaLimits: [{ unit: "x", quotaBuckets: [] }] },
    ] })).toEqual([
      { name: "Autocomplete requests", unit: "1/min/{project}", limit: null },
      { name: "Text Search requests", unit: "1/min/{project}", limit: 600 },
    ]);
  });
});

describe("maskKey", () => {
  it("shows only the first and last four characters", () => {
    expect(maskKey("AIzaSyABCDEFGHIJKLMNOP1234")).toBe("AIza…1234");
    expect(maskKey(undefined)).toBe("not set");
  });
});
