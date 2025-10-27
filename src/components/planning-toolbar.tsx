"use client";

import * as React from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Filter, Eye, EyeOff } from "lucide-react";
import { DatePicker } from "@/components/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { TimeEntryCreateDialog } from "@/components/time-entry-create-dialog";
import { SearchInput } from "./search-input";
import { OrderCreateDialog } from "@/components/order-create-dialog";
import { StateSelector } from "./state-selector";

interface PlanningToolbarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: 'day' | 'week' | 'month';
  onViewModeChange: (mode: 'day' | 'week' | 'month') => void;
  showUnassigned: boolean;
  onShowUnassignedChange: (show: boolean) => void;
  currentUserId?: string;
  isAdmin?: boolean;
  onActionSuccess?: () => void;
}

export function PlanningToolbar({
  currentDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  showUnassigned,
  onShowUnassignedChange,
  currentUserId,
  isAdmin,
  onActionSuccess,
}: PlanningToolbarProps) {

  const viewModeTranslations = {
    day: 'Tag',
    week: 'Woche',
    month: 'Monat',
  };

  const handlePrev = () => {
    switch (viewMode) {
      case 'day':
        onDateChange(subDays(currentDate, 1));
        break;
      case 'month':
        onDateChange(subMonths(currentDate, 1));
        break;
      case 'week':
      default:
        onDateChange(subDays(currentDate, 7));
        break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case 'day':
        onDateChange(addDays(currentDate, 1));
        break;
      case 'month':
        onDateChange(addMonths(currentDate, 1));
        break;
      case 'week':
      default:
        onDateChange(addDays(currentDate, 7));
        break;
    }
  };

  const dateDisplay = React.useMemo(() => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, "EEEE, dd. MMMM yyyy", { locale: de });
      case 'month':
        return format(currentDate, "MMMM yyyy", { locale: de });
      case 'week':
      default:
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, "dd. MMM", { locale: de })} - ${format(weekEnd, "dd. MMM yyyy", { locale: de })}`;
    }
  }, [currentDate, viewMode]);

  const handleStateChange = React.useCallback((stateCode: string) => {
    // Trigger data refresh when state changes
    onActionSuccess?.();
  }, [onActionSuccess]);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-4 border rounded-lg shadow-neumorphic glassmorphism-card">
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => onDateChange(new Date())}>
          Heute
        </Button>
        <Button variant="outline" size="icon" onClick={handlePrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <DatePicker
          value={currentDate}
          onChange={(date) => date && onDateChange(date)}
        />
        <h2 className="text-lg font-semibold hidden md:block">
          {dateDisplay}
        </h2>
        <StateSelector onStateChange={handleStateChange} />
      </div>
      <div className="flex items-center gap-2">
        <SearchInput placeholder="Mitarbeiter suchen..." className="w-full sm:w-auto" />
        <Button variant="outline" size="icon" disabled>
          <Filter className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => onShowUnassignedChange(!showUnassigned)}>
          {showUnassigned ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">{viewModeTranslations[viewMode]}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={viewMode} onValueChange={(value) => onViewModeChange(value as 'day' | 'week' | 'month')}>
              <DropdownMenuRadioItem value="day">Tag</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="week">Woche</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="month">Monat</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <OrderCreateDialog onOrderCreated={onActionSuccess} />
      </div>
    </div>
  );
}