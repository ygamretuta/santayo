import type { Capability } from "@/lib/admin/status";
import { AdminCard, Stat } from "./AdminCard";
import { RotateControls } from "./RotateControls";

export function KeyCard({ masked, previous, rotate }: { masked: string; previous: string | null; rotate: Capability }) {
  return (
    <AdminCard title="Google Maps API key" hint="Used for every search, photo and place lookup">
      <dl className="admin-card__stats admin-card__stats--two">
        <Stat label="Active key" value={masked} />
        <Stat label="Previous key" value={previous ? "Still active" : "None pending"} />
      </dl>
      <RotateControls canRotate={rotate.ready} missing={rotate.missing} hasPrevious={Boolean(previous)} />
      <p className="admin-card__note">
        Rotating creates a new key restricted to the Places API, tests it, installs it in Vercel and redeploys. The old key
        keeps serving traffic until the new deployment is live. Then revoke it here.
      </p>
    </AdminCard>
  );
}
