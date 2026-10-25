import type { UsageSummary } from "@/lib/admin/usage";
import { AdminCard, Stat } from "./AdminCard";
import { BarChart } from "./BarChart";

const n = (v: number) => v.toLocaleString();

export function UsageCard({ usage }: { usage: UsageSummary | null }) {
  if (!usage) {
    return (
      <AdminCard title="App usage" hint="Google calls made by this app">
        <p className="admin-card__error">Usage tracking needs Redis (Upstash). See the setup checklist below.</p>
      </AdminCard>
    );
  }
  const { today, last7, last30 } = usage;
  return (
    <AdminCard title="App usage" hint="Google calls made by this app (UTC days)">
      <dl className="admin-card__stats">
        <Stat label="Today" value={n(today.total)} />
        <Stat label="Last 7 days" value={n(last7.total)} />
        <Stat label="Last 30 days" value={n(last30.total)} />
      </dl>
      <BarChart bars={usage.days.map((d) => ({ label: d.date, value: d.total }))} unit="Google calls" />
      <table className="admin-card__table">
        <tbody>
          <tr><th scope="row">Searches</th><td>{n(last30.search)}</td></tr>
          <tr><th scope="row">Place details</th><td>{n(last30.details)}</td></tr>
          <tr><th scope="row">Photos</th><td>{n(last30.photo)}</td></tr>
          <tr><th scope="row">Errors</th><td>{n(last30.errors)}</td></tr>
        </tbody>
      </table>
      <p className="admin-card__note">
        Last 30 days. Place details are cached for an hour, and a restaurant page asks for the place twice (title and
        content), so that row over-counts billed requests. Searches and photos are exact.
      </p>
    </AdminCard>
  );
}
