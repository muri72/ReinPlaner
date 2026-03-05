"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { de } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DatePickerProps {
  label?: string;
  placeholder?: string;
  value: Date | null | undefined;
  onChange: (date: Date | null) => void;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}

export function DatePicker({ label, placeholder, value, onChange, disabled, error, required }: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState<string>(
    value ? format(value, "dd.MM.yyyy", { locale: de }) : ""
  );

  React.useEffect(() => {
    setInputValue(value ? format(value, "dd.MM.yyyy", { locale: de }) : "");
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);

    // When input is cleared, explicitly set null
    if (text.length === 0 || text.trim() === "") {
      onChange(null);
      return;
    }

    // Parse date when length is 10 (DD.MM.YYYY format)
    if (text.length === 10) {
      const referenceDate = new Date(Date.UTC(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate(),
        12, 0, 0
      ));
      const parsedDate = parse(text, "dd.MM.yyyy", referenceDate, { locale: de });

      if (isValid(parsedDate)) {
        // Create UTC date using local values to avoid timezone shifts
        const correctedDate = new Date(Date.UTC(
          parsedDate.getUTCFullYear(),
          parsedDate.getUTCMonth(),
          parsedDate.getUTCDate(),
          12, 0, 0
        ));
        onChange(correctedDate);
      } else {
        onChange(null);
      }
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange(null);
      setInputValue("");
      return;
    }

    // Extract LOCAL values (which are correct from the calendar)
    const localYear = date.getFullYear();
    const localMonth = date.getMonth();
    const localDay = date.getDate();

    // Create a consistent UTC date at noon to avoid timezone issues
    const correctedDate = new Date(Date.UTC(localYear, localMonth, localDay, 12, 0, 0));

    onChange(correctedDate);
    setInputValue(format(correctedDate, "dd.MM.yyyy", { locale: de }));
  };

  return (
    <div className="space-y-2">
      {label && <Label className={required ? "after:content-['*'] after:ml-0.5 after:text-destructive" : undefined}>{label}</Label>}
      <Popover>
        <PopoverTrigger asChild>
          <div className="relative w-full">
            <Input
              type="text"
              placeholder={placeholder || "Datum auswählen"}
              value={inputValue}
              onChange={handleInputChange}
              disabled={disabled}
              className={cn(
                "w-full pl-10 pr-10",
                !value && "text-muted-foreground"
              )}
            />
            <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            {value && !disabled && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setInputValue("");
                }}
                className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Datum löschen"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={handleDateSelect}
            initialFocus
            locale={de}
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}