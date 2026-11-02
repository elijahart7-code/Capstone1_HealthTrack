import { cn } from "../../lib/utils";

export function Card({ children, className, title, icon: Icon, aside }) {
  return (
    <div className={cn("ht-panel", className)}>
      {title && (
        <h2>
          {Icon && (
            <span className="ht-section-icon" aria-hidden="true">
              <Icon size={16} strokeWidth={1.8} />
            </span>
          )}
          {title}
          {aside && <span className="ml-auto flex items-center gap-2 text-xs font-normal">{aside}</span>}
        </h2>
      )}
      {children}
    </div>
  );
}

export function CardBody({ children, className }) {
  return <div className={cn("ht-card p-4", className)}>{children}</div>;
}

export function StatCard({ label, value, tone, icon: Icon }) {
  const toneColor = tone === "brand" ? "var(--color-brand)" : tone === "warm" ? "var(--color-brand-warm)" : undefined;
  const iconBackground = tone === "brand" ? "rgba(15, 107, 95, 0.12)" : tone === "warm" ? "rgba(208, 116, 42, 0.12)" : "rgba(15, 107, 95, 0.08)";

  return (
    <div className="ht-metric">
      <span className="ht-metric-icon" style={{ background: iconBackground, color: toneColor || "var(--color-brand-strong)" }} aria-hidden="true">
        {Icon ? <Icon size={24} strokeWidth={1.8} /> : null}
      </span>
      <div>
        <h3 style={{ color: "#000000", fontWeight: 700 }}>{label}</h3>
        <p style={toneColor ? { color: toneColor } : undefined}>{value}</p>
      </div>
    </div>
  );
}
