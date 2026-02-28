import {
  Package, Building2, FileSpreadsheet, Settings, FileText, List,
  BarChart3, LogOut, ArrowDownCircle, ArrowUpCircle, Truck, Users,
  LayoutDashboard, Shield, Receipt, ClipboardList, ArrowLeftRight,
  Brain, ChevronRight, Infinity as InfinityIcon, CreditCard,
  Globe, Briefcase, Plane
} from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── My Company section ──────────────────────────────────────────────────────
const companyItems = [
  { title: "Αρχική", icon: LayoutDashboard, url: "/dashboard" },
  { title: "Φάκελοι", icon: Package, url: "/packages" },
  { title: "Λίστα Παραστατικών", icon: Receipt, url: "/invoice-list" },
  { title: "Συγχρ. Τράπεζας", icon: Building2, url: "/bank-sync" },
  { title: "Γενικά Έξοδα", icon: ArrowDownCircle, url: "/general-expenses" },
  { title: "Γενικά Έσοδα", icon: ArrowUpCircle, url: "/general-income" },
  { title: "Προμηθευτές", icon: Truck, url: "/suppliers" },
  { title: "Πελάτες", icon: Users, url: "/customers" },
  { title: "Ταξιδιώτες", icon: Plane, url: "/travellers" },
];

// ── Analytics & Reports ─────────────────────────────────────────────────────
const analyticsItems = [
  { title: "Αναλύσεις", icon: BarChart3, url: "/analytics" },
  { title: "Αναφορές", icon: ClipboardList, url: "/reports" },
  { title: "Insights", icon: Brain, url: "/business-intelligence" },
  { title: "Κέντρο Εξαγωγών", icon: FileSpreadsheet, url: "/export-hub" },
];

// ── Platform Suite (multi-tenant) ───────────────────────────────────────────
const platformItems = [
  { title: "Invoice Hub", icon: ArrowLeftRight, url: "/invoice-hub" },
  { title: "Αιτήματα Τιμολογίων", icon: ClipboardList, url: "/invoice-requests" },
  { title: "Proforma", icon: FileText, url: "/proforma" },
  { title: "Διαχ. Proforma", icon: List, url: "/proformas" },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isAdmin } = useAdmin();
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("agency_settings")
      .select("company_name")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.company_name) setCompanyName(data.company_name);
      });
  }, []);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Αποσυνδεθήκατε επιτυχώς");
    navigate("/login");
  };

  const NavItem = ({ item }: { item: { title: string; icon: any; url: string } }) => {
    const isActive = location.pathname === item.url;
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          className={cn(
            "h-9 rounded-lg px-3 text-sm font-medium transition-all duration-150",
            "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
            isActive && "bg-slate-100 text-slate-900 font-semibold"
          )}
        >
          <Link to={item.url} className="flex items-center gap-2.5">
            <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-blue-600" : "text-slate-400")} />
            <span>{item.title}</span>
            {isActive && <ChevronRight className="h-3 w-3 ml-auto text-blue-600" />}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar className="border-r border-slate-200 bg-white w-56">
      {/* Brand Header */}
      <SidebarHeader className="px-4 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 shadow-sm">
            <InfinityIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-none">Always First</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Enterprise v15</p>
          </div>
        </div>

        {/* Company badge */}
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
          <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <div className="min-w-0">
            {companyName ? (
              <p className="text-[11px] font-semibold text-slate-700 truncate">{companyName}</p>
            ) : (
              <div className="h-2.5 w-28 rounded bg-slate-200 animate-pulse" />
            )}
            <p className="text-[10px] text-slate-400">Διαχειριστής</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 space-y-1">
        {/* My Company */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Η Εταιρεία μου
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {companyItems.map(item => <NavItem key={item.url} item={item} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mx-3 border-t border-slate-100" />

        {/* Analytics */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Αναλύσεις
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {analyticsItems.map(item => <NavItem key={item.url} item={item} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mx-3 border-t border-slate-100" />

        {/* Platform Suite */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Globe className="h-3 w-3" />
            Platform Suite
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {platformItems.map(item => <NavItem key={item.url} item={item} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="px-2 py-3 border-t border-slate-100 space-y-0.5">
        {isAdmin && (
          <SidebarMenuItem className="list-none">
            <SidebarMenuButton
              asChild
              className="h-9 rounded-lg px-3 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <Link to="/admin" className="flex items-center gap-2.5">
                <Shield className="h-4 w-4 text-slate-400" />
                <span>Admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
        <SidebarMenuItem className="list-none">
          <SidebarMenuButton
            asChild
            className="h-9 rounded-lg px-3 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <Link to="/settings" className="flex items-center gap-2.5">
              <Settings className="h-4 w-4 text-slate-400" />
              <span>Ρυθμίσεις</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* User row */}
        {user && (
          <div className="flex items-center gap-2 px-3 py-2 mt-1 rounded-lg bg-slate-50">
            <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-white">
                {user.email?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate flex-1">{user.email}</p>
            <button
              onClick={handleSignOut}
              className="text-slate-400 hover:text-red-500 transition-colors"
              title="Αποσύνδεση"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
