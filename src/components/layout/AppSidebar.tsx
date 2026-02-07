import { Package, Building2, FileSpreadsheet, Settings, FileText, List, BarChart3, LogOut, ArrowDownCircle, ArrowUpCircle, Truck, Users, LayoutDashboard, Shield, Receipt, Infinity as InfinityIcon, ClipboardList, ArrowLeftRight, Brain } from "lucide-react";
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

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
  { title: "Φάκελοι", icon: Package, url: "/packages" },
  { title: "Γενικά Έξοδα", icon: ArrowDownCircle, url: "/general-expenses" },
  { title: "Γενικά Έσοδα", icon: ArrowUpCircle, url: "/general-income" },
  { title: "Λίστα Παραστατικών", icon: Receipt, url: "/invoice-list" },
  { title: "Invoice Hub", icon: ArrowLeftRight, url: "/invoice-hub" },
  { title: "Αναλύσεις", icon: BarChart3, url: "/analytics" },
  { title: "Αναφορές", icon: ClipboardList, url: "/reports" },
  { title: "Insights", icon: Brain, url: "/business-intelligence" },
  { title: "Συγχρονισμός Τράπεζας", icon: Building2, url: "/bank-sync" },
  { title: "Κέντρο Εξαγωγών", icon: FileSpreadsheet, url: "/export-hub" },
  { title: "Νέο Proforma", icon: FileText, url: "/proforma" },
  { title: "Διαχείριση Proforma", icon: List, url: "/proformas" },
  { title: "Προμηθευτές", icon: Truck, url: "/suppliers" },
  { title: "Πελάτες", icon: Users, url: "/customers" },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isAdmin } = useAdmin();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Αποσυνδεθήκατε επιτυχώς");
    navigate("/login");
  };

  return (
    <Sidebar className="border-r border-border bg-sidebar-background">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-md">
            <InfinityIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight leading-none">
              Always <span className="text-blue-600">First</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">v15</span>
              <p className="text-xs text-muted-foreground truncate max-w-[100px]">Enterprise</p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-6 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Πλοήγηση
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-3">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="h-11 rounded-xl transition-all duration-200"
                    >
                      <Link to={item.url}>
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-1">
        <SidebarMenu>
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="h-11 rounded-xl transition-all duration-200"
              >
                <Link to="/admin">
                  <Shield className="h-5 w-5" />
                  <span className="font-medium">Admin Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="h-11 rounded-xl transition-all duration-200 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Αποσύνδεση</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {user && (
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">
            {user.email}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

