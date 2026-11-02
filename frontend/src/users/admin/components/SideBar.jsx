import { useSearchParams } from "react-router";

const NAV = [
  { key: "dashboard", label: "Dashboard" },
  { key: "patients", label: "Patients" },
  { key: "appointments", label: "Appointments" },
];

export function SideBar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = searchParams.get("page") || "dashboard";

  return (
    <nav className="ht-nav" aria-label="Primary">
      {NAV.map((item) => (
        <button
          key={item.key}
          onClick={() => setSearchParams({ page: item.key })}
          aria-current={page === item.key ? "page" : undefined}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
