"use client";

import * as React from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek, addMonths, subMonths, startOfMonth, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Filter, Eye, EyeOff, PlusCircle, Users, Building2, Briefcase, Clock, Calendar, CalendarPlus, XCircle } from "lucide-react";
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
import { SearchInput } from "@/components/search-input";
import { List, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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
      {/* Prominent Date Display - Centered */}
      <div className="flex items-center justify-center gap-3 py-1 bg-gradient-to-r from-transparent via-primary/5 to-transparent rounded-lg">
        <Button variant="outline" size="icon" onClick={handlePrev} className="h-9 w-9">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => onDateChange(new Date())} className="flex flex-col items-center h-auto py-1.5 px-3">
          <span className="text-xs">Heute</span>
          <span className="text-xs font-mono">{format(new Date(), "dd.MM.yyyy", { locale: de })}</span>
        </Button>
        <DatePicker
          value={currentDate}
          onChange={(date) => date && onDateChange(date)}
        />
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
          {dateDisplay}
        </h2>
        <Button variant="outline" size="icon" onClick={handleNext} className="h-9 w-9">
          <ChevronRight className="h-4 w-4" />
        </Button>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              toast.info("Generiere Shifts...");
              try {
                const { generateShiftsFromAssignments } = await import('@/lib/actions/shift-planning');
                const result = await generateShiftsFromAssignments();
                if (result.success) {
                  toast.success(`${result.created_count || 0} Shifts generiert`);
                  onActionSuccess?.();
                } else {
                  toast.error(result.message);
                }
              } catch (err) {
                toast.error("Fehler beim Generieren der Shifts");
              }
            }}
          >
            <CalendarPlus className="h-4 w-4 mr-2" />
            Shifts
          </Button>
        )}
      </div>

      {/* Search and Filters Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Prominent Search Bar */}
        <div className="flex-1 w-full max-w-2xl">
          <SearchInput placeholder="Mitarbeiter suchen..." className="w-full h-11 text-base" />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
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

          {/* Status Quick Access - permanent buttons */}
          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant={!filters.shiftStatus || filters.shiftStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFiltersChange?.({ ...filters, shiftStatus: 'all' })}
            >
              <List className="h-3.5 w-3.5 mr-1" />
              Alle
            </Button>
            <Button
              variant={filters.shiftStatus === 'scheduled' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFiltersChange?.({ ...filters, shiftStatus: filters.shiftStatus === 'scheduled' ? 'all' : 'scheduled' })}
            >
              <Calendar className="h-3.5 w-3.5 mr-1" />
              Geplant
            </Button>
            <Button
              variant={filters.shiftStatus === 'in_progress' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFiltersChange?.({ ...filters, shiftStatus: filters.shiftStatus === 'in_progress' ? 'all' : 'in_progress' })}
            >
              <Clock className="h-3.5 w-3.5 mr-1" />
              In Bearbeitung
            </Button>
            <Button
              variant={filters.shiftStatus === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFiltersChange?.({ ...filters, shiftStatus: filters.shiftStatus === 'completed' ? 'all' : 'completed' })}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Erledigt
            </Button>
          </div>

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
              {filters.shiftStatus && filters.shiftStatus !== 'all' && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  {filters.shiftStatus === 'scheduled' && <Calendar className="h-3 w-3" />}
                  {filters.shiftStatus === 'in_progress' && <Clock className="h-3 w-3" />}
                  {filters.shiftStatus === 'completed' && <CheckCircle className="h-3 w-3" />}
                  {filters.shiftStatus === 'cancelled' && <XCircle className="h-3 w-3" />}
                  {filters.shiftStatus === 'scheduled' && 'Geplant'}
                  {filters.shiftStatus === 'in_progress' && 'In Bearbeitung'}
                  {filters.shiftStatus === 'completed' && 'Erledigt'}
                  {filters.shiftStatus === 'cancelled' && 'Abgesagt'}
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