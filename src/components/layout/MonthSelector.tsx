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

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'day', label: 'Ημέρα' },
  { value: 'week', label: 'Εβδομάδα' },
  { value: 'month', label: 'Μήνας' },
  { value: 'year', label: 'Έτος' },
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

  const currentModeLabel = VIEW_MODES.find(m => m.value === viewMode)?.label || 'Μήνας';

  return (
    <div className="flex items-center gap-2">
      {/* View Mode Selector — clear dropdown instead of tiny letter buttons */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 rounded-xl gap-1.5 text-xs font-medium border-slate-200 bg-white hover:bg-slate-50"
          >
            {currentModeLabel}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-36">
          {VIEW_MODES.map(mode => (
            <DropdownMenuItem
              key={mode.value}
              onClick={() => setViewMode(mode.value)}
              className={cn(
                "cursor-pointer text-sm",
                viewMode === mode.value && "bg-blue-50 text-blue-700 font-medium"
              )}
            >
              {mode.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Date Navigation */}
      <div className="flex items-center gap-0.5 bg-white rounded-xl border border-slate-200 p-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPrevious}
          className="h-7 w-7 rounded-lg hover:bg-slate-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "h-7 px-3 rounded-lg gap-1.5 font-medium capitalize text-sm hover:bg-slate-100",
                isCurrentPeriod && "text-blue-600"
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="truncate max-w-[130px]">{displayLabel}</span>
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
                    "capitalize cursor-pointer",
                    isSelected && "bg-blue-50 text-blue-600 font-medium"
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
                        isSelected && "bg-blue-50 text-blue-600 font-medium"
                      )}
                    >
                      {year}
                    </DropdownMenuItem>
                  );
                })}
              </>
            )}
            {(viewMode === 'day' || viewMode === 'week') && (
              <div className="p-2 text-center text-sm text-slate-400">
                Χρησιμοποιήστε τα βέλη ← →
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          onClick={goToNext}
          className="h-7 w-7 rounded-lg hover:bg-slate-100"
          disabled={isCurrentPeriod}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
