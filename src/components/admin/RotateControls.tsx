"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Step } from "@/lib/admin/rotate";
import "./rotate-controls.css";

type Action = "rotate" | "revoke";

const COPY: Record<Action, { button: string; confirm: string }> = {
  rotate: {
    button: "Rotate key",
    confirm: "Create a new key, test it, install it in Vercel and redeploy? The current key keeps working until you revoke it.",
  },
  revoke: {
    button: "Revoke previous key",
    confirm: "Delete the previous key? Google keeps deleted keys for 30 days, so this can be undone from the Cloud console.",
  },
};

interface Props {
  canRotate: boolean;
  /** Env vars still needed before rotation can run. */
  missing: string[];
  hasPrevious: boolean;
}

export function RotateControls({ canRotate, missing, hasPrevious }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<Action | null>(null);
  const [busy, setBusy] = useState<Action | null>(null);
  const [result, setResult] = useState<{ ok: boolean; steps: Step[]; error?: string } | null>(null);

  async function run(action: Action) {
    setConfirming(null);
    setBusy(action);
    setResult(null);
    try {
      const res = await fetch("/api/admin/rotate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json().catch(() => ({}));
      setResult({ ok: res.ok, steps: body.steps ?? [], error: body.error });
      router.refresh();
    } catch {
      setResult({ ok: false, steps: [], error: "Couldn't reach the server." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rotate-controls">
      {!canRotate && (
        <p className="rotate-controls__missing">
          Rotation isn&rsquo;t set up yet. Still needed: <code className="rotate-controls__code">{missing.join(", ")}</code>
        </p>
      )}

      <div className="rotate-controls__buttons">
        <button className="button" disabled={!canRotate || busy !== null} onClick={() => setConfirming("rotate")}>
          {COPY.rotate.button}
        </button>
        <button
          className="button button--secondary"
          disabled={!canRotate || !hasPrevious || busy !== null}
          onClick={() => setConfirming("revoke")}
        >
          {COPY.revoke.button}
        </button>
      </div>

      {confirming && (
        <div role="alertdialog" aria-label="Confirm" className="rotate-controls__confirm">
          <p>{COPY[confirming].confirm}</p>
          <div className="rotate-controls__buttons">
            <button className="button" onClick={() => run(confirming)}>
              Yes, {COPY[confirming].button.toLowerCase()}
            </button>
            <button className="button button--secondary" onClick={() => setConfirming(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {busy && (
        <p role="status" className="rotate-controls__busy">
          Working… this can take up to a minute. Don&rsquo;t close the page.
        </p>
      )}

      {result && (
        <div role="status" className={`rotate-controls__result ${result.ok ? "rotate-controls__result--ok" : "rotate-controls__result--bad"}`}>
          <p className="rotate-controls__headline">{result.ok ? "Done" : "That didn’t complete"}</p>
          {result.error && <p>{result.error}</p>}
          <ul className="rotate-controls__steps">
            {result.steps.map((s, i) => (
              <li key={i}>
                <span aria-hidden>{s.ok ? "✓" : "✗"}</span> {s.step}
                {s.detail && <span className="rotate-controls__detail"> {s.detail}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
