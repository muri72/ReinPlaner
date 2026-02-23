"use client";

import * as React from "react";
import {
  getShiftPlanningData,
  ShiftPlanningPageData,
  UnassignedShift,
  reassignShift,
  reassignAssignment,
  AssignmentEditMode,
  ShiftAssignment,
  deleteShift,
  deleteSeries,
  SeriesDeleteMode,
  simpleReassignShift,
  copyShift,
} from "@/lib/actions/shift-planning";
import { getServices, Service } from "@/app/dashboard/services/actions";
import { toast } from "sonner";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor, DragOverlay, useDraggable } from "@dnd-kit/core";
import { PlanningToolbar } from "@/components/planning-toolbar";
import type { FilterValues } from "@/components/planning-toolbar";
import { PlanningCalendar } from "@/components/planning-calendar";
import { PlanningCalendarMonth } from "@/components/planning-calendar-month";
import { MobilePlanningToolbar } from "@/components/planning-toolbar-mobile";
import { MobilePlanningCalendar } from "@/components/planning-calendar-mobile";
import { PlanningKpiSummary } from "@/components/planning-kpi-summary";
import { SeriesEditModeDialog, SeriesEditMode as DialogSeriesEditMode } from "@/components/series-edit-mode-dialog";
import { ShiftEditDialog } from "@/components/shift-edit-dialog";
import { CreateShiftDialog } from "@/components/create-shift-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { assignOrderToEmployee, checkAndCompleteOverdueShifts } from "./actions";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  format,
} from "date-fns";
import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams, useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { format as formatDateFns } from "date-fns";

interface EmployeeGroup {
  id: string;
  name: string;
}

interface ObjectOption {
  id: string;
  name: string;
}

