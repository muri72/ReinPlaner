"use client";

import * as React from "react";
import { getPlanningDataForRange, PlanningPageData, reassignSingleOrder } from "@/app/dashboard/planning/actions";
import { toast } from "sonner";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { PlanningToolbar } from "@/components/planning-toolbar";
import { PlanningCalendar } from "@/components/planning-calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { assignOrderToEmployee, reassignRecurringOrder } from "./actions";
import { startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { createClient } from "@/lib/supabase/client"; // Import supabase client
import { useSearchParams } from "next/navigation";
import { RecurringEditDialog } from "@/components/recurring-edit-dialog";

interface PendingReassignment {
  assignmentId: string;
  originalDate: string;
  newEmployeeId: string;
  newDate: string;
}

export default function PlanningPage() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [viewMode, setViewMode] = React.useState<'day' | 'week' | 'month'>('week');
  const [showUnassigned, setShowUnassigned] = React.useState(true);
  const [planningPageData, setPlanningPageData] = React.useState<PlanningPageData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const searchParams = useSearchParams();
  const query = searchParams.get('query') || '';

  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = React.useState(false);
  const [pendingReassignment, setPendingReassignment] = React.useState<PendingReassignment | null>(null);

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

  const fetchData = React.useCallback(async (start: Date, end: Date, searchQuery: string) => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setIsAdmin(profile?.role === 'admin');
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

  React.useEffect(() => {
    fetchData(startDate, endDate, query);
  }, [startDate, endDate, query, fetchData]);

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
  
    if (!over || active.id === over.id) return;
  
    const [newEmployeeId, newDate] = (over.id as string).split('__');
    if (!newEmployeeId || !newDate) return;
  
    const [dragType, dragId] = (active.id as string).split('__');
  
    if (dragType === 'unassigned') {
      // Handle dragging an unassigned order
      const orderId = dragId;
      toast.info(`Weise Auftrag zu...`);
      const result = await assignOrderToEmployee(orderId, newEmployeeId, newDate, null);
      if (result.success) {
        toast.success(result.message);
        fetchData(startDate, endDate, query);
      } else {
        toast.error(result.message);
      }
    } else if (dragType === 'assignment') {
      // Handle dragging an existing assignment
      const assignment = active.data.current?.assignment;
      if (!assignment) return;
  
      const assignmentId = assignment.id;
      const originalDate = Object.keys(planningPageData?.planningData[newEmployeeId]?.schedule || {}).find(date => 
        planningPageData?.planningData[newEmployeeId]?.schedule[date]?.assignments.some(a => a.id === assignmentId)
      ) || newDate; // Fallback to newDate if not found
  
      if (assignment.isRecurring) {
        setPendingReassignment({ assignmentId, originalDate, newEmployeeId, newDate });
        setIsRecurringDialogOpen(true);
      } else {
        // Handle non-recurring assignment move
        toast.info("Verschiebe einmaligen Einsatz...");
        const result = await reassignSingleOrder(assignmentId, newEmployeeId, newDate);
        if (result.success) {
          toast.success(result.message);
          fetchData(startDate, endDate, query);
        } else {
          toast.error(result.message);
        }
      }
    }
  };

  const handleRecurringUpdate = async (updateType: 'single' | 'series') => {
    if (!pendingReassignment) return;
    
    toast.info(`Aktualisiere wiederkehrenden Auftrag...`);
    const result = await reassignRecurringOrder({ ...pendingReassignment, updateType });
    
    if (result.success) {
      toast.success(result.message);
      fetchData(startDate, endDate, query);
    } else {
      toast.error(result.message);
    }
    
    setPendingReassignment(null);
    setIsRecurringDialogOpen(false);
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
          onActionSuccess={() => fetchData(startDate, endDate, query)}
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
              onActionSuccess={() => fetchData(startDate, endDate, query)}
              weekNumber={planningPageData?.weekNumber || 0}
            />
          )}
        </div>
      </div>
      <RecurringEditDialog
        open={isRecurringDialogOpen}
        onOpenChange={setIsRecurringDialogOpen}
        onConfirmSingle={() => handleRecurringUpdate('single')}
        onConfirmSeries={() => handleRecurringUpdate('series')}
      />
    </DndContext>
  );
}