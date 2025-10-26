"use client";

import * as React from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Filter, Eye, EyeOff, Menu, Calendar as CalendarIcon } from "lucide-react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

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
        return format(currentDate, "EEEE, dd. MMM", { locale: de });
      case 'month':
        return format(currentDate, "MMMM yyyy", { locale: de });
      case 'week':
      default:
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, "dd. MMM", { locale: de })} - ${format(weekEnd, "dd. MMM", { locale: de })}`;
    }
  }, [currentDate, viewMode]);

  // Mobile Ansicht
  if (isMobile) {
    return (
      <div className="flex flex-col gap-3 p-3 border rounded-lg shadow-neumorphic glassmorphism-card">
        {/* Obere Zeile: Navigation und Datum */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => onDateChange(new Date())}>
              Heute
            </Button>
            <Button variant="outline" size="icon" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => onShowUnassignedChange(!showUnassigned)}>
              {showUnassigned ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Optionen</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {/* Datumswahl */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Datum wählen</label>
                    <DatePicker
                      value={currentDate}
                      onChange={(date) => date && onDateChange(date)}
                    />
                  </div>
                  
                  {/* Ansichtsmodus */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Ansicht</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          {viewModeTranslations[viewMode]}
                          <ChevronRight className="h-4 w-4 rotate-90" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuRadioGroup value={viewMode} onValueChange={(value) => onViewModeChange(value as 'day' | 'week' | 'month')}>
                          <DropdownMenuRadioItem value="day">Tag</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="week">Woche</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="month">Monat</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* Suche */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Mitarbeiter suchen</label>
                    <SearchInput placeholder="Mitarbeiter suchen..." className="w-full" />
                  </div>
                  
                  {/* Aktionen */}
                  <div className="space-y-2 pt-4 border-t">
                    <OrderCreateDialog onOrderCreated={onActionSuccess} />
                    <TimeEntryCreateDialog 
                      onEntryCreated={onActionSuccess}
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        
        {/* Datum-Anzeige */}
        <div className="text-center">
          <h2 className="text-lg font-semibold">{dateDisplay}</h2>
        </div>
      </div>
    );
  }

  // Desktop Ansicht (bestehende Logik)
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