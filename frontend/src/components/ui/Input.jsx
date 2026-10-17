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

function closestOption(value, options) {
  const query = value.trim().toLowerCase();
  if (!query) return value;

  const ranked = options
    .map((option, index) => {
      const normalized = option.toLowerCase();
      const startsWith = normalized.startsWith(query);
      const contains = normalized.includes(query);
      const distance = Math.abs(normalized.length - query.length);
      return {
        option,
        index,
        score: startsWith ? 0 : contains ? 1 : 2,
        distance,
      };
    })
    .filter(({ score }) => score < 2 || query.length >= 3)
    .sort((a, b) => a.score - b.score || a.distance - b.distance || a.index - b.index);

  return ranked[0]?.option || value;
}

export function Combobox({ className, options = [], ...props }) {
  const listId = useId();
  const optionValues = options.map((option) => (
    typeof option === "string" ? option : option.value
  )).filter(Boolean);

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      return;
    }

    if (event.key === "Tab") {
      const nextValue = closestOption(event.currentTarget.value, optionValues);
      if (nextValue !== event.currentTarget.value) {
        props.onChange?.({ target: { value: nextValue } });
      }
    }

    props.onKeyDown?.(event);
  }

  return (
    <>
      <input className={cn("ht-input", className)} list={listId} {...props} onKeyDown={handleKeyDown} />
      <datalist id={listId}>
        {optionValues.map((option) => <option key={option} value={option} />)}
      </datalist>
    </>
  );
}

export function MultiCombobox({ className, options = [], value = "", onChange, ...props }) {
  const [draft, setDraft] = useState("");
  const optionValues = options.map((option) => (
    typeof option === "string" ? option : option.value
  )).filter(Boolean);
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
          } else if (event.key === "Tab" && draft.trim()) {
            addValue(closestOption(draft, optionValues));
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
export function Field({ label, required, error, children, className, style }) {
  return (
    <label className={cn("ht-field", className)} style={style}>
      <span>
        {label}
        {required && <span style={{ color: "var(--color-danger)" }}>*</span>}
      </span>
      {children}
      {error && <span className="ht-error">{error}</span>}
    </label>
  );
}
