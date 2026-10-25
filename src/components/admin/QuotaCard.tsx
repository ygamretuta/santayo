import type { Capability } from "@/lib/admin/status";
import type { QuotaView } from "@/lib/admin/dashboard";
import { AdminCard, Stat } from "./AdminCard";
import { BarChart } from "./BarChart";

const n = (v: number) => v.toLocaleString();

export function QuotaCard({ quota, capability }: { quota: QuotaView; capability: Capability }) {
  if (quota.state === "unavailable") {
    return (
      <AdminCard title="Google quota" hint="Request counts and limits reported by Google Cloud">
        <p className="admin-card__error">
          Needs a read-only service account. Still to set: <code className="admin-card__code">{capability.missing.join(", ")}</code>
        </p>
      </AdminCard>
    );
  }
  if (quota.state === "error") {
    return (
      <AdminCard title="Google quota" hint={`Project ${quota.projectId}`}>
        <p className="admin-card__error">
          Google said: {quota.message}. Check that the service account has the Monitoring Viewer and Service Usage Viewer
          roles, and that those APIs are enabled.
        </p>
      </AdminCard>
    );
  }

  const days = quota.days;
  const total = (f: (d: (typeof days)[number]) => number) => days.reduce((s, d) => s + f(d), 0);
  const limits = quota.limits.slice(0, 8);
  return (
    <AdminCard title="Google quota" hint={`Places API, project ${quota.projectId}, last 30 days`}>
      <dl className="admin-card__stats">
        <Stat label="Requests" value={n(total((d) => d.total))} />
        <Stat label="Client errors (4xx)" value={n(total((d) => d.clientError))} tone={total((d) => d.clientError) ? "bad" : undefined} />
        <Stat label="Server errors (5xx)" value={n(total((d) => d.serverError))} tone={total((d) => d.serverError) ? "bad" : undefined} />
      </dl>
      <BarChart bars={days.map((d) => ({ label: d.date, value: d.total }))} unit="requests (Google)" />
      {limits.length > 0 && (
        <table className="admin-card__table">
          <thead>
            <tr><th scope="col">Rate limit</th><th scope="col">Allowed</th></tr>
          </thead>
          <tbody>
            {limits.map((l) => (
              <tr key={`${l.name}-${l.unit}`}>
                <th scope="row">{l.name}</th>
                <td>{l.limit === null ? "Unlimited" : `${n(l.limit)} ${l.unit.replace("{project}", "per project")}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="admin-card__note">
        Google reports request counts and rate limits. It does not expose your remaining free credit or spend:{" "}
        <a
          className="admin-card__link"
          href={`https://console.cloud.google.com/billing/reports?project=${encodeURIComponent(quota.projectId)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          check Billing reports
        </a>
        . Counts here are rolling 24-hour windows and can lag by a few minutes.
      </p>
    </AdminCard>
  );
}
