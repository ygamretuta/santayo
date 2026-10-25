import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ActivityCard } from "@/components/admin/ActivityCard";
import { AdminBar } from "@/components/admin/AdminBar";
import { KeyCard } from "@/components/admin/KeyCard";
import { QuotaCard } from "@/components/admin/QuotaCard";
import { SetupCard } from "@/components/admin/SetupCard";
import { UsageCard } from "@/components/admin/UsageCard";
import { Status } from "@/components/ui/Status";
import { adminConfigured, isAdmin } from "@/lib/admin/auth";
import { loadDashboard } from "@/lib/admin/dashboard";
import "./admin.css";

export default function AdminPage() {
  return (
    <Suspense fallback={<Status>Loading dashboard…</Status>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  if (!adminConfigured()) {
    return (
      <>
        <AdminBar signedIn={false} />
        <main className="page">
          <p className="admin__message">
            The admin isn&rsquo;t configured. Set <code>ADMIN_PASSWORD</code> and <code>ADMIN_SESSION_SECRET</code> (32+
            characters) in the environment.
          </p>
        </main>
      </>
    );
  }
  if (!(await isAdmin())) redirect("/admin/login");

  const data = await loadDashboard();
  const cap = (id: string) => data.capabilities.find((c) => c.id === id)!;

  return (
    <>
      <AdminBar signedIn />
      <main className="page">
        <h1 className="admin__title">Dashboard</h1>
        <div className="admin__grid">
          <KeyCard masked={data.key.masked} previous={data.key.previous} rotate={cap("rotate")} />
          <UsageCard usage={data.usage} />
          <QuotaCard quota={data.quota} capability={cap("quota")} />
          <ActivityCard log={data.log} />
          <SetupCard capabilities={data.capabilities} />
        </div>
      </main>
    </>
  );
}
