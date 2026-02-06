import { Package, Building2, FileSpreadsheet, Settings, FileText, List, BarChart3, LogOut, ArrowDownCircle, ArrowUpCircle, Truck, Users, LayoutDashboard, Shield, Receipt } from "lucide-react";
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
  { title: "Αναλύσεις", icon: BarChart3, url: "/analytics" },
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">TravelDocs</h1>
            <p className="text-xs text-muted-foreground">Διαχείριση Τιμολογίων</p>
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

