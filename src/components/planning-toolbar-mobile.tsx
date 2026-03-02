"use client";

import * as React from "react";
import {
  format,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  startOfDay,
} from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Calendar, ChevronLeft, ChevronRight, Filter, MoreHorizontal, Plus } from "lucide-react";
import { SearchInput } from "./search-input";
import { CreateShiftDialog } from "@/components/create-shift-dialog";

interface MobilePlanningToolbarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: "day" | "week" | "month";
  onViewModeChange: (mode: "day" | "week" | "month") => void;
  showUnassigned: boolean;
  onShowUnassignedChange: (show: boolean) => void;
  unassignedCount?: number;
  onCreateOrder?: () => void;
  onOpenFilters?: () => void;
}

const MODE_OPTIONS: Array<{ mode: "day" | "week" | "month"; label: string }> = [
  { mode: "day", label: "Heute" },
  { mode: "week", label: "Woche" },
  { mode: "month", label: "Monat" },
];

export function MobilePlanningToolbar({
  currentDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  showUnassigned,
  onShowUnassignedChange,
  unassignedCount = 0,
  onCreateOrder,
  onOpenFilters,
}: MobilePlanningToolbarProps) {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [createShiftOpen, setCreateShiftOpen] = React.useState(false);
  const [availableEmployees, setAvailableEmployees] = React.useState<{ id: string; name: string }[]>([]);
  const [availableObjects, setAvailableObjects] = React.useState<{ id: string; name: string; address?: string; daily_schedules?: any[] }[]>([]);
  const [availableOrders, setAvailableOrders] = React.useState<{ id: string; title: string; object_id: string; object_name?: string; customer_name?: string }[]>([]);
  const [availableServices, setAvailableServices] = React.useState<{ id: string; name: string }[]>([]);
  const [availableCustomers, setAvailableCustomers] = React.useState<{ id: string; name: string }[]>([]);

  // Load data for shift dialog
  React.useEffect(() => {
    if (createShiftOpen) {
      const loadData = async () => {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();

        // Load employees
        const { data: employees } = await supabase
          .from("employees")
          .select("id, first_name, last_name")
          .eq("status", "active")
          .order("last_name");
        if (employees) {
          setAvailableEmployees(employees.map(e => ({
            id: e.id,
            name: `${e.first_name} ${e.last_name}`
          })));
        }

        // Load objects
        const { data: objects } = await supabase
          .from("objects")
          .select("id, name, address, daily_schedules")
          .order("name");
        if (objects) {
          setAvailableObjects(objects);
        }

        // Load orders
        const { data: orders } = await supabase
          .from("orders")
          .select("id, title, object_id, objects(name)")
          .eq("status", "active")
          .order("title");
        if (orders) {
          setAvailableOrders(orders.map(o => {
            const objectsData = Array.isArray(o.objects) ? o.objects[0] : o.objects;
            return {
              id: o.id,
              title: o.title,
              object_id: o.object_id,
              object_name: objectsData?.name
            };
          }));
        }

        // Load services
        const { data: services } = await supabase
          .from("services")
          .select("id, name")
          .order("name");
        if (services) {
          setAvailableServices(services.map((s: any) => ({
            id: s.id,
            name: s.name
          })));
        }

        // Load customers
        const { data: customers } = await supabase
          .from("customers")
          .select("id, name")
          .order("name");
        if (customers) {
          setAvailableCustomers(customers.map((c: any) => ({
            id: c.id,
            name: c.name
          })));
        }
      };
      loadData();
    }
  }, [createShiftOpen]);

  const handlePrev = React.useCallback(() => {
    switch (viewMode) {
      case "day":
        onDateChange(subDays(currentDate, 1));
        break;
      case "month": {
        const currentMonthStart = startOfMonth(currentDate);
        onDateChange(startOfMonth(subMonths(currentMonthStart, 1)));
        break;
      }
      case "week":
      default: {
        const currentWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        onDateChange(startOfWeek(subWeeks(currentWeekStart, 1), { weekStartsOn: 1 }));
        break;
      }
    }
  }, [currentDate, onDateChange, viewMode]);

  const handleNext = React.useCallback(() => {
    switch (viewMode) {
      case "day":
        onDateChange(addDays(currentDate, 1));
        break;
      case "month": {
        const currentMonthStart = startOfMonth(currentDate);
        onDateChange(startOfMonth(addMonths(currentMonthStart, 1)));
        break;
      }
      case "week":
      default: {
        const currentWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        onDateChange(startOfWeek(addWeeks(currentWeekStart, 1), { weekStartsOn: 1 }));
        break;
      }
    }
  }, [currentDate, onDateChange, viewMode]);

  const handleToday = React.useCallback(() => {
    const today = new Date();
    if (viewMode === "month") {
      onDateChange(startOfMonth(today));
    } else if (viewMode === "week") {
      onDateChange(startOfWeek(today, { weekStartsOn: 1 }));
    } else {
      onDateChange(today);
    }
  }, [onDateChange, viewMode]);

  const dateDisplay = React.useMemo(() => {
    if (viewMode === "day") {
      return format(currentDate, "EEEE, dd. MMM yyyy", { locale: de });
    }
    if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      const startLabel = format(weekStart, "EEE dd.MM.", { locale: de });
      const endLabel = format(weekEnd, "EEE dd.MM.", { locale: de });
      return `${startLabel} – ${endLabel}`;
    }
    const monthStart = startOfMonth(currentDate);
    return format(monthStart, "MMMM yyyy", { locale: de });
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
    <div className="space-y-3 rounded-xl border border-border/70 bg-background/80 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 flex-shrink-0"
          onClick={handlePrev}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex flex-col items-center text-center">
          <button
            type="button"
            onClick={handleToday}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Heute
          </button>
          <span className="text-base font-semibold">{dateDisplay}</span>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 flex-shrink-0"
          onClick={handleNext}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <SearchInput placeholder="Mitarbeiter suchen..." className="w-full" />

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-1 rounded-lg border border-border/70 p-1">
          {MODE_OPTIONS.map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange(mode)}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                viewMode === mode
                  ? "bg-primary text-primary-foreground shadow"
                  : "hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Button
          variant={showUnassigned ? "default" : "outline"}
          size="sm"
          className="h-10 flex-1"
          onClick={() => onShowUnassignedChange(!showUnassigned)}
        >
          <span className="text-xs font-medium">Unbesetzt</span>
          {unassignedCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
              {unassignedCount}
            </Badge>
          )}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="default"
          className="flex-1"
          onClick={() => setCreateShiftOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" /> Einsatz erstellen
        </Button>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-11 w-11">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl bg-background">
            <SheetHeader className="px-2 text-left">
              <SheetTitle className="font-semibold">Planungsoptionen</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4 px-2">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Schnellzugriff</h3>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                  <div className="grid grid-cols-4 gap-2">
                    {quickActions.map((action) => (
                      <Button
                        key={action.label}
                        variant="secondary"
                        size="lg"
                        className="justify-start gap-2 h-auto py-3 flex-col bg-background/80 hover:bg-background shadow-sm"
                        onClick={() => {
                          setIsSheetOpen(false);
                          if (viewMode === "month") {
                            onDateChange(startOfMonth(action.date));
                          } else if (viewMode === "week") {
                            onDateChange(startOfWeek(action.date, { weekStartsOn: 1 }));
                          } else {
                            onDateChange(startOfDay(action.date));
                          }
                        }}
                      >
                        <span className="text-xs font-medium">{action.label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(action.date, "dd.MM.", { locale: de })}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="justify-start gap-3 w-full"
                  onClick={() => {
                    setIsSheetOpen(false);
                    handleToday();
                  }}
                >
                  <Calendar className="h-5 w-5" />
                  Datum zurücksetzen
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="justify-start gap-3 w-full"
                  onClick={() => {
                    setIsSheetOpen(false);
                    onOpenFilters?.();
                  }}
                >
                  <Filter className="h-5 w-5" />
                  Filter und Suche
                </Button>
                <Button
                  variant="default"
                  size="lg"
                  className="justify-start gap-3 w-full"
                  onClick={() => {
                    setIsSheetOpen(false);
                    onCreateOrder?.();
                  }}
                >
                  <Plus className="h-5 w-5" />
                  Neuer Auftrag
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <CreateShiftDialog
        open={createShiftOpen}
        onOpenChange={setCreateShiftOpen}
        onSuccess={() => {
          // TODO: Trigger refresh of planning data
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