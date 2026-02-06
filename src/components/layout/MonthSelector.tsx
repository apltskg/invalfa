import { ChevronLeft, ChevronRight, Calendar, CalendarDays, CalendarRange, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useMonth, ViewMode } from "@/contexts/MonthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const VIEW_MODE_LABELS: Record<ViewMode, { label: string; shortLabel: string }> = {
  day: { label: 'Ημέρα', shortLabel: 'Η' },
  week: { label: 'Εβδομάδα', shortLabel: 'Ε' },
  month: { label: 'Μήνας', shortLabel: 'Μ' },
  year: { label: 'Έτος', shortLabel: 'Ε' },
};

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
    <div className="flex items-center gap-2">
      {/* View Mode Toggle */}
      <ToggleGroup
        type="single"
        value={viewMode}
        onValueChange={(value) => value && setViewMode(value as ViewMode)}
        className="bg-muted/50 rounded-xl p-0.5 border border-border/50"
      >
        <ToggleGroupItem
          value="day"
          aria-label="Ημέρα"
          className="h-7 w-7 rounded-lg text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm"
          title="Ημέρα"
        >
          Η
        </ToggleGroupItem>
        <ToggleGroupItem
          value="week"
          aria-label="Εβδομάδα"
          className="h-7 w-7 rounded-lg text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm"
          title="Εβδομάδα"
        >
          Ε
        </ToggleGroupItem>
        <ToggleGroupItem
          value="month"
          aria-label="Μήνας"
          className="h-7 w-7 rounded-lg text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm"
          title="Μήνας"
        >
          Μ
        </ToggleGroupItem>
        <ToggleGroupItem
          value="year"
          aria-label="Έτος"
          className="h-7 w-7 rounded-lg text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm"
          title="Έτος"
        >
          Χ
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Date Navigation */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-2xl p-1 border border-border/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPrevious}
          className="h-8 w-8 rounded-xl hover:bg-background"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "h-8 px-3 rounded-xl gap-2 font-medium capitalize min-w-[140px] hover:bg-background",
                isCurrentPeriod && "text-primary"
              )}
            >
              <Calendar className="h-4 w-4" />
              <span className="truncate max-w-[120px]">{displayLabel}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
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
                    "capitalize cursor-pointer",
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
                        "cursor-pointer",
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
                Χρησιμοποιήστε τα βέλη για πλοήγηση
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          onClick={goToNext}
          className="h-8 w-8 rounded-xl hover:bg-background"
          disabled={isCurrentPeriod}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
