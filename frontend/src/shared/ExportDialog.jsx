import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../lib/axios";
import { rangeForPeriod } from "./statisticalReport.js";
import { StatisticalDocument, ALL_SECTIONS } from "./StatisticalReport";
import { LineListDocument } from "./LineListReport";

const SECTION_LABELS = [
  ["population", "A. Population served"],
  ["visits", "B. Visit volume"],
  ["morbidity", "C. Morbidity profile"],
  ["programs", "D. Program signals"],
  ["narrative", "E. Generalization of results"],
];

const PERIOD_LABELS = [
  ["today", "Today"],
  ["week", "This week"],
  ["month", "This month"],
  ["quarter", "This quarter"],
  ["year", "This year"],
  ["custom", "Custom range"],
];

// Export PDF options: checkboxes for statistical sections, combo lists for
// report type, period, condition, and row limit. The dialog prints exactly
// what was configured — nothing more.
export function ExportDialog({ onClose, conditions = [] }) {
  const [reportType, setReportType] = useState("statistical");
  const [period, setPeriod] = useState("month");
  const [from, setFrom] = useState(() => rangeForPeriod("month").from);
  const [to, setTo] = useState(() => rangeForPeriod("month").to);
  const [sections, setSections] = useState({ ...ALL_SECTIONS });
  const [condition, setCondition] = useState("");
  const [conditionOptions, setConditionOptions] = useState(conditions);
  const [limit, setLimit] = useState("50");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);

  function pickPeriod(key) {
    setPeriod(key);
    if (key !== "custom") {
      const range = rangeForPeriod(key);
      setFrom(range.from);
      setTo(range.to);
    }
  }

  // Condition dropdown uses the same canonical list as the assessment form
  // (health_conditions from /patients/options), so whatever the admin can
  // encode for a patient, they can export. Falls back to the dashboard list.
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const { data } = await api.get("/patients/options");
        const master = data.options?.health_conditions || [];
        if (!dead) setConditionOptions(master.length ? master : conditions);
      } catch {
        if (!dead) setConditionOptions(conditions);
      }
    })();
    return () => { dead = true; };
  }, [conditions]);

  async function handleExport() {
    if (working) return;
    if (reportType === "linelist" && !condition.trim()) {
      setError("Choose a condition for the line list.");
      return;
    }
    setWorking(true);
    setError(null);
    try {
      if (reportType === "statistical") {
        const { data } = await api.get(`/admin/reports/aggregate?from=${from}&to=${to}`);
        setPayload({ type: "statistical", report: data, generatedAt: new Date() });
      } else {
        const { data } = await api.get(
          `/admin/reports/conditions/${encodeURIComponent(condition.trim())}/patients?from=${from}&to=${to}`
        );
        const total = (data.patients || []).length;
        const rows = limit === "all" ? data.patients || [] : (data.patients || []).slice(0, Number(limit));
        setPayload({
          type: "linelist", condition: condition.trim(), from, to, rows, generatedAt: new Date(),
          limitNote: total > rows.length ? `Showing ${rows.length} of ${total} — ${total - rows.length} more not included` : null,
        });
      }
    } catch {
      setError("The export data could not be loaded. Try again.");
    } finally {
      setWorking(false);
    }
  }

  useEffect(() => {
    if (!payload) return undefined;
    document.body.classList.add("ht-exporting");
    const cleanup = () => document.body.classList.remove("ht-exporting");
    window.addEventListener("afterprint", cleanup);
    window.print();
    return () => {
      window.removeEventListener("afterprint", cleanup);
      cleanup();
    };
  }, [payload]);

  return (
    <>
      <div className="ht-modal-overlay" role="dialog" aria-label="Export PDF options">
        <div className="ht-modal-card ht-export-dialog">
          <h2>Export PDF</h2>
          <p className="ht-muted">The PDF prints exactly what is configured here.</p>
          {error && <div role="alert" className="ht-login-alert ht-login-alert-error">{error}</div>}
          <label className="ht-field">
            <span>Report type</span>
            <select className="ht-input" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="statistical">Statistical summary (counts only)</option>
              <option value="linelist">Condition line list (named patients)</option>
            </select>
          </label>
          <label className="ht-field">
            <span>Period</span>
            <select className="ht-input" value={period} onChange={(e) => pickPeriod(e.target.value)}>
              {PERIOD_LABELS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          {period === "custom" && (
            <>
              <label className="ht-field"><span>From</span><input className="ht-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
              <label className="ht-field"><span>To</span><input className="ht-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
            </>
          )}
          {reportType === "statistical" ? (
            <fieldset className="ht-export-sections">
              <legend>Sections to include</legend>
              {SECTION_LABELS.map(([key, label]) => (
                <label key={key}><input type="checkbox" checked={sections[key]} onChange={(e) => setSections({ ...sections, [key]: e.target.checked })} /> {label}</label>
              ))}
            </fieldset>
          ) : (
            <>
              <label className="ht-field">
                <span>Condition</span>
                {conditionOptions.length ? (
                  <select className="ht-input" value={condition} onChange={(e) => setCondition(e.target.value)}>
                    <option value="">— Select condition —</option>
                    {conditionOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <>
                    <input className="ht-input" value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="e.g. Leptospirosis" />
                    <span className="ht-muted">No recorded conditions in this range — widen the period.</span>
                  </>
                )}
              </label>
              <label className="ht-field">
                <span>Row limit</span>
                <select className="ht-input" value={limit} onChange={(e) => setLimit(e.target.value)}>
                  <option value="50">First 50 rows</option>
                  <option value="100">First 100 rows</option>
                  <option value="all">All rows</option>
                </select>
              </label>
            </>
          )}
          <div className="ht-modal-actions">
            <button type="button" className="ht-button" onClick={onClose}>Cancel</button>
            <button type="button" className="ht-button ht-auth-submit" onClick={handleExport} disabled={working}>
              {working ? "Preparing…" : "Export PDF"}
            </button>
          </div>
        </div>
      </div>
      {payload && createPortal(
        <div className="ht-export-document">
          {payload.type === "statistical"
            ? <StatisticalDocument report={payload.report} generatedAt={payload.generatedAt} sections={sections} />
            : <LineListDocument condition={payload.condition} from={payload.from} to={payload.to} rows={payload.rows} limitNote={payload.limitNote} generatedAt={payload.generatedAt} />}
        </div>,
        document.body
      )}
    </>
  );
}
