"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { de } from "date-fns/locale"; // Import German locale
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
}

export function DatePicker({ label, placeholder, value, onChange, disabled, error }: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState<string>(
    value ? format(value, "dd.MM.yyyy", { locale: de }) : ""
  );

  React.useEffect(() => {
    setInputValue(value ? format(value, "dd.MM.yyyy", { locale: de }) : "");
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);

    // Versuche, das Datum zu parsen, wenn die Länge 10 (DD.MM.YYYY) erreicht ist
    if (text.length === 10) {
      const parsedDate = parse(text, "dd.MM.yyyy", new Date(), { locale: de });
      if (isValid(parsedDate)) {
        onChange(parsedDate);
      } else {
        onChange(null); // Ungültiges Datum
      }
    } else if (text === "") {
      onChange(null); // Eingabe gelöscht
    } else {
      // Bei teilweiser Eingabe oder ungültigem Format wird der Wert nicht sofort aktualisiert
      // Dies ermöglicht dem Benutzer, die Eingabe zu vervollständigen
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    onChange(date || null);
    setInputValue(date ? format(date, "dd.MM.yyyy", { locale: de }) : "");
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
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
                "w-full pl-10", // Platz für das Icon
                !value && "text-muted-foreground"
              )}
            />
            <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={handleDateSelect}
            initialFocus
            locale={de} // Kalender auf Deutsch einstellen
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}