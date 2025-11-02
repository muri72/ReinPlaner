"use client";

import * as React from "react";
import { getPlanningDataForRange, PlanningPageData, reassignSingleOrder } from "@/app/dashboard/planning/actions";
import { toast } from "sonner";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { PlanningToolbar } from "@/components/planning-toolbar";
import { PlanningCalendar } from "@/components/planning-calendar";
import { PlanningCalendarMonth } from "@/components/planning-calendar-month";
import { MobilePlanningToolbar } from "@/components/planning-toolbar-mobile";
import { MobilePlanningCalendar } from "@/components/planning-calendar-mobile";
import { PlanningKpiSummary } from "@/components/planning-kpi-summary";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderCreateDialog } from "@/components/order-create-dialog";
import { assignOrderToEmployee, reassignRecurringOrder } from "./actions";
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
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { RecurringEditDialog } from "@/components/recurring-edit-dialog";
import { useIsMobile } from "@/hooks/use-mobile";

interface PendingReassignment {
  assignmentId: string;
  originalDate: string;
  newEmployeeId: string;
  newDate: string;
}

export default function PlanningPage() {
  const [currentDate, setCurrentDate] = React.useState(() => startOfDay(new Date()));
  const [viewMode, setViewMode] = React.useState<"day" | "week" | "month">("week");
  const [showUnassigned, setShowUnassigned] = React.useState(true);
  const [planningPageData, setPlanningPageData] = React.useState<PlanningPageData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = React.useState(false);
  const [mobileSelectedDate, setMobileSelectedDate] = React.useState(() => startOfDay(new Date()));

  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const query = searchParams.get("query") || "";

  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = React.useState(false);
  const [pendingReassignment, setPendingReassignment] = React.useState<PendingReassignment | null>(null);

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

  const fetchData = React.useCallback(async (start: Date, end: Date, searchQuery: string) => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setIsAdmin(profile?.role === "admin");
    }

    const result = await getPlanningDataForRange(start, end, { query: searchQuery });
    if (result.success) {
      setPlanningPageData(result.data);
    } else {
      toast.error(result.message);
      console.error(result.message);
    }
    setLoading(false);
  }, []);

  const refreshData = React.useCallback(() => {
    void fetchData(startDate, endDate, query);
  }, [fetchData, startDate, endDate, query]);

  React.useEffect(() => {
    fetchData(startDate, endDate, query);
  }, [startDate, endDate, query, fetchData]);

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
    setIsOrderDialogOpen(true);
  }, []);

  const planningData = planningPageData?.planningData ?? {};
  const unassignedOrders = planningPageData?.unassignedOrders ?? [];
  const weekNumber = planningPageData?.weekNumber ?? 0;

  const mobileUnassignedCount = React.useMemo(() => {
    if (unassignedOrders.length === 0) {
      return 0;
    }
    const selectedKey = format(mobileSelectedDate, "yyyy-MM-dd");
    return unassignedOrders.filter((order) => {
      if (!order.due_date) {
        return false;
      }
      try {
        return format(new Date(order.due_date), "yyyy-MM-dd") === selectedKey;
      } catch {
        return false;
      }
    }).length;
  }, [unassignedOrders, mobileSelectedDate]);

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

    if (!over || active.id === over.id) return;

    const [newEmployeeId, newDate] = String(over.id).split("__");
    if (!newEmployeeId || !newDate) return;

    const [dragType, dragId] = String(active.id).split("__");

    if (dragType === "unassigned") {
      const orderId = dragId;
      toast.info(`Weise Auftrag zu...`);
      const result = await assignOrderToEmployee(orderId, newEmployeeId, newDate, null);
      if (result.success) {
        toast.success(result.message);
        refreshData();
      } else {
        toast.error(result.message);
      }
    } else if (dragType === "assignment") {
      const assignment = active.data.current?.assignment;
      if (!assignment) return;

      const assignmentId = assignment.id;
      const originalDate =
        Object.keys(planningData[newEmployeeId]?.schedule || {}).find((date) =>
          planningData[newEmployeeId]?.schedule[date]?.assignments.some((a) => a.id === assignmentId),
        ) || newDate;

      if (assignment.isRecurring) {
        setPendingReassignment({ assignmentId, originalDate, newEmployeeId, newDate });
        setIsRecurringDialogOpen(true);
      } else {
        toast.info("Verschiebe einmaligen Einsatz...");
        const result = await reassignSingleOrder(assignmentId, newEmployeeId, newDate);
        if (result.success) {
          toast.success(result.message);
          refreshData();
        } else {
          toast.error(result.message);
        }
      }
    }
  };

  const handleRecurringUpdate = async (updateType: "single" | "series") => {
    if (!pendingReassignment) return;

    toast.info(`Aktualisiere wiederkehrenden Auftrag...`);
    const result = await reassignRecurringOrder({ ...pendingReassignment, updateType });

    if (result.success) {
      toast.success(result.message);
      refreshData();
    } else {
      toast.error(result.message);
    }

    setPendingReassignment(null);
    setIsRecurringDialogOpen(false);
  };

  return (
    <DndContext onDragStart={({ active }) => setActiveDragId(active.id as string)} onDragEnd={handleDragEnd}>
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
              unassignedOrders={unassignedOrders}
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
                  unassignedOrders={unassignedOrders}
                  weekDays={mobileWeekDays}
                  selectedDate={mobileSelectedDate}
                  showUnassigned={showUnassigned}
                  onActionSuccess={refreshData}
                  onSelectedDateChange={handleMobileDateChange}
                  viewMode={viewMode}
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
            />
            <PlanningKpiSummary
              planningData={planningData}
              unassignedOrders={unassignedOrders}
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
                  unassignedOrders={unassignedOrders}
                  weekDays={daysToDisplay}
                  activeDragId={activeDragId}
                  showUnassigned={showUnassigned}
                  onActionSuccess={refreshData}
                  weekNumber={weekNumber}
                />
              ) : (
                <PlanningCalendar
                  planningData={planningData}
                  unassignedOrders={unassignedOrders}
                  weekDays={daysToDisplay}
                  activeDragId={activeDragId}
                  showUnassigned={showUnassigned}
                  onActionSuccess={refreshData}
                  weekNumber={weekNumber}
                />
              )}
            </div>
          </>
        )}
      </div>
      <OrderCreateDialog
        open={isOrderDialogOpen}
        onOpenChange={(open) => setIsOrderDialogOpen(open)}
        onOrderCreated={refreshData}
        hideTrigger
      />
      <RecurringEditDialog
        open={isRecurringDialogOpen}
        onOpenChange={setIsRecurringDialogOpen}
        onConfirmSingle={() => handleRecurringUpdate("single")}
        onConfirmSeries={() => handleRecurringUpdate("series")}
      />
    </DndContext>
  );
}