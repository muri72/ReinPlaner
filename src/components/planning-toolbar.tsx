"use client";

import * as React from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DatePicker } from "@/components/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PlanningToolbarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export function PlanningToolbar({ currentDate, onDateChange }: PlanningToolbarProps) {
  const [viewMode, setViewMode] = React.useState("Woche");

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-4 border rounded-lg shadow-neumorphic glassmorphism-card">
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => onDateChange(new Date())}>
          Heute
        </Button>
        <Button variant="outline" size="icon" onClick={() => onDateChange(subDays(currentDate, 7))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => onDateChange(addDays(currentDate, 7))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <DatePicker
          value={currentDate}
          onChange={(date) => date && onDateChange(date)}
        />
        <h2 className="text-lg font-semibold hidden md:block">
          {format(weekStart, "dd. MMM", { locale: de })} - {format(weekEnd, "dd. MMM yyyy", { locale: de })}
        </h2>
      </div>
      <div className="flex items-center gap-2">
        {/* Placeholder for filters */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">{viewMode}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={viewMode} onValueChange={setViewMode}>
              <DropdownMenuRadioItem value="Tag">Tag</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="Woche">Woche</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="Monat">Monat</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button>Einsatz erstellen</Button>
      </div>
    </div>
  );
}