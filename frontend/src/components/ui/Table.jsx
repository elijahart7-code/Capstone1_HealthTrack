import { cn } from "../../lib/utils";

export function Badge({ children, tone }) {
  const style =
    tone === "warm"
      ? { color: "var(--color-brand-warm)" }
      : tone === "danger" || tone === "cancelled"
        ? { color: "var(--color-danger)" }
        : undefined;
  return (
    <span className="ht-pill capitalize" style={style}>
      {children}
    </span>
  );
}

export function Table({ children }) {
  return (
    <div className="ht-table-scroll">
      <table className="ht-table">{children}</table>
    </div>
  );
}

export function Th({ children, srOnly }) {
  return <th>{srOnly ? <span className="sr-only">{children}</span> : children}</th>;
}

export function Td({ children, className, ...props }) {
  return (
    <td className={cn(className)} {...props}>
      {children}
    </td>
  );
}

export function EmptyState({ children }) {
  return <div className="ht-empty">{children}</div>;
}
