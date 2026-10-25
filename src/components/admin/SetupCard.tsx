import type { Capability } from "@/lib/admin/status";
import { AdminCard } from "./AdminCard";

export function SetupCard({ capabilities }: { capabilities: Capability[] }) {
  return (
    <AdminCard title="Setup checklist" hint="What this dashboard can do with the current configuration" wide>
      <ul className="admin-card__list">
        {capabilities.map((c) => (
          <li key={c.id}>
            <span aria-hidden>{c.ready ? "✓" : "✗"}</span> <strong>{c.label}</strong>
            <span className="admin-card__note"> {c.description}</span>
            {!c.ready && (
              <div className="admin-card__note">
                Needs: <code className="admin-card__code">{c.missing.join(", ")}</code>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="admin-card__note">
        Step-by-step instructions:{" "}
        <a className="admin-card__link" href="https://github.com/ygamretuta/santayo#admin-dashboard" target="_blank" rel="noopener noreferrer">
          README → Admin dashboard
        </a>
        .
      </p>
    </AdminCard>
  );
}
