import * as React from "react";
import { format, parse, isValid, setMonth, setYear } from "date-fns";
import { el } from "date-fns/locale";
import { CalendarIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DayPicker } from "react-day-picker";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const MONTHS_EL = [
    "Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος",
    "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος",
    "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος",
];

interface DatePickerInputProps {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    clearable?: boolean;
    locale?: "el" | "en";
    id?: string;
}

export function DatePickerInput({
    value,
    onChange,
    placeholder = "Επιλέξτε ημερομηνία",
    className,
    disabled = false,
    clearable = true,
    locale = "el",
    id,
}: DatePickerInputProps) {
    const [open, setOpen] = React.useState(false);
    const [viewMonth, setViewMonth] = React.useState<Date>(new Date());

    const selected = React.useMemo(() => {
        if (!value) return undefined;
        const d = parse(value, "yyyy-MM-dd", new Date());
        return isValid(d) ? d : undefined;
    }, [value]);

    React.useEffect(() => {
        if (selected) setViewMonth(selected);
    }, [selected]);

    const displayValue = selected
        ? format(selected, "dd/MM/yyyy")
        : null;

    const handleSelect = (day: Date | undefined) => {
        if (day) {
            onChange(format(day, "yyyy-MM-dd"));
            setOpen(false);
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
    };

    const handleMonthChange = (monthStr: string) => {
        setViewMonth(prev => setMonth(prev, parseInt(monthStr)));
    };

    const handleYearChange = (yearStr: string) => {
        setViewMonth(prev => setYear(prev, parseInt(yearStr)));
    };

    const handlePrevMonth = () => {
        setViewMonth(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() - 1);
            return d;
        });
    };

    const handleNextMonth = () => {
        setViewMonth(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + 1);
            return d;
        });
    };

    const currentYear = new Date().getFullYear();
    const startYear = 1940;
    const years = Array.from({ length: currentYear - startYear + 6 }, (_, i) => startYear + i);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    id={id}
                    type="button"
                    disabled={disabled}
                    className={cn(
                        "w-full flex items-center gap-2 h-10 px-3 rounded-xl border border-border bg-card text-sm",
                        "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        "transition-all duration-150 cursor-pointer",
                        !displayValue && "text-muted-foreground",
                        displayValue && "text-foreground",
                        disabled && "opacity-50 cursor-not-allowed bg-muted",
                        className
                    )}
                >
                    <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-left">
                        {displayValue || placeholder}
                    </span>
                    {clearable && displayValue && (
                        <span
                            role="button"
                            onClick={handleClear}
                            className="h-4 w-4 flex items-center justify-center rounded-full text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors shrink-0"
                        >
                            <X className="h-3 w-3" />
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-0 rounded-2xl border border-border shadow-xl overflow-hidden pointer-events-auto"
                align="start"
            >
                {/* Selected date preview */}
                <div className="bg-primary px-4 py-3">
                    <p className="text-[10px] text-primary-foreground/70 font-medium uppercase tracking-widest">
                        {locale === "el" ? "Επιλεγμένη Ημερομηνία" : "Selected Date"}
                    </p>
                    <p className="text-primary-foreground text-lg font-bold mt-0.5">
                        {selected ? format(selected, "dd MMMM yyyy", { locale: el }) : "—"}
                    </p>
                </div>

                {/* Month/Year navigation with dropdowns */}
                <div className="flex items-center gap-1 px-3 pt-3 pb-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                        onClick={handlePrevMonth}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex-1 flex items-center justify-center gap-1.5">
                        <Select
                            value={viewMonth.getMonth().toString()}
                            onValueChange={handleMonthChange}
                        >
                            <SelectTrigger className="h-8 w-[120px] text-xs font-semibold border-none bg-muted/50 rounded-lg focus:ring-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl pointer-events-auto">
                                {MONTHS_EL.map((m, i) => (
                                    <SelectItem key={i} value={i.toString()} className="text-xs">
                                        {m}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={viewMonth.getFullYear().toString()}
                            onValueChange={handleYearChange}
                        >
                            <SelectTrigger className="h-8 w-[76px] text-xs font-semibold border-none bg-muted/50 rounded-lg focus:ring-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl pointer-events-auto">
                                {years.map(y => (
                                    <SelectItem key={y} value={y.toString()} className="text-xs">
                                        {y}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                        onClick={handleNextMonth}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                {/* Calendar grid */}
                <DayPicker
                    mode="single"
                    selected={selected}
                    onSelect={handleSelect}
                    month={viewMonth}
                    onMonthChange={setViewMonth}
                    locale={el}
                    weekStartsOn={1}
                    showOutsideDays
                    className="p-3 pointer-events-auto"
                    classNames={{
                        months: "flex flex-col",
                        month: "space-y-1",
                        caption: "hidden",
                        table: "w-full border-collapse",
                        head_row: "flex mb-1",
                        head_cell:
                            "text-muted-foreground rounded-md w-10 font-medium text-[0.7rem] text-center uppercase",
                        row: "flex w-full",
                        cell: "h-10 w-10 text-center text-sm p-0 relative",
                        day: cn(
                            "h-10 w-10 p-0 font-normal rounded-xl text-foreground",
                            "hover:bg-accent hover:text-accent-foreground",
                            "transition-all duration-100 aria-selected:opacity-100 text-sm",
                            "focus:outline-none focus:ring-2 focus:ring-primary/30"
                        ),
                        day_selected: cn(
                            "bg-primary text-primary-foreground",
                            "hover:bg-primary/90 hover:text-primary-foreground",
                            "focus:bg-primary focus:text-primary-foreground",
                            "rounded-xl font-semibold shadow-sm"
                        ),
                        day_today:
                            "ring-1 ring-primary/40 text-primary font-semibold",
                        day_outside: "text-muted-foreground/40 hover:bg-muted/50",
                        day_disabled: "text-muted-foreground/30 cursor-not-allowed hover:bg-transparent",
                        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                        day_hidden: "invisible",
                    }}
                    components={{
                        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
                        IconRight: () => <ChevronRight className="h-4 w-4" />,
                    }}
                />

                {/* Quick actions */}
                <div className="border-t border-border px-3 py-2 flex gap-1.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-xs text-primary hover:text-primary hover:bg-primary/10 h-8 rounded-lg font-medium"
                        onClick={() => handleSelect(new Date())}
                    >
                        {locale === "el" ? "Σήμερα" : "Today"}
                    </Button>
                    {clearable && selected && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 rounded-lg"
                            onClick={(e) => { handleClear(e); setOpen(false); }}
                        >
                            {locale === "el" ? "Καθαρισμός" : "Clear"}
                        </Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}