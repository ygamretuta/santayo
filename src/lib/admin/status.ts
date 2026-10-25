import { gcpConfig, parseServiceAccount } from "./gcp";
import { vercelConfig } from "./vercel";

export type CapabilityId = "usage" | "quota" | "rotate";

export interface Capability {
  id: CapabilityId;
  label: string;
  description: string;
  ready: boolean;
  /** Env vars still needed. */
  missing: string[];
}

type Env = Record<string, string | undefined>;

/** What the dashboard can do with the current configuration, and what each missing piece is. */
export function capabilities(env: Env = process.env, hasRedis = Boolean(env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL)): Capability[] {
  const redisMissing = hasRedis ? [] : ["KV_REST_API_URL", "KV_REST_API_TOKEN"];

  const gcpMissing: string[] = [];
  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON) gcpMissing.push("GOOGLE_SERVICE_ACCOUNT_JSON");
  else if (!parseServiceAccount(env.GOOGLE_SERVICE_ACCOUNT_JSON)) gcpMissing.push("GOOGLE_SERVICE_ACCOUNT_JSON (not valid JSON)");
  else if (!gcpConfig(env)) gcpMissing.push("GCP_PROJECT_ID");

  const vercelMissing = (["VERCEL_API_TOKEN", "VERCEL_PROJECT_ID", "VERCEL_DEPLOY_HOOK_URL"] as const).filter((k) => !env[k]);
  if (vercelMissing.length === 0 && !vercelConfig(env)) vercelMissing.push("VERCEL_DEPLOY_HOOK_URL");

  const cap = (id: CapabilityId, label: string, description: string, missing: string[]): Capability => ({
    id, label, description, ready: missing.length === 0, missing,
  });

  return [
    cap("usage", "App usage tracking", "Counts the Google calls this app makes, per day.", redisMissing),
    cap("quota", "Google-reported quota", "Request counts and rate limits straight from Google Cloud.", gcpMissing),
    cap("rotate", "Key rotation", "Creates a new key, installs it in Vercel and redeploys.", [...gcpMissing, ...vercelMissing, ...redisMissing]),
  ];
}
