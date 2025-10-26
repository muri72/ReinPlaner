"use client";

import * as React from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Filter, Eye, EyeOff, Menu, Calendar as CalendarIcon, Plus } from "lucide-react";
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

  // Moderne mobile Ansicht
  if (isMobile) {
    return (
      <div className="p-4">
        {/* Header mit Navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handlePrev}
              className="h-10 w-10 rounded-xl"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDateChange(new Date())}
              className="rounded-xl px-4"
            >
              Heute
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleNext}
              className="h-10 w-10 rounded-xl"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onShowUnassignedChange(!showUnassigned)}
              className={cn(
                "h-10 w-10 rounded-xl",
                showUnassigned && "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              )}
            >
              <Eye className="h-5 w-5" />
            </Button>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-10 w-10 rounded-xl">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 rounded-l-2xl">
                <SheetHeader>
                  <SheetTitle>Optionen</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  {/* Datumswahl */}
                  <div>
                    <label className="text-sm font-semibold mb-3 block text-slate-700 dark:text-slate-300">Datum wählen</label>
                    <DatePicker
                      value={currentDate}
                      onChange={(date) => date && onDateChange(date)}
                    />
                  </div>
                  
                  {/* Ansichtsmodus */}
                  <div>
                    <label className="text-sm font-semibold mb-3 block text-slate-700 dark:text-slate-300">Ansicht</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between rounded-xl h-12">
                          {viewModeTranslations[viewMode]}
                          <ChevronRight className="h-4 w-4 rotate-90" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="rounded-xl">
                        <DropdownMenuRadioGroup value={viewMode} onValueChange={(value) => onViewModeChange(value as 'day' | 'week' | 'month')}>
                          <DropdownMenuRadioItem value="day" className="rounded-lg">Tag</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="week" className="rounded-lg">Woche</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="month" className="rounded-lg">Monat</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* Suche */}
                  <div>
                    <label className="text-sm font-semibold mb-3 block text-slate-700 dark:text-slate-300">Mitarbeiter suchen</label>
                    <SearchInput placeholder="Suchen..." className="w-full rounded-xl" />
                  </div>
                  
                  {/* Aktionen */}
                  <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <OrderCreateDialog onOrderCreated={onActionSuccess} />
                    <TimeEntryCreateDialog 
                      onEntryCreated={onActionSuccess}
                      currentUserId={currentUserId || ''}
                      isAdmin={isAdmin || false}
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        
        {/* Datum-Anzeige */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {dateDisplay}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {format(currentDate, "EEEE", { locale: de })}
          </p>
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