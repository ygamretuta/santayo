/*
 * Key rotation, ordered so a failure can never leave the site without a working key:
 *
 *   1. note which key is live            (so it can be revoked later)
 *   2. create a new key, restricted to the Places API
 *   3. TEST the new key against Google   (abort + delete it if it doesn't work yet)
 *   4. write it to Vercel                (abort + delete it if that fails)
 *   5. trigger a redeploy
 *   6. remember the old key
 *
 * The old key is NOT deleted here: it keeps serving traffic until the new
 * deployment is live. Revoking it is a separate, deliberate step with a safety check.
 */

export interface Step {
  step: string;
  ok: boolean;
  detail?: string;
}

export interface RotationResult {
  ok: boolean;
  steps: Step[];
}

export interface RotateDeps {
  /** The key this server is running with (GOOGLE_MAPS_API_KEY). */
  currentKey: string | undefined;
  createKey(displayName: string): Promise<{ name: string; keyString: string }>;
  deleteKey(name: string): Promise<void>;
  getKeyString(name: string): Promise<string>;
  findKeyByValue(value: string): Promise<string | null>;
  validateKey(key: string): Promise<boolean>;
  setVercelKey(value: string): Promise<void>;
  triggerDeploy(): Promise<void>;
  state: {
    get(slot: "current" | "previous"): Promise<string | null>;
    set(slot: "current" | "previous", name: string | null): Promise<void>;
  };
  now(): Date;
  sleep(ms: number): Promise<void>;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const VALIDATION_ATTEMPTS = 6;
const VALIDATION_WAIT_MS = 4000;

export async function rotateKey(d: RotateDeps): Promise<RotationResult> {
  const steps: Step[] = [];
  const fail = (step: string, detail: string): RotationResult => {
    steps.push({ step, ok: false, detail });
    return { ok: false, steps };
  };

  if (!d.currentKey) return fail("Check current key", "GOOGLE_MAPS_API_KEY isn't set on this server.");

  // 1. Which key is live?
  let oldName: string | null = null;
  try {
    oldName = await d.findKeyByValue(d.currentKey);
  } catch (e) {
    return fail("Locate the current key", message(e));
  }
  steps.push({
    step: "Locate the current key",
    ok: true,
    detail: oldName ? undefined : "The running key isn't one of this project's keys, so it can't be revoked from here.",
  });

  // 2. Create.
  const stamp = d.now().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  let created: { name: string; keyString: string };
  try {
    created = await d.createKey(`santayo-${stamp}`);
  } catch (e) {
    return fail("Create a new key", message(e));
  }
  steps.push({ step: "Create a new key (Places API only)", ok: true });
  const discard = () => d.deleteKey(created.name).catch(() => {});

  // 3. Test it. New keys can take a few seconds to start working.
  let works = false;
  for (let i = 0; i < VALIDATION_ATTEMPTS && !works; i++) {
    if (i > 0) await d.sleep(VALIDATION_WAIT_MS);
    works = await d.validateKey(created.keyString).catch(() => false);
  }
  if (!works) {
    await discard();
    return fail("Test the new key", "Google rejected the new key. It was deleted and nothing was changed.");
  }
  steps.push({ step: "Test the new key against Google", ok: true });

  // 4. Hand it to Vercel.
  try {
    await d.setVercelKey(created.keyString);
  } catch (e) {
    await discard();
    return fail("Update the Vercel env var", `${message(e)} The new key was deleted and nothing was changed.`);
  }
  steps.push({ step: "Update GOOGLE_MAPS_API_KEY in Vercel", ok: true });

  // 6 (before 5): record state first, so a failed deploy trigger never loses track of the old key.
  await d.state.set("previous", oldName).catch(() => {});
  await d.state.set("current", created.name).catch(() => {});

  // 5. Redeploy.
  try {
    await d.triggerDeploy();
  } catch (e) {
    steps.push({
      step: "Trigger a redeploy",
      ok: false,
      detail: `${message(e)} The new key is saved in Vercel; redeploy manually to start using it.`,
    });
    return { ok: false, steps };
  }
  steps.push({ step: "Trigger a redeploy", ok: true, detail: "The old key stays valid until you revoke it." });
  return { ok: true, steps };
}

export async function revokePreviousKey(d: RotateDeps): Promise<RotationResult> {
  const steps: Step[] = [];
  const fail = (step: string, detail: string): RotationResult => {
    steps.push({ step, ok: false, detail });
    return { ok: false, steps };
  };

  const previous = await d.state.get("previous");
  if (!previous) return fail("Find the previous key", "There's no previous key on record. Rotate first.");
  if (previous === (await d.state.get("current"))) {
    return fail("Safety check", "The previous key is also the current key. Refusing to delete it.");
  }

  let previousValue: string | null = null;
  try {
    previousValue = await d.getKeyString(previous);
  } catch (e) {
    // Already gone (deleted in the console, or soft-deleted): just clear the record.
    if ((e as { status?: number })?.status === 404) {
      await d.state.set("previous", null);
      steps.push({ step: "Find the previous key", ok: true, detail: "It was already deleted. Record cleared." });
      return { ok: true, steps };
    }
    return fail("Find the previous key", message(e));
  }

  if (previousValue === d.currentKey) {
    return fail(
      "Safety check",
      "This server is still running the old key, so the new deployment isn't live yet. Wait for it, reload, then try again.",
    );
  }
  steps.push({ step: "Safety check: this server is on the new key", ok: true });

  try {
    await d.deleteKey(previous);
  } catch (e) {
    return fail("Delete the previous key", message(e));
  }
  await d.state.set("previous", null);
  steps.push({ step: "Delete the previous key", ok: true, detail: "Google keeps deleted keys for 30 days, so this can be undone from the console." });
  return { ok: true, steps };
}
