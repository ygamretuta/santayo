/*
 * Tiny Vercel client for rotation: set the key env var, then trigger a redeploy
 * through a Deploy Hook so the new value reaches a fresh deployment.
 */

type Fetch = typeof fetch;

export interface VercelConfig {
  token: string;
  projectId: string;
  teamId?: string;
  deployHook: string;
}

export function vercelConfig(env: Record<string, string | undefined> = process.env): VercelConfig | null {
  const token = env.VERCEL_API_TOKEN;
  const projectId = env.VERCEL_PROJECT_ID;
  const deployHook = env.VERCEL_DEPLOY_HOOK_URL;
  return token && projectId && deployHook ? { token, projectId, teamId: env.VERCEL_TEAM_ID || undefined, deployHook } : null;
}

/** Only ever POST to Vercel's own deploy-hook endpoint. */
export function isDeployHook(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && u.hostname === "api.vercel.com" && u.pathname.startsWith("/v1/integrations/deploy/");
  } catch {
    return false;
  }
}

/** Creates or replaces a sensitive env var (sensitive vars can't target `development`). */
export async function upsertEnvVar(
  f: Fetch,
  cfg: Pick<VercelConfig, "token" | "projectId" | "teamId">,
  key: string,
  value: string,
  target: ("production" | "preview")[] = ["production", "preview"],
): Promise<void> {
  const qs = new URLSearchParams({ upsert: "true" });
  if (cfg.teamId) qs.set("teamId", cfg.teamId);
  const res = await f(`https://api.vercel.com/v10/projects/${encodeURIComponent(cfg.projectId)}/env?${qs}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ key, value, type: "sensitive", target }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Vercel refused the env update: ${(body?.error?.message ?? `HTTP ${res.status}`).slice(0, 200)}`);
  }
}

export async function triggerDeploy(f: Fetch, hookUrl: string): Promise<void> {
  if (!isDeployHook(hookUrl)) throw new Error("VERCEL_DEPLOY_HOOK_URL is not a Vercel deploy hook URL");
  const res = await f(hookUrl, { method: "POST", cache: "no-store" });
  if (!res.ok) throw new Error(`Deploy hook returned HTTP ${res.status}`);
}
