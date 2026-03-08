import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ContextualFAB } from "./ContextualFAB";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { MonthSelector } from "./MonthSelector";
import { MonthProvider } from "@/contexts/MonthContext";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { KeyboardShortcuts } from "@/components/shared/KeyboardShortcuts";
import { PageBreadcrumb } from "@/components/shared/PageBreadcrumb";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <MonthProvider>
      <SidebarProvider>
        <KeyboardShortcuts />
        <div className="flex min-h-svh w-full bg-background">
          <AppSidebar />
          <main className="flex-1 overflow-auto momentum-scroll">
            {/* Top bar — mobile-optimized */}
            <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-3 sm:px-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <SidebarTrigger className="h-10 w-10 sm:h-8 sm:w-8 rounded-lg text-muted-foreground hover:bg-accent active:bg-accent/80 transition-colors" />
                <MonthSelector />
              </div>
              <div className="flex items-center gap-2">
                <GlobalSearch />
                <NotificationBell />
              </div>
            </div>
            {/* Page content - bottom padding for FAB */}
            <div className="p-3 sm:p-4 md:p-6 pb-24 sm:pb-6">
              <PageBreadcrumb />
              {children}
            </div>
          </main>
          <ContextualFAB />
        </div>
      </SidebarProvider>
    </MonthProvider>
  );
}
