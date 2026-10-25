import { describe, expect, it } from "vitest";
import { isDeployHook, triggerDeploy, upsertEnvVar, vercelConfig } from "./vercel";

const rec = (res: Response) => {
  const calls: { url: string; init: RequestInit }[] = [];
  const f = (async (url: string, init: RequestInit) => (calls.push({ url: String(url), init }), res)) as unknown as typeof fetch;
  return { f, calls };
};

describe("vercelConfig", () => {
  it("needs token, project and deploy hook", () => {
    expect(vercelConfig({ VERCEL_API_TOKEN: "t", VERCEL_PROJECT_ID: "p" })).toBeNull();
    expect(vercelConfig({ VERCEL_API_TOKEN: "t", VERCEL_PROJECT_ID: "p", VERCEL_DEPLOY_HOOK_URL: "h", VERCEL_TEAM_ID: "team" })).toMatchObject({ teamId: "team" });
  });
});

describe("upsertEnvVar", () => {
  it("POSTs a sensitive var for production + preview, scoped to the team", async () => {
    const { f, calls } = rec(new Response("{}", { status: 201 }));
    await upsertEnvVar(f, { token: "tok", projectId: "prj_1", teamId: "team_1" }, "GOOGLE_MAPS_API_KEY", "AIzaNEW");
    expect(calls[0].url).toBe("https://api.vercel.com/v10/projects/prj_1/env?upsert=true&teamId=team_1");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ key: "GOOGLE_MAPS_API_KEY", value: "AIzaNEW", type: "sensitive", target: ["production", "preview"] });
  });
  it("reports Vercel's error message", async () => {
    const { f } = rec(new Response(JSON.stringify({ error: { message: "Not authorized" } }), { status: 403 }));
    await expect(upsertEnvVar(f, { token: "t", projectId: "p" }, "K", "v")).rejects.toThrow("Not authorized");
  });
});

describe("deploy hook", () => {
  it("only accepts Vercel deploy-hook URLs", () => {
    expect(isDeployHook("https://api.vercel.com/v1/integrations/deploy/prj_x/abc")).toBe(true);
    for (const bad of ["http://api.vercel.com/v1/integrations/deploy/x", "https://evil.example/v1/integrations/deploy/x", "https://api.vercel.com/v10/projects", "nonsense"]) {
      expect(isDeployHook(bad), bad).toBe(false);
    }
  });
  it("refuses to POST anywhere else, and reports failures", async () => {
    const { f, calls } = rec(new Response("", { status: 200 }));
    await expect(triggerDeploy(f, "https://evil.example/hook")).rejects.toThrow("not a Vercel deploy hook");
    expect(calls).toHaveLength(0);
    await expect(triggerDeploy(rec(new Response("", { status: 500 })).f, "https://api.vercel.com/v1/integrations/deploy/a/b")).rejects.toThrow("HTTP 500");
    await expect(triggerDeploy(f, "https://api.vercel.com/v1/integrations/deploy/a/b")).resolves.toBeUndefined();
  });
});
