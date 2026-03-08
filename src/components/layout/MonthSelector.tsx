import { ChevronLeft, ChevronRight, Calendar, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useMonth, ViewMode } from "@/contexts/MonthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const VIEW_MODES: { value: ViewMode; label: string; short: string }[] = [
  { value: 'day', label: 'Ημέρα', short: 'Η' },
  { value: 'week', label: 'Εβδομάδα', short: 'Ε' },
  { value: 'month', label: 'Μήνας', short: 'Μ' },
  { value: 'year', label: 'Έτος', short: 'Ε' },
];

export function MonthSelector() {
  const {
    selectedDate,
    setSelectedDate,
    viewMode,
    setViewMode,
    displayLabel,
    goToPrevious,
    goToNext,
    availableMonths,
    monthKey,
  } = useMonth();

  const isCurrentPeriod = (() => {
    const now = new Date();
    switch (viewMode) {
      case 'day':
        return format(now, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
      case 'week':
        return format(now, "yyyy-'W'ww") === format(selectedDate, "yyyy-'W'ww");
      case 'year':
        return now.getFullYear() === selectedDate.getFullYear();
      default:
        return format(now, "yyyy-MM") === monthKey;
    }
  })();

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* View Mode Tabs */}
      <div className="hidden sm:flex items-center h-8 rounded-lg border border-border bg-muted/50 p-0.5">
        {VIEW_MODES.map(mode => (
          <button
            key={mode.value}
            onClick={() => setViewMode(mode.value)}
            className={cn(
              "h-7 px-2.5 rounded-md text-xs font-medium transition-all",
              viewMode === mode.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Mobile: compact tabs */}
      <div className="flex sm:hidden items-center h-9 rounded-lg border border-border bg-muted/50 p-0.5">
        {VIEW_MODES.map(mode => (
          <button
            key={mode.value}
            onClick={() => setViewMode(mode.value)}
            className={cn(
              "h-8 w-8 rounded-md text-xs font-medium transition-all flex items-center justify-center",
              viewMode === mode.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {mode.short}
          </button>
        ))}
      </div>

      {/* Date Navigation */}
      <div className="flex items-center gap-0.5 rounded-xl border border-border bg-card p-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPrevious}
          className="h-9 w-9 sm:h-7 sm:w-7 rounded-lg hover:bg-accent active:bg-accent/80"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "h-9 sm:h-7 px-2 sm:px-3 rounded-lg gap-1 sm:gap-1.5 font-medium capitalize text-xs sm:text-sm hover:bg-accent active:bg-accent/80",
                isCurrentPeriod && "text-primary"
              )}
            >
              <Calendar className="h-3.5 w-3.5 hidden sm:block" />
              <span className="truncate max-w-[90px] sm:max-w-[130px]">{displayLabel}</span>
              <ChevronDown className="h-3 w-3 opacity-40" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48 max-h-80 overflow-y-auto">
            {viewMode === 'month' && availableMonths.map((month) => {
              const key = format(month, "yyyy-MM");
              const isSelected = key === monthKey;
              return (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setSelectedDate(month)}
                  className={cn(
                    "capitalize cursor-pointer min-h-[44px] sm:min-h-0",
                    isSelected && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  {format(month, "MMMM yyyy", { locale: el })}
                </DropdownMenuItem>
              );
            })}
            {viewMode === 'year' && (
              <>
                {[0, 1, 2, 3, 4].map((offset) => {
                  const year = new Date().getFullYear() - offset;
                  const isSelected = selectedDate.getFullYear() === year;
                  return (
                    <DropdownMenuItem
                      key={year}
                      onClick={() => setSelectedDate(new Date(year, 0, 1))}
                      className={cn(
                        "cursor-pointer min-h-[44px] sm:min-h-0",
                        isSelected && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      {year}
                    </DropdownMenuItem>
                  );
                })}
              </>
            )}
            {(viewMode === 'day' || viewMode === 'week') && (
              <div className="p-2 text-center text-sm text-muted-foreground">
                Χρησιμοποιήστε τα βέλη ← →
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          onClick={goToNext}
          className="h-9 w-9 sm:h-7 sm:w-7 rounded-lg hover:bg-accent active:bg-accent/80"
          disabled={isCurrentPeriod}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
