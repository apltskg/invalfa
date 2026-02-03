import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useMonth } from "@/contexts/MonthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function MonthSelector() {
  const {
    selectedMonth,
    setSelectedMonth,
    displayLabel,
    goToPreviousMonth,
    goToNextMonth,
    availableMonths,
    monthKey,
  } = useMonth();

  const isCurrentMonth = format(new Date(), "yyyy-MM") === monthKey;

  return (
    <div className="flex items-center gap-1 bg-muted/50 rounded-2xl p-1 border border-border/50">
      <Button
        variant="ghost"
        size="icon"
        onClick={goToPreviousMonth}
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
              isCurrentMonth && "text-primary"
            )}
          >
            <Calendar className="h-4 w-4" />
            {displayLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48 max-h-80 overflow-y-auto">
          {availableMonths.map((month) => {
            const key = format(month, "yyyy-MM");
            const isSelected = key === monthKey;
            return (
              <DropdownMenuItem
                key={key}
                onClick={() => setSelectedMonth(month)}
                className={cn(
                  "capitalize cursor-pointer",
                  isSelected && "bg-primary/10 text-primary font-medium"
                )}
              >
                {format(month, "MMMM yyyy", { locale: el })}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon"
        onClick={goToNextMonth}
        className="h-8 w-8 rounded-xl hover:bg-background"
        disabled={isCurrentMonth}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
