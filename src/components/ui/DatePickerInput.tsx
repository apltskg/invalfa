import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { el } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerInputProps {
    value?: string;           // ISO date string: "2025-03-15" or ""
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

    const selected = React.useMemo(() => {
        if (!value) return undefined;
        const d = parse(value, "yyyy-MM-dd", new Date());
        return isValid(d) ? d : undefined;
    }, [value]);

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

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    id={id}
                    type="button"
                    disabled={disabled}
                    className={cn(
                        "w-full flex items-center gap-2 h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm",
                        "hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                        "transition-all duration-150 cursor-pointer",
                        !displayValue && "text-gray-400",
                        displayValue && "text-gray-900",
                        disabled && "opacity-50 cursor-not-allowed bg-gray-50",
                        className
                    )}
                >
                    <CalendarIcon className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="flex-1 text-left">
                        {displayValue || placeholder}
                    </span>
                    {clearable && displayValue && (
                        <span
                            role="button"
                            onClick={handleClear}
                            className="h-4 w-4 flex items-center justify-center rounded-full text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
                        >
                            <X className="h-3 w-3" />
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-0 shadow-xl border border-gray-100 rounded-xl overflow-hidden"
                align="start"
            >
                {/* Month/Year header with gradient */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3">
                    <p className="text-xs text-blue-100 font-medium uppercase tracking-widest">
                        {locale === "el" ? "Επιλογή Ημερομηνίας" : "Select Date"}
                    </p>
                    <p className="text-white text-lg font-bold mt-0.5">
                        {selected ? format(selected, "dd MMMM yyyy", { locale: el }) : "—"}
                    </p>
                </div>
                <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={handleSelect}
                    defaultMonth={selected ?? new Date()}
                    locale={el}
                    weekStartsOn={1}
                    initialFocus
                    classNames={{
                        months: "flex flex-col",
                        month: "space-y-3 p-3",
                        caption: "flex justify-center relative items-center h-8",
                        caption_label: "text-sm font-semibold text-gray-700",
                        nav: "flex items-center gap-1",
                        nav_button:
                            "h-7 w-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors",
                        nav_button_previous: "absolute left-0",
                        nav_button_next: "absolute right-0",
                        table: "w-full border-collapse",
                        head_row: "flex mb-1",
                        head_cell:
                            "text-gray-400 rounded-md w-9 font-medium text-[0.72rem] text-center",
                        row: "flex w-full",
                        cell: "h-9 w-9 text-center text-sm p-0 relative",
                        day: "h-9 w-9 p-0 font-normal rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors aria-selected:opacity-100 text-sm",
                        day_selected:
                            "bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:bg-blue-600 focus:text-white rounded-lg font-semibold",
                        day_today:
                            "border border-blue-300 text-blue-600 font-semibold",
                        day_outside: "text-gray-300 hover:bg-gray-50",
                        day_disabled: "text-gray-200 cursor-not-allowed hover:bg-transparent",
                        day_range_middle: "aria-selected:bg-blue-50 aria-selected:text-blue-900",
                        day_hidden: "invisible",
                    }}
                />
                {/* Today shortcut */}
                <div className="border-t border-gray-100 p-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7"
                        onClick={() => handleSelect(new Date())}
                    >
                        {locale === "el" ? "Σήμερα" : "Today"}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
