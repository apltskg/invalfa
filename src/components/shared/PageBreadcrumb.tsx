import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

interface BreadcrumbOverride {
  label: string;
}

const routeLabels: Record<string, string> = {
  dashboard: "Αρχική",
  packages: "Φάκελοι",
  "bank-sync": "Τράπεζα",
  "export-hub": "Εξαγωγές",
  "general-expenses": "Γενικά Έξοδα",
  "general-income": "Γενικά Έσοδα",
  "invoice-list": "Λίστα Τιμολογίων",
  suppliers: "Προμηθευτές",
  customers: "Πελάτες",
  analytics: "Αναλύσεις",
  settings: "Ρυθμίσεις",
  proforma: "Proforma",
  proformas: "Proforma Λίστα",
  admin: "Διαχείριση",
  reports: "Αναφορές",
  "invoice-hub": "Invoice Hub",
  "business-intelligence": "Business Intelligence",
  "invoice-requests": "Αιτήματα Τιμολόγησης",
  travellers: "Ταξιδιώτες",
  "monthly-closing": "Μηνιαίο Κλείσιμο",
};

interface PageBreadcrumbProps {
  overrides?: Record<string, BreadcrumbOverride>;
}

export function PageBreadcrumb({ overrides }: PageBreadcrumbProps) {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/dashboard" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {segments.map((segment, idx) => {
          const path = "/" + segments.slice(0, idx + 1).join("/");
          const isLast = idx === segments.length - 1;
          const label =
            overrides?.[segment]?.label ||
            routeLabels[segment] ||
            segment;

          return (
            <span key={path} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="font-medium">{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={path} className="text-muted-foreground hover:text-foreground transition-colors">
                      {label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
