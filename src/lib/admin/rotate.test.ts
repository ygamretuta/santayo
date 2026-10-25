import { describe, expect, it } from "vitest";
import { revokePreviousKey, rotateKey, type RotateDeps } from "./rotate";

/** In-memory fakes that record the order of side effects. */
function fakeDeps(overrides: Partial<RotateDeps> = {}, opts: { validAfter?: number } = {}) {
  const log: string[] = [];
  const slots: Record<string, string | null> = { current: null, previous: null };
  let validations = 0;
  const deps: RotateDeps = {
    currentKey: "AIzaOLD",
    findKeyByValue: async () => "keys/old",
    createKey: async (displayName) => {
      log.push(`create:${displayName}`);
      return { name: "keys/new", keyString: "AIzaNEW" };
    },
    deleteKey: async (name) => void log.push(`delete:${name}`),
    getKeyString: async (name) => (name === "keys/old" ? "AIzaOLD" : "AIzaNEW"),
    validateKey: async () => {
      validations++;
      log.push("validate");
      return validations > (opts.validAfter ?? 0);
    },
    setVercelKey: async (v) => void log.push(`vercel:${v}`),
    triggerDeploy: async () => void log.push("deploy"),
    state: {
      get: async (s) => slots[s],
      set: async (s, v) => {
        slots[s] = v;
        log.push(`state:${s}=${v}`);
      },
    },
    now: () => new Date("2026-10-25T14:30:00Z"),
    sleep: async () => {},
    ...overrides,
  };
  return { deps, log, slots };
}

describe("rotateKey", () => {
  it("creates, tests, installs, records, then redeploys, in that order", async () => {
    const { deps, log, slots } = fakeDeps();
    const r = await rotateKey(deps);
    expect(r.ok).toBe(true);
    expect(log).toEqual([
      "create:santayo-202610251430",
      "validate",
      "vercel:AIzaNEW",
      "state:previous=keys/old",
      "state:current=keys/new",
      "deploy",
    ]);
    expect(slots).toEqual({ previous: "keys/old", current: "keys/new" });
  });

  it("never deletes the old key", async () => {
    const { deps, log } = fakeDeps();
    await rotateKey(deps);
    expect(log.some((l) => l === "delete:keys/old")).toBe(false);
  });

  it("waits for a fresh key to become valid", async () => {
    const { deps, log } = fakeDeps({}, { validAfter: 2 });
    const r = await rotateKey(deps);
    expect(r.ok).toBe(true);
    expect(log.filter((l) => l === "validate")).toHaveLength(3);
  });

  it("if the new key never works: deletes it, never touches Vercel, changes nothing", async () => {
    const { deps, log, slots } = fakeDeps({ validateKey: async () => false });
    const r = await rotateKey(deps);
    expect(r.ok).toBe(false);
    expect(log).toContain("delete:keys/new");
    expect(log.some((l) => l.startsWith("vercel:") || l === "deploy")).toBe(false);
    expect(slots).toEqual({ current: null, previous: null });
    expect(r.steps.at(-1)).toMatchObject({ step: "Test the new key", ok: false });
  });

  it("if Vercel rejects the update: deletes the new key and does not redeploy", async () => {
    const { deps, log, slots } = fakeDeps({ setVercelKey: async () => { throw new Error("Vercel refused the env update: forbidden"); } });
    const r = await rotateKey(deps);
    expect(r.ok).toBe(false);
    expect(log).toContain("delete:keys/new");
    expect(log).not.toContain("deploy");
    expect(slots.previous).toBeNull();
    expect(r.steps.at(-1)?.detail).toContain("nothing was changed");
  });

  it("if only the redeploy trigger fails: keeps the new key, records state, says to redeploy manually", async () => {
    const { deps, log, slots } = fakeDeps({ triggerDeploy: async () => { throw new Error("Deploy hook returned HTTP 500"); } });
    const r = await rotateKey(deps);
    expect(r.ok).toBe(false);
    expect(log).not.toContain("delete:keys/new");
    expect(slots).toEqual({ previous: "keys/old", current: "keys/new" });
    expect(r.steps.at(-1)?.detail).toContain("redeploy manually");
  });

  it("stops early when the key can't be created or the running key is unknown", async () => {
    const a = fakeDeps({ createKey: async () => { throw new Error("quota exceeded"); } });
    expect((await rotateKey(a.deps)).ok).toBe(false);
    expect(a.log).toEqual([]);
    const b = fakeDeps({ currentKey: undefined });
    expect((await rotateKey(b.deps)).steps[0].detail).toContain("isn't set");
  });

  it("still rotates when the running key can't be matched, but flags it", async () => {
    const { deps, slots } = fakeDeps({ findKeyByValue: async () => null });
    const r = await rotateKey(deps);
    expect(r.ok).toBe(true);
    expect(r.steps[0].detail).toContain("can't be revoked");
    expect(slots.previous).toBeNull();
  });
});

describe("revokePreviousKey", () => {
  it("deletes the previous key once this server runs the new one", async () => {
    const { deps, log, slots } = fakeDeps({ currentKey: "AIzaNEW" });
    slots.previous = "keys/old";
    slots.current = "keys/new";
    const r = await revokePreviousKey(deps);
    expect(r.ok).toBe(true);
    expect(log).toContain("delete:keys/old");
    expect(slots.previous).toBeNull();
  });

  it("REFUSES while this server is still running the old key", async () => {
    const { deps, log, slots } = fakeDeps({ currentKey: "AIzaOLD" });
    slots.previous = "keys/old";
    slots.current = "keys/new";
    const r = await revokePreviousKey(deps);
    expect(r.ok).toBe(false);
    expect(log.some((l) => l.startsWith("delete:"))).toBe(false);
    expect(slots.previous).toBe("keys/old");
    expect(r.steps.at(-1)?.detail).toContain("still running the old key");
  });

  it("refuses when there is nothing to revoke, or previous equals current", async () => {
    const a = fakeDeps();
    expect((await revokePreviousKey(a.deps)).steps[0].detail).toContain("Rotate first");
    const b = fakeDeps({ currentKey: "AIzaNEW" });
    b.slots.previous = "keys/x";
    b.slots.current = "keys/x";
    const r = await revokePreviousKey(b.deps);
    expect(r.ok).toBe(false);
    expect(b.log.some((l) => l.startsWith("delete:"))).toBe(false);
  });

  it("clears the record if the key is already gone", async () => {
    const { deps, slots } = fakeDeps({ currentKey: "AIzaNEW", getKeyString: async () => { throw Object.assign(new Error("not found"), { status: 404 }); } });
    slots.previous = "keys/old";
    slots.current = "keys/new";
    const r = await revokePreviousKey(deps);
    expect(r.ok).toBe(true);
    expect(slots.previous).toBeNull();
  });
});
