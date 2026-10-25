import type { LogEntry } from "@/lib/admin/store";
import { AdminCard } from "./AdminCard";

const LABEL: Record<LogEntry["action"], { done: string; failed: string }> = {
  rotate: { done: "Rotated key", failed: "Key rotation failed" },
  revoke: { done: "Revoked previous key", failed: "Revoking previous key failed" },
  login: { done: "Signed in", failed: "Sign-in failed" },
  "login-failed": { done: "Failed sign-in", failed: "Failed sign-in" },
};

const when = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

export function ActivityCard({ log }: { log: LogEntry[] }) {
  return (
    <AdminCard title="Recent activity">
      {log.length === 0 ? (
        <p className="admin-card__note">Nothing yet.</p>
      ) : (
        <ul className="admin-card__list">
          {log.map((e, i) => (
            <li key={`${e.at}-${i}`}>
              <span aria-hidden>{e.ok ? "✓" : "✗"}</span> <strong>{e.ok ? LABEL[e.action].done : LABEL[e.action].failed}</strong>{" "}
              <span className="admin-card__code">{when(e.at)}</span>
              {e.detail && <div className="admin-card__note">{e.detail}</div>}
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}
