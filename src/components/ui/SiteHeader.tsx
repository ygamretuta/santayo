import "./site-header.css";

/** Full-bleed brand band; `width` matches the page container beneath it. */
export function SiteHeader({
  width = "results",
  children,
}: {
  width?: "results" | "detail";
  children: React.ReactNode;
}) {
  return (
    <header className="site-header">
      <div className={`site-header__inner site-header__inner--${width}`}>{children}</div>
    </header>
  );
}
