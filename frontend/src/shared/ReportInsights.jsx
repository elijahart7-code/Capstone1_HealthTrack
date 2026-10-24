const percentage = (part, total) => total > 0 ? `${Math.round((part / total) * 100)}%` : '—';
const count = value => Number(value || 0);

function Metric({ label, value, detail, attention }) {
  return <div className={`ht-report-metric${attention ? ' needs-attention' : ''}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}
function Facts({ title, rows }) {
  return <section className="ht-report-facts"><h3>{title}</h3><dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>;
}

export function ReportMetrics({ data }) {
  const s = data?.summary;
  if (!s) return null;
  const total = count(s.appointments);
  const completed = count(s.completed);
  return <div className="ht-report-metrics">
      <Metric label="Scheduled in period" value={total} detail="Includes completed and cancelled" />
      <Metric label="Completed visits" value={completed} detail={total > 0 ? `${percentage(completed, total)} of scheduled appointments` : "No appointments in this period"} />
      <Metric label="Overdue confirmed" value={count(s.overdue)} detail="Past scheduled time; status still confirmed" attention={count(s.overdue) > 0} />
      <Metric label="Patients served" value={count(s.patients_served)} detail="Distinct patients with completed visits" />
      <Metric label="New registrations" value={count(s.new_patients)} detail="Patients registered in this date range" />
      <Metric label="Cancellation rate" value={percentage(count(s.cancelled), total)} detail={`${count(s.cancelled)} cancelled appointments`} />
    </div>;
}

/** The dashboard and PDF intentionally share the same definitions and data. */
export function ReportInsights({ data, heading = 'Period summary', includeMetrics = true }) {
  const s = data?.summary;
  if (!s) return <p className="ht-muted">Summary information is unavailable for this period.</p>;
  const total = count(s.appointments);
  const completed = count(s.completed);
  const reasons = [...(data.reasons || [])].sort((a, b) => count(b.count) - count(a.count));
  const conditions = [...(data.conditions || [])].sort((a, b) => count(b.count) - count(a.count));
  const peak = [...(data.trend || [])].sort((a, b) => count(b.total) - count(a.total))[0];
  const peakDate = peak && count(peak.total) > 0
    ? new Date(peak.period).toLocaleString(undefined, data.filters?.period === 'hour' ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' } : data.filters?.period === 'month' ? { month: 'long', year: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  return <div className="ht-report-insights">
    <div className="ht-report-insights-heading"><h3>{heading}</h3><span>{data.filters?.from} to {data.filters?.to}</span></div>
    {includeMetrics && <ReportMetrics data={data} />}
    <div className="ht-report-facts-grid">
      <Facts title="Workload and records" rows={[
        ['Still confirmed', count(s.confirmed)],
        ['Upcoming in this period', count(s.upcoming)],
        ['Completed with linked records', `${count(s.documented_completed)} / ${completed} (${percentage(count(s.documented_completed), completed)})`],
        ['Assessments recorded', count(s.assessments)],
      ]} />
      <Facts title="Patient reach and follow-up" rows={[
        ['Patients scheduled (excluding cancellations)', count(s.patients_scheduled)],
        ['Patients with repeat completed visits', count(s.repeat_patients)],
        ['Patients assessed', count(s.patients_assessed)],
        ['Current follow-up patients', count(s.current_follow_up_patients)],
        ['Current follow-up recorded in this period', count(s.period_follow_up_patients)],
      ]} />
    </div>
    <div className="ht-report-highlights">
      <div><span>Leading appointment reason</span><strong>{reasons[0]?.label || 'No appointments recorded'}</strong><small>{reasons[0] ? `${count(reasons[0].count)} appointments · ${percentage(count(reasons[0].count), total)} of period volume` : 'No reason data for this range'}</small></div>
      <div><span>Most recorded condition</span><strong>{conditions[0]?.label || 'No assessments recorded'}</strong><small>{conditions[0] ? `${count(conditions[0].count)} assessment records` : 'Based on recorded assessments only'}</small></div>
      <div><span>Busiest interval</span><strong>{peakDate || 'No appointment activity'}</strong><small>{peakDate ? `${count(peak.total)} scheduled appointments` : 'No appointments in this date range'}</small></div>
    </div>
  </div>;
}
