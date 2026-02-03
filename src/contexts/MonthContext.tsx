import { createContext, useContext, useState, ReactNode, useMemo } from "react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { el } from "date-fns/locale";

interface MonthContextType {
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
  monthKey: string; // Format: "YYYY-MM"
  startDate: string; // Format: "YYYY-MM-DD"
  endDate: string; // Format: "YYYY-MM-DD"
  displayLabel: string; // Greek formatted label
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  availableMonths: Date[]; // Last 12 months for quick selection
}

const MonthContext = createContext<MonthContextType | undefined>(undefined);

export function MonthProvider({ children }: { children: ReactNode }) {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  const monthKey = useMemo(() => format(selectedMonth, "yyyy-MM"), [selectedMonth]);
  
  const startDate = useMemo(() => 
    format(startOfMonth(selectedMonth), "yyyy-MM-dd"), 
    [selectedMonth]
  );
  
  const endDate = useMemo(() => 
    format(endOfMonth(selectedMonth), "yyyy-MM-dd"), 
    [selectedMonth]
  );
  
  const displayLabel = useMemo(() => 
    format(selectedMonth, "MMMM yyyy", { locale: el }), 
    [selectedMonth]
  );

  const goToPreviousMonth = () => {
    setSelectedMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth(prev => addMonths(prev, 1));
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

  return (
    <MonthContext.Provider
      value={{
        selectedMonth,
        setSelectedMonth,
        monthKey,
        startDate,
        endDate,
        displayLabel,
        goToPreviousMonth,
        goToNextMonth,
        availableMonths,
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
