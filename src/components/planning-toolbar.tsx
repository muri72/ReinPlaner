"use client";

import * as React from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek, addMonths, subMonths, startOfMonth, startOfDay } from "date-fns";
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
    day: 'Heute',
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

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const quickActions = [
    { label: 'Gestern', date: yesterday },
    { label: 'Heute', date: today },
    { label: 'Morgen', date: tomorrow },
    { label: 'N. Woche', date: nextWeek },
  ];

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-lg shadow-neumorphic glassmorphism-card">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onDateChange(new Date())} className="flex flex-col items-center h-auto py-2 px-3">
            <span className="text-xs">Heute</span>
            <span className="text-xs font-mono">{format(new Date(), "dd.MM.yyyy", { locale: de })}</span>
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
                <DropdownMenuRadioItem value="day">Heute</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="week">Woche</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="month">Monat</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <OrderCreateDialog onOrderCreated={onActionSuccess} />
        </div>
      </div>

      <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Schnellzugriff:</span>
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="secondary"
              size="sm"
              className="whitespace-nowrap bg-background/80 hover:bg-background shadow-sm flex flex-col items-center h-auto py-2 px-3"
              onClick={() => {
                if (viewMode === 'month') {
                  onDateChange(startOfMonth(action.date));
                } else if (viewMode === 'week') {
                  onDateChange(startOfWeek(action.date, { weekStartsOn: 1 }));
                } else {
                  onDateChange(startOfDay(action.date));
                }
              }}
            >
              <span className="text-xs">{action.label}</span>
              <span className="text-[10px] font-mono">{format(action.date, "dd.MM", { locale: de })}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}