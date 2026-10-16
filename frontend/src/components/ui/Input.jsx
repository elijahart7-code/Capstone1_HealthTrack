import { useId } from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }) {
  return <input className={cn("ht-input", className)} {...props} />;
}

export function Textarea({ className, rows = 3, ...props }) {
  return <textarea rows={rows} className={cn("ht-input", className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cn("ht-input", className)} {...props}>
      {children}
    </select>
  );
}

export function Combobox({ className, options = [], ...props }) {
  const listId = useId();

  return (
    <>
      <input className={cn("ht-input", className)} list={listId} {...props} />
      <datalist id={listId}>
        {options.map((option) => <option key={option} value={option} />)}
      </datalist>
    </>
  );
}

/**
 * Shared labelled input wrapper used across forms. It keeps the label,
 * required marker, and error message pattern consistent in one place.
 */
export function Field({ label, required, error, children, className }) {
  return (
    <label className={cn("ht-field", className)}>
      <span>
        {label}
        {required && <span style={{ color: "var(--color-danger)" }}>*</span>}
      </span>
      {children}
      {error && <span className="ht-error">{error}</span>}
    </label>
  );
}
