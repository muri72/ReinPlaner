"use client";

import * as React from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek, addMonths, subMonths, startOfMonth, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Filter, Eye, EyeOff, PlusCircle, Users, Building2, Briefcase, Clock } from "lucide-react";
import { DatePicker } from "@/components/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CreateShiftDialog } from "@/components/create-shift-dialog";
import { Input } from "@/components/ui/input";
import { PlanningFilterDialog } from "./planning-filter-dialog";
import { Badge } from "@/components/ui/badge";

export interface FilterValues {
  objects?: string[];
  services?: string[];
  showAvailableOnly?: boolean;
  shiftStatus?: string;
}

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
  filters?: FilterValues;
  onFiltersChange?: (filters: FilterValues) => void;
  objects?: { id: string; name: string }[];
  services?: { id: string; title: string; color?: string }[];
  onCreateShift?: (employeeId: string, date: string) => void;
  availableObjects?: { id: string; name: string; address?: string; daily_schedules?: any[] }[];
  availableOrders?: { id: string; title: string; object_id: string; object_name?: string; customer_name?: string }[];
  availableEmployees?: { id: string; name: string }[];
  availableServices?: { id: string; name: string }[];
  availableCustomers?: { id: string; name: string }[];
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
  filters = {},
  onFiltersChange,
  objects = [],
  services = [],
  onCreateShift,
  availableObjects = [],
  availableOrders = [],
  availableEmployees = [],
  availableServices = [],
  availableCustomers = [],
}: PlanningToolbarProps) {
  const [createShiftOpen, setCreateShiftOpen] = React.useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = React.useState(false);

  const viewModeTranslations = {
    day: 'Heute',
    week: 'Woche',
    month: 'Monat',
  };

  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.objects?.length) count++;
    if (filters.services?.length) count++;
    if (filters.shiftStatus && filters.shiftStatus !== "all") count++;
    if (filters.showAvailableOnly) count++;
    return count;
  }, [filters]);

  const handleClearAllFilters = () => {
    onFiltersChange?.({});
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
          <Input placeholder="Mitarbeiter suchen..." className="w-full sm:w-auto" />
          <PlanningFilterDialog
            open={filterDialogOpen}
            onOpenChange={setFilterDialogOpen}
            filters={filters}
            onFiltersChange={(newFilters) => onFiltersChange?.(newFilters)}
            objects={objects}
            services={services}
            onClearAll={handleClearAllFilters}
          />
          <Button variant="outline" size="icon" onClick={() => onShowUnassignedChange(!showUnassigned)}>
            {showUnassigned ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button variant="default" size="sm" onClick={() => {
            setCreateShiftOpen(true);
          }}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Einsatz erstellen
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
        </div>
      </div>

      <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
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

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground">Filter aktiv:</span>
              {filters.objects?.map((objId) => {
                const obj = objects.find((o) => o.id === objId);
                return obj ? (
                  <Badge key={objId} variant="secondary" className="text-[10px] gap-1">
                    <Building2 className="h-3 w-3" />
                    {obj.name}
                  </Badge>
                ) : null;
              })}
              {filters.services?.map((serviceId) => {
                const service = services.find((s) => s.id === serviceId);
                return service ? (
                  <Badge
                    key={serviceId}
                    variant="secondary"
                    className="text-[10px] gap-1"
                    style={{
                      backgroundColor: service.color || undefined,
                      color: service.color ? "white" : undefined,
                    }}
                  >
                    <Briefcase className="h-3 w-3" />
                    {service.title}
                  </Badge>
                ) : null;
              })}
              {filters.showAvailableOnly && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Clock className="h-3 w-3" />
                  Nur verfügbar
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px]"
                onClick={handleClearAllFilters}
              >
                Alle löschen
              </Button>
            </div>
          )}
        </div>
      </div>

      <CreateShiftDialog
        open={createShiftOpen}
        onOpenChange={setCreateShiftOpen}
        onSuccess={() => {
          if (onActionSuccess) {
            onActionSuccess();
          }
        }}
        availableEmployees={availableEmployees}
        availableObjects={availableObjects}
        availableOrders={availableOrders}
        availableServices={availableServices}
        availableCustomers={availableCustomers}
      />
    </div>
  );
}