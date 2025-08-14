"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCallback } from "react";

interface FilterSelectProps {
  paramName: string;
  label: string;
  options: { value: string; label: string }[];
  currentValue: string;
}

export function FilterSelect({ paramName, label, options, currentValue }: FilterSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value && value !== "all") { // Wenn ein gültiger Filterwert (nicht "all") ausgewählt ist
        params.set(paramName, value);
      } else { // Wenn "all" oder ein leerer Wert ausgewählt ist
        params.delete(paramName);
      }
      params.set('page', '1'); // Reset to first page on filter change
      router.replace(`${pathname}?${params.toString()}`);
    },
    [paramName, pathname, router, searchParams]
  );

  // Bestimme den aktuell ausgewählten Wert für das Select-Feld.
  // Wenn der Parameter nicht gesetzt ist (currentValue ist ""), soll "all" angezeigt werden.
  const selectedValue = currentValue || "all";

  return (
    <div>
      <Label htmlFor={paramName}>{label}</Label>
      <Select onValueChange={handleFilterChange} value={selectedValue}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={`Alle ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle</SelectItem> {/* Wert auf "all" geändert */}
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}