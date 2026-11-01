import { useSearchParams } from "react-router";
import { LayoutGrid, FileText } from "lucide-react";

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "health-information", label: "My Health Information", icon: FileText },
];

/**
 * Patient portal navigation for the main dashboard and health information
 * screens.
 */
export function SideBar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = searchParams.get("page") || "dashboard";

  return (
    <nav className="ht-nav" aria-label="Primary">
      {NAV.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onClick={() => setSearchParams({ page: item.key })}
            aria-current={page === item.key ? "page" : undefined}
          >
            <Icon size={15} strokeWidth={1.9} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}