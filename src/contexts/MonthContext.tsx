import { createContext, useContext, useState, ReactNode, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, startOfYear, endOfYear, subMonths, addMonths, subWeeks, addWeeks, subDays, addDays, subYears, addYears } from "date-fns";
import { el } from "date-fns/locale";

export type ViewMode = 'day' | 'week' | 'month' | 'year';

interface MonthContextType {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  monthKey: string; // Format: "YYYY-MM"
  startDate: string; // Format: "YYYY-MM-DD"
  endDate: string; // Format: "YYYY-MM-DD"
  displayLabel: string; // Greek formatted label
  goToPrevious: () => void;
  goToNext: () => void;
  availableMonths: Date[]; // Last 12 months for quick selection
  // Backwards compatibility
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
}

const MonthContext = createContext<MonthContextType | undefined>(undefined);

export function MonthProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // Calculate date range based on view mode
  const { startDate, endDate, displayLabel } = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return {
          startDate: format(startOfDay(selectedDate), "yyyy-MM-dd"),
          endDate: format(endOfDay(selectedDate), "yyyy-MM-dd"),
          displayLabel: format(selectedDate, "d MMMM yyyy", { locale: el }),
        };
      case 'week':
        return {
          startDate: format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          endDate: format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          displayLabel: `Εβδ. ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "d")} - ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "d MMM yyyy", { locale: el })}`,
        };
      case 'year':
        return {
          startDate: format(startOfYear(selectedDate), "yyyy-MM-dd"),
          endDate: format(endOfYear(selectedDate), "yyyy-MM-dd"),
          displayLabel: format(selectedDate, "yyyy"),
        };
      case 'month':
      default:
        return {
          startDate: format(startOfMonth(selectedDate), "yyyy-MM-dd"),
          endDate: format(endOfMonth(selectedDate), "yyyy-MM-dd"),
          displayLabel: format(selectedDate, "MMMM yyyy", { locale: el }),
        };
    }
  }, [selectedDate, viewMode]);

  const monthKey = useMemo(() => format(selectedDate, "yyyy-MM"), [selectedDate]);

  const goToPrevious = () => {
    setSelectedDate(prev => {
      switch (viewMode) {
        case 'day': return subDays(prev, 1);
        case 'week': return subWeeks(prev, 1);
        case 'year': return subYears(prev, 1);
        default: return subMonths(prev, 1);
      }
    });
  };

  const goToNext = () => {
    setSelectedDate(prev => {
      switch (viewMode) {
        case 'day': return addDays(prev, 1);
        case 'week': return addWeeks(prev, 1);
        case 'year': return addYears(prev, 1);
        default: return addMonths(prev, 1);
      }
    });
  };

  // Generate last 12 months for quick selection
  const availableMonths = useMemo(() => {
    const months: Date[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      months.push(subMonths(now, i));
    }
    return months;
  }, []);

  // Backwards compatibility
  const goToPreviousMonth = () => setSelectedDate(prev => subMonths(prev, 1));
  const goToNextMonth = () => setSelectedDate(prev => addMonths(prev, 1));

  return (
    <MonthContext.Provider
      value={{
        selectedDate,
        setSelectedDate,
        viewMode,
        setViewMode,
        monthKey,
        startDate,
        endDate,
        displayLabel,
        goToPrevious,
        goToNext,
        availableMonths,
        // Backwards compatibility
        selectedMonth: selectedDate,
        setSelectedMonth: setSelectedDate,
        goToPreviousMonth,
        goToNextMonth,
      }}
    >
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  const context = useContext(MonthContext);
  if (context === undefined) {
    throw new Error("useMonth must be used within a MonthProvider");
  }
  return context;
}
