import { googleKey } from "../places/google";
import { gcpConfig, getAccessToken, maskKey, quotaLimits, requestCounts, type QuotaLimit, type RequestDay } from "./gcp";
import { capabilities, type Capability } from "./status";
import { keyState, readLog, type LogEntry } from "./store";
import { readUsage, type UsageSummary } from "./usage";

export type QuotaView =
  | { state: "unavailable" }
  | { state: "error"; message: string; projectId: string }
  | { state: "ok"; projectId: string; days: RequestDay[]; limits: QuotaLimit[] };

export interface DashboardData {
  capabilities: Capability[];
  usage: UsageSummary | null;
  quota: QuotaView;
  key: { masked: string; previous: string | null };
  log: LogEntry[];
}

async function loadQuota(ready: boolean): Promise<QuotaView> {
  const cfg = gcpConfig();
  if (!ready || !cfg) return { state: "unavailable" };
  try {
    const token = await getAccessToken(cfg.serviceAccount);
    const [days, limits] = await Promise.all([requestCounts(fetch, token, cfg.projectId, 30), quotaLimits(fetch, token, cfg.projectId)]);
    return { state: "ok", projectId: cfg.projectId, days, limits };
  } catch (e) {
    return { state: "error", projectId: cfg.projectId, message: e instanceof Error ? e.message : "Couldn't read quota from Google" };
  }
}

export async function loadDashboard(): Promise<DashboardData> {
  const caps = capabilities();
  const quotaReady = caps.find((c) => c.id === "quota")?.ready ?? false;
  const [usage, quota, previous, log] = await Promise.all([
    readUsage(30).catch(() => null),
    loadQuota(quotaReady),
    keyState.get("previous").catch(() => null),
    readLog(10),
  ]);
  return { capabilities: caps, usage, quota, key: { masked: maskKey(googleKey()), previous }, log };
}