export default function PlanningPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = React.useState(() => startOfDay(new Date()));
  const [viewMode, setViewMode] = React.useState<"day" | "week" | "month">("week");
  const [showUnassigned, setShowUnassigned] = React.useState(false);
  const [filters, setFilters] = React.useState<FilterValues>({});
  const [objects, setObjects] = React.useState<ObjectOption[]>([]);
  const [planningPageData, setPlanningPageData] = React.useState<ShiftPlanningPageData | null>(null);
  const [services, setServices] = React.useState<Service[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = React.useState<'admin' | 'manager' | 'employee' | 'customer'>('employee');
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [mobileSelectedDate, setMobileSelectedDate] = React.useState(() => startOfDay(new Date()));
  const [bundeslandCode, setBundeslandCode] = React.useState<string>('HH'); // Default to Hamburg
  const [holidaysMap, setHolidaysMap] = React.useState<{ [key: string]: { name: string } | null }>({});
  const [showHiddenEmployees, setShowHiddenEmployees] = React.useState(false);
  const [availableObjects, setAvailableObjects] = React.useState<{ id: string; name: string; address?: string; daily_schedules?: any[] }[]>([]);
  const [availableOrders, setAvailableOrders] = React.useState<{ id: string; title: string; object_id: string; object_name?: string; customer_name?: string }[]>([]);
  const [availableEmployees, setAvailableEmployees] = React.useState<{ id: string; name: string }[]>([]);
  const [availableServices, setAvailableServices] = React.useState<{ id: string; name: string }[]>([]);
  const [availableCustomers, setAvailableCustomers] = React.useState<{ id: string; name: string }[]>([]);

  // Refs to track if static data has been loaded (prevents dependency loops)
  const staticDataLoadedRef = React.useRef({
    objectsServices: false,
    customers: false,
    orders: false,
    employees: false,
  });

  // Ref to track the latest fetch request ID for cancellation
  const fetchIdRef = React.useRef(0);

  // Throttle auto-sync to maximum once per 10 seconds (for better shift/time entry sync)
  const lastAutoSyncRef = React.useRef<number>(0);
  const AUTO_SYNC_THROTTLE_MS = 10000; // 10 seconds - ensures faster sync of completed shifts to time entries

  // Series edit dialog state
  const [seriesDialogOpen, setSeriesDialogOpen] = React.useState(false);
  const [pendingSeriesAction, setPendingSeriesAction] = React.useState<{
    assignmentId: string;
    newEmployeeId: string;
    newDate: string;
    originalDate: string;
    orderTitle: string;
    isRecurring: boolean;
  } | null>(null);

  // Shift edit dialog state
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingShift, setEditingShift] = React.useState<ShiftAssignment | null>(null);
  const [selectedShiftDate, setSelectedShiftDate] = React.useState<string>("");

  // Drag overlay state
  const [draggedShift, setDraggedShift] = React.useState<ShiftAssignment | null>(null);

  // Track Alt key for copy mode
  const [isAltPressed, setIsAltPressed] = React.useState(false);

  // Auto-sync is now performed when the planning page loads
  // This ensures 1:1 relationship between completed shifts and time entries

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setIsAltPressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setIsAltPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const query = searchParams.get("query") || "";

  const { startDate, endDate, daysToDisplay } = React.useMemo(() => {
    let start: Date;
    let end: Date;
    switch (viewMode) {
      case "day":
        start = startOfDay(currentDate);
        end = endOfDay(currentDate);
        break;
      case "month":
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        break;
      case "week":
      default:
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
        break;
    }
    return { startDate: start, endDate: end, daysToDisplay: eachDayOfInterval({ start, end }) };
  }, [currentDate, viewMode]);

  const fetchData = React.useCallback(async (start: Date, end: Date, searchQuery: string, displayDays: Date[], currentFilters: FilterValues) => {
    // Increment fetch ID for cancellation check
    const currentFetchId = ++fetchIdRef.current;

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Early return if this fetch was cancelled
    if (currentFetchId !== fetchIdRef.current) return;

    if (user) {
      setCurrentUser(user);
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      const role = profile?.role as 'admin' | 'manager' | 'employee' | 'customer' || 'employee';
      setCurrentUserRole(role);
      setIsAdmin(role === "admin");
    }

    // Load bundesland from settings (default to HH if not found)
    const { settingsService } = await import('@/lib/services/settings-service');
    const code = await settingsService.getSetting('default_bundesland') || 'HH';
    setBundeslandCode(code);

    // Get holidays using batch processing
    const uniqueDates = [...new Set(displayDays.map(day => formatDateFns(day, 'yyyy-MM-dd')))];
    const holidayResults = await settingsService.checkMultipleHolidays(uniqueDates, code);

    if (currentFetchId !== fetchIdRef.current) return;
    setHolidaysMap(holidayResults);

    // Load objects and services (for filters) - only if not already loaded
    // Use ref instead of state to avoid dependency loops
    if (!staticDataLoadedRef.current.objectsServices) {
      const [objectsData, fetchedServices] = await Promise.all([
        supabase.from("objects").select("id, name, address, daily_schedules").order("name"),
        getServices()
      ]);

      if (currentFetchId !== fetchIdRef.current) return;

      if (objectsData.data) {
        setObjects(objectsData.data.map((o: any) => ({ id: o.id, name: o.name })));
        setAvailableObjects(objectsData.data.map((o: any) => ({
          id: o.id,
          name: o.name,
          address: o.address || undefined,
          daily_schedules: o.daily_schedules || undefined,
        })));
      }

      // Store services for shift dialog
      if (fetchedServices) {
        setAvailableServices(fetchedServices.map((s: any) => ({
          id: s.id,
          name: s.name,
        })));
        setServices(fetchedServices);
      }
      staticDataLoadedRef.current.objectsServices = true;
    }

    // Load static reference data only if not already loaded
    if (!staticDataLoadedRef.current.customers) {
      const { data: customersData } = await supabase
        .from("customers")
        .select("id, name")
        .order("name");

      if (currentFetchId !== fetchIdRef.current) return;

      if (customersData) {
        setAvailableCustomers(customersData.map((c: any) => ({
          id: c.id,
          name: c.name,
        })));
      }
      staticDataLoadedRef.current.customers = true;
    }

    if (!staticDataLoadedRef.current.orders) {
      const { data: ordersData } = await supabase
        .from("orders")
        .select(`
          id,
          title,
          object_id,
          objects(name),
          customers(name)
        `)
        .eq("status", "active")
        .order("title");

      if (currentFetchId !== fetchIdRef.current) return;

      if (ordersData) {
        const orders = ordersData.map((order: any) => ({
          id: order.id,
          title: order.title,
          object_id: order.object_id,
          object_name: order.objects?.name || null,
          customer_name: order.customers?.name || null,
        }));
        setAvailableOrders(orders);
      }
      staticDataLoadedRef.current.orders = true;
    }

    if (!staticDataLoadedRef.current.employees) {
      const { data: employeesData } = await supabase
        .from("employees")
        .select("id, first_name, last_name")
        .eq("status", "active")
        .order("first_name");

      if (currentFetchId !== fetchIdRef.current) return;

      if (employeesData) {
        const employees = employeesData.map((emp: any) => ({
          id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`.trim(),
        }));
        setAvailableEmployees(employees);
      }
      staticDataLoadedRef.current.employees = true;
    }

    const [result] = await Promise.all([
      getShiftPlanningData(start, end, {
        query: searchQuery,
        filters: {
          objects: currentFilters.objects,
          services: currentFilters.services,
          showAvailableOnly: currentFilters.showAvailableOnly,
        }
      }),
    ]);

    // Final cancellation check before updating state
    if (currentFetchId !== fetchIdRef.current) return;

    if (result?.success) {
      setPlanningPageData(result.data);
    } else {
      const errorMsg = result?.message || "Unbekannter Fehler beim Laden der Planungsdaten.";
      toast.error(errorMsg);
      console.error("Planning data error:", errorMsg);
    }

    // Auto-sync with throttle: Only run if more than 1 minute has passed since last sync
    const now = Date.now();
    if (now - lastAutoSyncRef.current > AUTO_SYNC_THROTTLE_MS) {
      lastAutoSyncRef.current = now;
      // This runs silently in the background without blocking the UI
      checkAndCompleteOverdueShifts().then(syncResult => {
        if (syncResult.success && syncResult.updated_count > 0) {
          console.log(`[Auto-Sync] ${syncResult.updated_count} shifts completed, ${syncResult.time_entries_created} time entries created`);
        }
      }).catch(err => {
        console.error("[Auto-Sync] Error:", err);
      });
    }

    setLoading(false);
  }, []); // Empty deps - no dependency loops!

  const refreshData = React.useCallback(() => {
    void fetchData(startDate, endDate, query, daysToDisplay, filters);
    router.refresh();
  }, [fetchData, startDate, endDate, query, daysToDisplay, filters, router]);

  // Load planning data
  React.useEffect(() => {
    fetchData(startDate, endDate, query, daysToDisplay, filters);
  }, [startDate, endDate, query, daysToDisplay, filters]);

  React.useEffect(() => {
    setMobileSelectedDate((previous) => {
      const prevKey = format(previous, "yyyy-MM-dd");
      const currentKey = format(currentDate, "yyyy-MM-dd");
      return prevKey === currentKey ? previous : currentDate;
    });
  }, [currentDate]);

  React.useEffect(() => {
    if (daysToDisplay.length === 0) {
      return;
    }

    setMobileSelectedDate((previous) => {
      const prevKey = format(previous, "yyyy-MM-dd");
      const matchingDay = daysToDisplay.find((day) => format(day, "yyyy-MM-dd") === prevKey);
      const nextDate = matchingDay ?? daysToDisplay[0];
      if (nextDate && format(nextDate, "yyyy-MM-dd") !== format(currentDate, "yyyy-MM-dd")) {
        setCurrentDate(startOfDay(nextDate));
      }
      return nextDate ? startOfDay(nextDate) : previous;
    });
  }, [daysToDisplay, currentDate]);

  const handleMobileDateChange = React.useCallback((date: Date) => {
    const normalizedDate = startOfDay(date);
    setMobileSelectedDate(normalizedDate);
    setCurrentDate(normalizedDate);
  }, []);

  const handleMobileViewModeChange = React.useCallback((mode: "day" | "week" | "month") => {
    setViewMode(mode);
    setCurrentDate((previous) => {
      const base = startOfDay(previous);
      if (mode === "month") {
        return startOfMonth(base);
      }
      if (mode === "week") {
        return startOfWeek(base, { weekStartsOn: 1 });
      }
      return base;
    });
    setMobileSelectedDate((previous) => {
      const base = startOfDay(previous);
      if (mode === "month") {
        return startOfMonth(base);
      }
      if (mode === "week") {
        return startOfWeek(base, { weekStartsOn: 1 });
      }
      return base;
    });
  }, []);

  const handleMobileShowUnassignedChange = React.useCallback((value: boolean) => {
    setShowUnassigned(value);
  }, []);

  const openOrderDialog = React.useCallback(() => {
    // TODO: Implement create order dialog
    console.log('Open create order dialog');
  }, []);

  const planningData = planningPageData?.planningData ?? {};
  const unassignedShifts = planningPageData?.unassignedShifts ?? [];
  const weekNumber = planningPageData?.weekNumber ?? 0;

  const mobileUnassignedCount = React.useMemo(() => {
    if (unassignedShifts.length === 0) {
      return 0;
    }
    const selectedKey = format(mobileSelectedDate, "yyyy-MM-dd");
    return unassignedShifts.filter((shift) => {
      if (!shift.shift_date) {
        return false;
      }
      try {
        return format(new Date(shift.shift_date), "yyyy-MM-dd") === selectedKey;
      } catch {
        return false;
      }
    }).length;
  }, [unassignedShifts, mobileSelectedDate]);

  const mobileWeekDays = React.useMemo(() => {
    if (!isMobile || viewMode === "month") {
      return daysToDisplay;
    }
    const weekStart = startOfWeek(mobileSelectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(mobileSelectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [isMobile, viewMode, mobileSelectedDate, daysToDisplay]);

  const selectedDateForMetrics = React.useMemo(
    () => (isMobile ? mobileSelectedDate : currentDate),
    [isMobile, mobileSelectedDate, currentDate],
  );

  const dateRangeForMetrics = React.useMemo(
    () => (isMobile ? mobileWeekDays : daysToDisplay),
    [isMobile, mobileWeekDays, daysToDisplay],
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const [newEmployeeId, newDate] = String(over.id).split("__");
    if (!newEmployeeId || !newDate) {
      return;
    }

    // Check if this is an unassigned order drag
    if (String(active.id).startsWith("unassigned__")) {
      const orderId = String(active.id).replace("unassigned__", "");
      toast.info(`Weise Einsatz zu...`);
      const result = await assignOrderToEmployee(orderId, newEmployeeId, newDate, null);
      if (result.success) {
        toast.success(result.message);
        refreshData();
      } else {
        toast.error(result.message);
      }
      return;
    }

    // Get shift data from draggable
    const shiftData = active.data.current as { shift?: ShiftAssignment } | undefined;
    const shift = shiftData?.shift;

    if (!shift) {
      return;
    }

    // Check if nothing would change
    const currentEmployeeId = shift.employees?.[0]?.employee_id;
    if (currentEmployeeId === newEmployeeId && shift.shift_date === newDate) {
      return;
    }

    // Copy mode: Alt+Drag creates a copy, keeping original shift
    if (isAltPressed) {
      toast.info("Kopiere Einsatz...");

      const result = await copyShift({
        sourceShiftId: shift.id,
        newEmployeeId,
        newDate,
        newStartTime: shift.start_time || undefined,
        newEndTime: shift.end_time || undefined,
      });

      if (result.success) {
        toast.success(result.message);
        refreshData();
      } else {
        toast.error(result.message);
      }
      return;
    }

    // Move mode: default behavior - remove from original, add to new
    // Check if this is a recurring shift that needs series handling
    const isTrulyRecurring = shift.is_recurring && !shift.is_detached_from_series && !!shift.assignment_id;

    if (isTrulyRecurring) {
      // Open dialog to ask how to handle the series
      toast.info("Serien-Einsatz...");
      setPendingSeriesAction({
        assignmentId: shift.assignment_id!,
        newEmployeeId,
        newDate,
        originalDate: shift.shift_date,
        orderTitle: shift.job_title,
        isRecurring: true,
      });
      setSeriesDialogOpen(true);
      return;
    }

    // Non-recurring or detached shift - move directly
    const result = await simpleReassignShift({
      shiftId: shift.id,
      newEmployeeId: currentEmployeeId === newEmployeeId ? undefined : newEmployeeId,
      newDate: newDate,
      newStartTime: shift.start_time || undefined,
      newEndTime: shift.end_time || undefined,
    });

    if (result.success) {
      toast.success(result.message);
      refreshData();
    } else {
      toast.error(result.message);
    }
  };

  const handleSeriesModeSelect = async (mode: DialogSeriesEditMode) => {
    setSeriesDialogOpen(false);
    if (!mode || !pendingSeriesAction) {
      setPendingSeriesAction(null);
      return;
    }

    const { assignmentId, newEmployeeId, newDate, originalDate } = pendingSeriesAction;

    if (mode === "single") {
      // For single mode: detach this shift and move it to new date/employee
      // Use simpleReassignShift - much simpler!
      toast.info("Verschiebe Einzeltermin...");

      // Get the shift from planning data
      const shift = findShiftByAssignment(assignmentId, originalDate);

      if (shift) {
        const result = await simpleReassignShift({
          shiftId: shift.id,
          newEmployeeId: newEmployeeId,
          newDate: newDate,
        });

        if (result.success) {
          toast.success(result.message);
          refreshData();
        } else {
          toast.error(result.message);
        }
      } else {
        toast.error("Einsatz nicht gefunden.");
      }
    } else {
      // For future/all modes: use reassignAssignment to update the series
      toast.info(mode === "future" ? "Aktualisiere Serie ab Datum..." : "Aktualisiere ganze Serie...");
      const targetDate = newDate;

      const result = await reassignAssignment(
        assignmentId,
        newEmployeeId,
        mode as AssignmentEditMode,
        targetDate
      );

      if (result.success) {
        toast.success(result.message);
        refreshData();
      } else {
        toast.error(result.message);
      }
    }

    setPendingSeriesAction(null);
  };

  // Helper to find shift by assignmentId and date
  const findShiftByAssignment = (assignmentId: string, date: string): ShiftAssignment | undefined => {
    for (const employee of Object.values(planningData)) {
      for (const dayData of Object.values(employee.schedule)) {
        const found = dayData.shifts.find(s => s.assignment_id === assignmentId && s.shift_date === date);
        if (found) return found;
      }
    }
    return undefined;
  };

  const handleEditShift = React.useCallback((shiftId: string, shift: any, date: string) => {
    setEditingShift(shift);
    setSelectedShiftDate(date);
    setEditDialogOpen(true);
  }, []);

  // Create shift dialog state
  const [createShiftDialogOpen, setCreateShiftDialogOpen] = React.useState(false);
  const [createShiftInitialDate, setCreateShiftInitialDate] = React.useState<string>("");
  const [createShiftInitialEmployee, setCreateShiftInitialEmployee] = React.useState<string>("");

  const handleCreateShift = React.useCallback((employeeId: string, date: string) => {
    setCreateShiftInitialDate(date);
    setCreateShiftInitialEmployee(employeeId);
    setCreateShiftDialogOpen(true);
  }, []);


  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active }) => {
        setActiveDragId(active.id as string);
        const shiftData = (active.data.current as { shift?: ShiftAssignment })?.shift;
        setDraggedShift(shiftData || null);
      }}
      onDragEnd={(event) => {
        setActiveDragId(null);
        setDraggedShift(null);
        handleDragEnd(event);
      }}
    >
      <div className="flex flex-col gap-8 p-4 md:p-8 h-full">
        {isMobile ? (
          <>
            <MobilePlanningToolbar
              currentDate={mobileSelectedDate}
              onDateChange={handleMobileDateChange}
              viewMode={viewMode}
              onViewModeChange={handleMobileViewModeChange}
              showUnassigned={showUnassigned}
              onShowUnassignedChange={handleMobileShowUnassignedChange}
              unassignedCount={mobileUnassignedCount}
              onCreateOrder={openOrderDialog}
            />
            <PlanningKpiSummary
              planningData={planningData}
              unassignedOrders={unassignedShifts}
              selectedDate={selectedDateForMetrics}
              dateRange={dateRangeForMetrics}
              isLoading={loading}
            />
            <div className="flex-1 min-h-0">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <MobilePlanningCalendar
                  planningData={planningData}
                  unassignedOrders={unassignedShifts}
                  weekDays={mobileWeekDays}
                  selectedDate={mobileSelectedDate}
                  showUnassigned={showUnassigned}
                  onActionSuccess={refreshData}
                  onSelectedDateChange={handleMobileDateChange}
                  viewMode={viewMode}
                  holidaysMap={holidaysMap}
                  onEditShift={handleEditShift}
                />
              )}
            </div>
          </>
        ) : (
          <>
            <PlanningToolbar
              currentDate={currentDate}
              onDateChange={(date) => setCurrentDate(startOfDay(date))}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showUnassigned={showUnassigned}
              onShowUnassignedChange={setShowUnassigned}
              currentUserId={currentUser?.id}
              isAdmin={isAdmin}
              onActionSuccess={refreshData}
              filters={filters}
              onFiltersChange={(newFilters) => {
                setFilters(newFilters);
                refreshData();
              }}
              objects={objects}
              services={services.map(s => ({ id: s.id, title: s.name, color: s.color }))}
              availableObjects={availableObjects}
              availableOrders={availableOrders}
              availableEmployees={availableEmployees}
            />
            <PlanningKpiSummary
              planningData={planningData}
              unassignedOrders={unassignedShifts}
              selectedDate={selectedDateForMetrics}
              dateRange={dateRangeForMetrics}
              isLoading={loading}
            />
            <div className="flex-1 min-h-0">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : viewMode === "month" ? (
                <PlanningCalendarMonth
                  planningData={planningData}
                  unassignedOrders={unassignedShifts}
                  weekDays={daysToDisplay}
                  activeDragId={activeDragId}
                  showUnassigned={showUnassigned}
                  onActionSuccess={refreshData}
                  weekNumber={weekNumber}
                  holidaysMap={holidaysMap}
                  showHiddenEmployees={showHiddenEmployees}
                  onShowHiddenEmployeesChange={setShowHiddenEmployees}
                />
              ) : (
                <PlanningCalendar
                  planningData={planningData}
                  unassignedOrders={unassignedShifts}
                  weekDays={daysToDisplay}
                  activeDragId={activeDragId}
                  showUnassigned={showUnassigned}
                  onActionSuccess={refreshData}
                  weekNumber={weekNumber}
                  holidaysMap={holidaysMap}
                  currentUserRole={currentUserRole}
                  services={services}
                  onEditShift={handleEditShift}
                  onCreateShift={handleCreateShift}
                  showHiddenEmployees={showHiddenEmployees}
                  onShowHiddenEmployeesChange={setShowHiddenEmployees}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Series Edit Mode Dialog */}
      <SeriesEditModeDialog
        open={seriesDialogOpen}
        onClose={() => {
          setSeriesDialogOpen(false);
          setPendingSeriesAction(null);
        }}
        onSelect={handleSeriesModeSelect}
        orderTitle={pendingSeriesAction?.orderTitle || ""}
        isRecurring={pendingSeriesAction?.isRecurring || false}
      />

      {/* Shift Edit Dialog */}
      <ShiftEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        shift={editingShift}
        onSuccess={refreshData}
        availableEmployees={Object.entries(planningData).map(([id, emp]) => ({
          id,
          name: emp.name,
        }))}
        onMoveToDate={async (date) => {
          if (editingShift?.id) {
            toast.info("Verschiebe Einsatz...");
            const result = await simpleReassignShift({
              shiftId: editingShift.id,
              newDate: date,
            });
            if (result.success) {
              toast.success(result.message);
              refreshData();
            } else {
              toast.error(result.message);
            }
          }
        }}
        onMoveToEmployee={async (employeeId, currentDate, newDate) => {
          if (editingShift?.id) {
            toast.info("Weise Einsatz neu zu...");
            const targetDate = newDate || currentDate;
            const result = await simpleReassignShift({
              shiftId: editingShift.id,
              newEmployeeId: employeeId,
              newDate: targetDate,
            });
            if (result.success) {
              toast.success(result.message);
              refreshData();
            } else {
              toast.error(result.message);
            }
          }
        }}
      />

      {/* Shift Create Dialog with Schedule Management */}
      <CreateShiftDialog
        open={createShiftDialogOpen}
        onOpenChange={setCreateShiftDialogOpen}
        onSuccess={refreshData}
        availableEmployees={availableEmployees}
        availableObjects={availableObjects}
        availableOrders={availableOrders}
        availableServices={availableServices}
        availableCustomers={availableCustomers}
      />

      {/* Drag Overlay for better visual feedback */}
      <DragOverlay>
        {draggedShift ? (
          <div className="bg-white rounded-lg shadow-lg border-2 border-primary/30 p-2 w-56 cursor-grabbing opacity-95">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Clock className="h-3 w-3" />
              <span>{draggedShift.start_time?.slice(0, 5) || '--:--'} - {draggedShift.end_time?.slice(0, 5) || '--:--'}</span>
            </div>
            <div className="font-medium text-sm truncate leading-tight">{draggedShift.job_title}</div>
            <div className="flex items-center gap-1 mt-1.5">
              <Badge variant="secondary" className="text-[10px] h-5">
                {draggedShift.service_title || 'Service'}
              </Badge>
              {draggedShift.is_team && (
                <Badge variant="outline" className="text-[10px] h-5">
                  {draggedShift.employees.length} Personen
                </Badge>
              )}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}