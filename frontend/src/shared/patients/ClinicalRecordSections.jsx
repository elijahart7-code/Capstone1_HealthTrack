export function ClinicalRecordSections({
  sections,
  renderSection,
  expanded = false,
  resetKey = "",
  className = "",
}) {
  return (
    <div className={`ht-clinical-sections ${className}`.trim()}>
      {sections.map(({ key, label }) => (
        <details
          className="ht-encounter-section"
          open={expanded || undefined}
          key={`${resetKey}-${key}`}
        >
          <summary><span>{label}</span></summary>
          {renderSection(key)}
        </details>
      ))}
    </div>
  );
}
