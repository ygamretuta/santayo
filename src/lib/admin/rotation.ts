import { googleKey } from "../places/google";
import { redis } from "../redis";
import {
  createKey, deleteKey, findKeyByValue, gcpConfig, getAccessToken, getKeyString,
} from "./gcp";
import type { RotateDeps } from "./rotate";
import { keyState } from "./store";
import { triggerDeploy, upsertEnvVar, vercelConfig } from "./vercel";

/** One cheap Places request to prove a key works before we switch to it. */
export async function validateGoogleKey(key: string): Promise<boolean> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id" },
    body: JSON.stringify({
      textQuery: "restaurant",
      pageSize: 1,
      locationRestriction: { rectangle: { low: { latitude: 14.55, longitude: 121.0 }, high: { latitude: 14.56, longitude: 121.01 } } },
    }),
    cache: "no-store",
  });
  return res.ok;
}

/** Real dependencies for rotation, or the reason it can't run here. */
export function liveRotateDeps(): RotateDeps | { error: string } {
  const gcp = gcpConfig();
  const vercel = vercelConfig();
  if (!gcp || !vercel || !redis) return { error: "Rotation isn't fully configured. See the setup checklist." };

  const token = () => getAccessToken(gcp.serviceAccount);
  return {
    currentKey: googleKey(),
    createKey: async (name) => createKey(fetch, await token(), gcp.projectId, name),
    deleteKey: async (name) => deleteKey(fetch, await token(), name),
    getKeyString: async (name) => getKeyString(fetch, await token(), name),
    findKeyByValue: async (value) => findKeyByValue(fetch, await token(), gcp.projectId, value),
    validateKey: validateGoogleKey,
    setVercelKey: (value) => upsertEnvVar(fetch, vercel, "GOOGLE_MAPS_API_KEY", value),
    triggerDeploy: () => triggerDeploy(fetch, vercel.deployHook),
    state: keyState,
    now: () => new Date(),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  };
}
