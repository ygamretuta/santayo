import { describe, expect, it } from "vitest";
import { capabilities } from "./status";

const sa = JSON.stringify({ client_email: "a@b", private_key: "k", project_id: "proj" });
const byId = (env: Record<string, string | undefined>, redis = true) => Object.fromEntries(capabilities(env, redis).map((c) => [c.id, c]));

describe("capabilities", () => {
  it("with nothing configured: only usage tracking needs Redis", () => {
    const c = byId({}, false);
    expect(c.usage).toMatchObject({ ready: false, missing: ["KV_REST_API_URL", "KV_REST_API_TOKEN"] });
    expect(c.quota.missing).toEqual(["GOOGLE_SERVICE_ACCOUNT_JSON"]);
    expect(c.rotate.ready).toBe(false);
  });
  it("redis alone enables usage tracking", () => {
    expect(byId({}).usage.ready).toBe(true);
  });
  it("a service account enables the quota view; rotation also needs Vercel", () => {
    const c = byId({ GOOGLE_SERVICE_ACCOUNT_JSON: sa });
    expect(c.quota.ready).toBe(true);
    expect(c.rotate.missing).toEqual(["VERCEL_API_TOKEN", "VERCEL_PROJECT_ID", "VERCEL_DEPLOY_HOOK_URL"]);
  });
  it("flags an invalid service account, and a missing project id", () => {
    expect(byId({ GOOGLE_SERVICE_ACCOUNT_JSON: "oops" }).quota.missing).toEqual(["GOOGLE_SERVICE_ACCOUNT_JSON (not valid JSON)"]);
    const noProject = JSON.stringify({ client_email: "a@b", private_key: "k" });
    expect(byId({ GOOGLE_SERVICE_ACCOUNT_JSON: noProject }).quota.missing).toEqual(["GCP_PROJECT_ID"]);
  });
  it("everything configured makes rotation ready", () => {
    const c = byId({ GOOGLE_SERVICE_ACCOUNT_JSON: sa, VERCEL_API_TOKEN: "t", VERCEL_PROJECT_ID: "p", VERCEL_DEPLOY_HOOK_URL: "h" });
    expect(c.rotate).toMatchObject({ ready: true, missing: [] });
  });
});
