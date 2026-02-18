import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ContextualFAB } from "./ContextualFAB";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { MonthSelector } from "./MonthSelector";
import { MonthProvider } from "@/contexts/MonthContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <MonthProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-slate-50">
          <AppSidebar />
          <main className="flex-1 overflow-auto">
            {/* Top bar — Viva.com style */}
            <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100" />
                <MonthSelector />
              </div>
              <NotificationBell />
            </div>
            {/* Page content */}
            <div className="p-4 md:p-6">
              {children}
            </div>
          </main>
          <ContextualFAB />
        </div>
      </SidebarProvider>
    </MonthProvider>
  );
}
