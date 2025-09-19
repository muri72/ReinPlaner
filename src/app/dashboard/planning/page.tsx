"use client";

import * as React from "react";
import { getPlanningDataForWeek, PlanningPageData } from "@/app/dashboard/planning/actions";
import { toast } from "sonner";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { PlanningToolbar } from "@/components/planning-toolbar";
import { PlanningCalendar } from "@/components/planning-calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { assignOrderToEmployee } from "./actions";
import { startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

export default function PlanningPage() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [planningPageData, setPlanningPageData] = React.useState<PlanningPageData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async (date: Date) => {
    setLoading(true);
    const result = await getPlanningDataForWeek(date);
    if (result.success) {
      setPlanningPageData(result.data);
    } else {
      toast.error(result.message);
      console.error(result.message);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchData(currentDate);
  }, [currentDate, fetchData]);

  const weekDays = React.useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

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
          fetchData(currentDate); // Re-fetch data after successful assignment
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
        />
        <div className="flex-grow min-h-0">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <PlanningCalendar
              planningData={planningPageData?.planningData || {}}
              unassignedOrders={planningPageData?.unassignedOrders || []}
              weekDays={weekDays}
              activeDragId={activeDragId}
            />
          )}
        </div>
      </div>
    </DndContext>
  );
}