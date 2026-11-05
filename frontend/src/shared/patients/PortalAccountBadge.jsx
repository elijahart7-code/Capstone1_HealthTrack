export function PortalAccountBadge({ patient }) {
  const status = !patient.user_id ? "inactive" : patient.is_verified === true ? "active" : "pending";
  const label = { inactive: "Inactive", active: "Active", pending: "Pending email confirmation" }[status];

  return <span className={`ht-status-badge ht-status-badge-${status}`}>{label}</span>;
}
