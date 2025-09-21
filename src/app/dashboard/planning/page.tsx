"use client";

import * as React from "react";
import { getPlanningDataForRange, PlanningPageData } from "@/app/dashboard/planning/actions";
import { toast } from "sonner";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { PlanningToolbar } from "@/components/planning-toolbar";
import { PlanningCalendar } from "@/components/planning-calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { assignOrderToEmployee } from "./actions";
import { startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { createClient } from "@/lib/supabase/client"; // Import supabase client

export default function PlanningPage() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [viewMode, setViewMode] = React.useState<'day' | 'week' | 'month'>('week');
  const [showUnassigned, setShowUnassigned] = React.useState(true);
  const [planningPageData, setPlanningPageData] = React.useState<PlanningPageData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);

  const { startDate, endDate, daysToDisplay } = React.useMemo(() => {
    let start, end;
    switch (viewMode) {
      case 'day':
        start = startOfDay(currentDate);
        end = endOfDay(currentDate);
        break;
      case 'month':
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        break;
      case 'week':
      default:
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
        break;
    }
    return { startDate: start, endDate: end, daysToDisplay: eachDayOfInterval({ start, end }) };
  }, [currentDate, viewMode]);

  const fetchData = React.useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setIsAdmin(profile?.role === 'admin');
    }

    const result = await getPlanningDataForRange(start, end);
    if (result.success) {
      setPlanningPageData(result.data);
    } else {
      toast.error(result.message);
      console.error(result.message);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchData(startDate, endDate);
  }, [startDate, endDate, fetchData]);

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const orderId = active.id as string;
      const [employeeId, dateString] = (over.id as string).split('__');

      if (employeeId && dateString && employeeId !== 'unassigned') {
        toast.info(`Weise Auftrag "${orderId}" zu...`);
        const result = await assignOrderToEmployee(orderId, employeeId, dateString, null);
        if (result.success) {
          toast.success(result.message);
          fetchData(startDate, endDate); // Re-fetch data after successful assignment
        } else {
          toast.error(result.message);
        }
      }
    }
  };

  return (
    <DndContext
      onDragStart={({ active }) => setActiveDragId(active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <div className="p-4 md:p-8 space-y-4 h-full flex flex-col">
        <PlanningToolbar
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showUnassigned={showUnassigned}
          onShowUnassignedChange={setShowUnassigned}
          currentUserId={currentUser?.id}
          isAdmin={isAdmin}
          onActionSuccess={() => fetchData(startDate, endDate)}
        />
        <div className="flex-grow min-h-0">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <PlanningCalendar
              planningData={planningPageData?.planningData || {}}
              unassignedOrders={planningPageData?.unassignedOrders || []}
              weekDays={daysToDisplay}
              activeDragId={activeDragId}
              showUnassigned={showUnassigned}
            />
          )}
        </div>
      </div>
    </DndContext>
  );
}