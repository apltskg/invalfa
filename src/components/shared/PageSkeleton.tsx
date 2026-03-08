import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

interface PageSkeletonProps {
  variant?: "dashboard" | "list" | "cards" | "detail";
}

function StatCardSkeleton() {
  return (
    <Card className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="h-1 w-full bg-muted" />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>
    </Card>
  );
}

function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-20" />
    </div>
  );
}

function CardItemSkeleton() {
  return (
    <Card className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton className="h-5 w-16 rounded-lg" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
      <div className="pt-3 border-t border-border/50 space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="p-5">
        <div className="flex items-end gap-2 h-[240px]">
          {[40, 65, 45, 80, 55, 70, 90, 60].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end gap-1">
              <Skeleton className="rounded-t-md" style={{ height: `${h}%` }} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function PageSkeleton({ variant = "dashboard" }: PageSkeletonProps) {
  if (variant === "dashboard") {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
        </div>

        {/* P&L Banner */}
        <Skeleton className="h-24 w-full rounded-2xl" />

        {/* Quick insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-12" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Skeleton className="h-9 w-64 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>

        {/* Table */}
        <Card className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => <ListRowSkeleton key={i} />)}
          </div>
        </Card>
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <CardItemSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  // detail
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <StatCardSkeleton key={i} />)}
      </div>
      <Card className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => <ListRowSkeleton key={i} />)}
        </div>
      </Card>
    </div>
  );
}
