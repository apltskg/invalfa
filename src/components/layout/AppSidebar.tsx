import {
  Package, Building2, FileSpreadsheet, Settings, FileText, List,
  BarChart3, LogOut, ArrowDownCircle, ArrowUpCircle, Truck, Users,
  LayoutDashboard, Shield, Receipt, ClipboardList, ArrowLeftRight,
  Brain, ChevronRight, Infinity as InfinityIcon, CreditCard,
  Globe, Briefcase, Plane, ClipboardCheck, Moon, Sun,
  ChevronDown
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";

// ── Core workflow (always visible) ──────────────────────────────────────────
const coreItems = [
  { title: "Αρχική", icon: LayoutDashboard, url: "/dashboard" },
  { title: "Κλείσιμο Μήνα", icon: ClipboardCheck, url: "/monthly-closing" },
  { title: "Φάκελοι", icon: Package, url: "/packages" },
  { title: "Συγχρ. Τράπεζας", icon: Building2, url: "/bank-sync" },
];

// ── Accounting ──────────────────────────────────────────────────────────────
const accountingItems = [
  { title: "Λίστα Παραστατικών", icon: Receipt, url: "/invoice-list" },
  { title: "Γενικά Έξοδα", icon: ArrowDownCircle, url: "/general-expenses" },
  { title: "Γενικά Έσοδα", icon: ArrowUpCircle, url: "/general-income" },
  { title: "Κέντρο Εξαγωγών", icon: FileSpreadsheet, url: "/export-hub" },
];

// ── Contacts ────────────────────────────────────────────────────────────────
const contactsItems = [
  { title: "Πελάτες", icon: Users, url: "/customers" },
  { title: "Προμηθευτές", icon: Truck, url: "/suppliers" },
  { title: "Ταξιδιώτες", icon: Plane, url: "/travellers" },
];

// ── Analytics ───────────────────────────────────────────────────────────────
const analyticsItems = [
  { title: "Αναλύσεις", icon: BarChart3, url: "/analytics" },
  { title: "Αναφορές", icon: ClipboardList, url: "/reports" },
  { title: "Insights", icon: Brain, url: "/business-intelligence" },
];

// ── Platform Suite ──────────────────────────────────────────────────────────
const platformItems = [
  { title: "Invoice Hub", icon: ArrowLeftRight, url: "/invoice-hub" },
  { title: "Αιτήματα Τιμολογίων", icon: ClipboardList, url: "/invoice-requests" },
  { title: "Proforma", icon: FileText, url: "/proforma" },
  { title: "Διαχ. Proforma", icon: List, url: "/proformas" },
];

type NavItem = { title: string; icon: any; url: string };

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isAdmin } = useAdmin();
  const [companyName, setCompanyName] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

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

  const isActive = (url: string) => location.pathname === url;
  const groupHasActive = (items: NavItem[]) => items.some(i => isActive(i.url));

  const NavItem = ({ item }: { item: NavItem }) => {
    const active = isActive(item.url);
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={active}
          className={cn(
            "h-8 rounded-lg px-3 text-[13px] font-medium transition-all duration-150",
            "text-muted-foreground hover:text-foreground hover:bg-accent",
            active && "bg-accent text-foreground font-semibold"
          )}
        >
          <Link to={item.url} className="flex items-center gap-2.5">
            <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground/70")} />
            <span className="truncate">{item.title}</span>
            {active && <ChevronRight className="h-3 w-3 ml-auto text-primary/60" />}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const CollapsibleGroup = ({
    label,
    items,
    icon: GroupIcon,
    defaultOpen,
  }: {
    label: string;
    items: NavItem[];
    icon?: any;
    defaultOpen?: boolean;
  }) => {
    const hasActive = groupHasActive(items);
    return (
      <Collapsible defaultOpen={defaultOpen ?? hasActive} className="group/collapsible">
        <SidebarGroup className="p-0">
          <CollapsibleTrigger className="flex items-center w-full px-3 py-1.5 rounded-lg hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {GroupIcon && <GroupIcon className="h-3 w-3 text-muted-foreground/60 shrink-0" />}
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground truncate">
                {label}
              </span>
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground/40 transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 mt-0.5">
                {items.map(item => <NavItem key={item.url} item={item} />)}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  };

  return (
    <Sidebar className="border-r border-border bg-card w-56">
      {/* Brand Header */}
      <SidebarHeader className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
            <InfinityIcon className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-none">Always First</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Enterprise</p>
          </div>
        </div>

        {/* Company badge */}
        <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-muted/70 px-3 py-2">
          <Briefcase className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
          <div className="min-w-0">
            {companyName ? (
              <p className="text-[11px] font-semibold text-foreground truncate">{companyName}</p>
            ) : (
              <div className="h-2.5 w-28 rounded bg-muted-foreground/20 animate-pulse" />
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2 space-y-0.5 overflow-y-auto">
        {/* Core — always expanded */}
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {coreItems.map(item => <NavItem key={item.url} item={item} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mx-3 my-1 border-t border-border/60" />

        <CollapsibleGroup label="Λογιστική" items={accountingItems} defaultOpen />
        
        <div className="mx-3 my-1 border-t border-border/60" />

        <CollapsibleGroup label="Επαφές" items={contactsItems} />

        <div className="mx-3 my-1 border-t border-border/60" />

        <CollapsibleGroup label="Αναλύσεις" items={analyticsItems} />

        <div className="mx-3 my-1 border-t border-border/60" />

        <CollapsibleGroup label="Platform" items={platformItems} icon={Globe} />
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="px-2 py-2 border-t border-border space-y-0.5">
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center gap-2.5 w-full h-8 rounded-lg px-3 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>

        {isAdmin && (
          <SidebarMenuItem className="list-none">
            <SidebarMenuButton
              asChild
              className="h-8 rounded-lg px-3 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <Link to="/admin" className="flex items-center gap-2.5">
                <Shield className="h-4 w-4" />
                <span>Admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
        <SidebarMenuItem className="list-none">
          <SidebarMenuButton
            asChild
            className="h-8 rounded-lg px-3 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <Link to="/settings" className="flex items-center gap-2.5">
              <Settings className="h-4 w-4" />
              <span>Ρυθμίσεις</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* User row */}
        {user && (
          <div className="flex items-center gap-2 px-3 py-2 mt-1 rounded-lg bg-muted/60">
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-primary-foreground">
                {user.email?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate flex-1">{user.email}</p>
            <button
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive transition-colors"
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
