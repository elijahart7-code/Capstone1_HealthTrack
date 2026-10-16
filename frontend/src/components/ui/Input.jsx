import { useId, useState } from "react";
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

export function MultiCombobox({ className, options = [], value = "", onChange, ...props }) {
  const [draft, setDraft] = useState("");
  const values = value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

  function update(nextValues) {
    onChange?.({ target: { value: nextValues.join("\n") } });
  }

  function addValue(nextValue = draft) {
    const trimmed = nextValue.trim();
    if (!trimmed || values.includes(trimmed)) {
      setDraft("");
      return;
    }
    update([...values, trimmed]);
    setDraft("");
  }

  function removeValue(item) {
    update(values.filter((valueItem) => valueItem !== item));
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex flex-wrap gap-2">
        {values.map((item) => (
          <span key={item} className="ht-pill">
            {item}
            <button type="button" onClick={() => removeValue(item)} aria-label={`Remove ${item}`}>
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        className="ht-input"
        list={`multi-combobox-${props.id || "options"}`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            addValue();
          }
        }}
        onBlur={() => addValue()}
        placeholder="Search or type an allergen"
      />
      <datalist id={`multi-combobox-${props.id || "options"}`}>
        {options.map((option) => <option key={option} value={option} />)}
      </datalist>
      <input type="hidden" {...props} value={value} readOnly />
    </div>
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
