import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ContextualFAB } from "./ContextualFAB";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { MonthSelector } from "./MonthSelector";
import { MonthProvider } from "@/contexts/MonthContext";
import { GlobalSearch } from "@/components/search/GlobalSearch";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <MonthProvider>
      <SidebarProvider>
        <div className="flex min-h-svh w-full bg-slate-50">
          <AppSidebar />
          <main className="flex-1 overflow-auto momentum-scroll">
            {/* Top bar — mobile-optimized */}
            <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-sm px-3 sm:px-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <SidebarTrigger className="h-10 w-10 sm:h-8 sm:w-8 rounded-lg text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors" />
                <MonthSelector />
              </div>
              <div className="flex items-center gap-2">
                <GlobalSearch />
                <NotificationBell />
              </div>
            </div>
            {/* Page content - bottom padding for FAB */}
            <div className="p-3 sm:p-4 md:p-6 pb-24 sm:pb-6">
              {children}
            </div>
          </main>
          <ContextualFAB />
        </div>
      </SidebarProvider>
    </MonthProvider>
  );
}
