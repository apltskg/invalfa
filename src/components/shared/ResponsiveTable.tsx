import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  mobileHidden?: boolean;
  mobileLabel?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = "Δεν βρέθηκαν δεδομένα",
  className,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // Mobile: card layout
  if (isMobile) {
    return (
      <div className={cn("space-y-2", className)}>
        {data.map((row) => (
          <div
            key={keyExtractor(row)}
            onClick={() => onRowClick?.(row)}
            className={cn(
              "rounded-xl border border-border bg-card p-3.5 space-y-2",
              onRowClick && "cursor-pointer active:bg-accent/50 transition-colors"
            )}
          >
            {columns
              .filter((col) => !col.mobileHidden)
              .map((col) => (
                <div key={col.key} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">
                    {col.mobileLabel || col.header}
                  </span>
                  <span className="text-sm font-medium text-right truncate">
                    {col.render(row)}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    );
  }

  // Desktop: standard table with horizontal scroll
  return (
    <div className={cn("relative w-full overflow-auto rounded-xl border border-border", className)}>
      <table className="w-full caption-bottom text-sm">
        <thead className="bg-muted/50">
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "h-11 px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wider",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "border-b border-border last:border-0 transition-colors",
                onRowClick && "cursor-pointer hover:bg-accent/50"
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn("p-4 align-middle", col.className)}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type { Column };
