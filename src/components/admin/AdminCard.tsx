import "./admin-card.css";

/** Titled panel used for every section of the dashboard. */
export function AdminCard({
  title,
  hint,
  wide,
  children,
}: {
  title: string;
  hint?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`admin-card ${wide ? "admin-card--wide" : ""}`}>
      <header className="admin-card__header">
        <h2 className="admin-card__title">{title}</h2>
        {hint && <p className="admin-card__hint">{hint}</p>}
      </header>
      {children}
    </section>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: "bad" }) {
  return (
    <div className="admin-card__stat">
      <dt className="admin-card__stat-label">{label}</dt>
      <dd className={`admin-card__stat-value ${tone === "bad" ? "admin-card__stat-value--bad" : ""}`}>{value}</dd>
    </div>
  );
}
