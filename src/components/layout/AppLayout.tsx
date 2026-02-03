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
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 overflow-auto">
            <div className="sticky top-0 z-10 flex h-16 items-center gap-4 justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="h-9 w-9 rounded-xl" />
                <MonthSelector />
              </div>
              <NotificationBell />
            </div>
            <div className="p-6">
              {children}
            </div>
          </main>
          <ContextualFAB />
        </div>
      </SidebarProvider>
    </MonthProvider>
  );
}
