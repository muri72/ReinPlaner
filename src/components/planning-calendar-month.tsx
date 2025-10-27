"use client";

import * as React from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getWeek, getDay } from "date-fns";
import { de } from "date-fns/locale";
import { getDateStyling, getHolidayTooltip } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PlanningData, UnassignedOrder } from "@/app/dashboard/planning/actions";
import { EmployeeEditDialog } from "./employee-edit-dialog";
import { AssignmentCard } from "./assignment-card";
import { DraggableOrderCard } from "./draggable-order-card";
import { useDroppable } from "@dnd-kit/core";

const absenceTypeTranslations: { [key: string]: string } = {
  vacation: "Urlaub",
  sick_leave: "Krankheit",
  training: "Weiterbildung",
  other: "Sonstiges",
};

const absenceTypeColors: { [key: string]: string } = {
  vacation: "bg-blue-500",
  sick_leave: "bg-yellow-500",
  training: "bg-purple-500",
  other: "bg-gray-500",
};

interface MonthDayCellProps {
  day: Date;
  monthStart: Date;
  employeeId: string;
  employee: any;
  activeDragId: string | null;
  onActionSuccess: () => void;
  unassignedOrders: UnassignedOrder[];
}

function MonthDayCell({ day, monthStart, employeeId, employee, activeDragId, onActionSuccess, unassignedOrders }: MonthDayCellProps) {
  const dateString = format(day, "yyyy-MM-dd");
  const dayData = employee.schedule[dateString];
  const droppableId = `${employeeId}__${dateString}`;
  const isCurrentMonth = isSameMonth(day, monthStart);
  const isCurrentDay = isToday(day);
  const [dayStyling, setDayStyling] = React.useState<{ 
    isWeekend: boolean; 
    isHoliday: boolean; 
    holidayName?: string;
    className: string;
  }>({ 
    isWeekend: false, 
    isHoliday: false, 
    holidayName: undefined,
    className: "" 
  });
  
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  React.useEffect(() => {
    getDateStyling(day).then((styling) => setDayStyling(styling));
  }, [day]);

  // Get unassigned orders for this day
  const ordersForDay = unassignedOrders.filter(
    (order) => order.due_date && format(new Date(order.due_date), "yyyy-MM-dd") === dateString
  );

  const totalAssignments = dayData?.assignments?.length || 0;
  const totalHours = dayData?.assignments?.reduce((sum: number, a: any) => sum + a.hours, 0) || 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[80px] p-1 border border-border/50 transition-all",
        !isCurrentMonth && "bg-muted/30 text-muted-foreground",
        isCurrentDay && "bg-primary/5 border-primary/30",
        isOver && "bg-primary/20 ring-1 ring-primary",
        dayData?.isAbsence && "bg-muted/50",
        isCurrentMonth && dayStyling.className,
        "hover:bg-accent/50"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={cn(
          "text-xs font-medium",
          isCurrentDay && "text-primary font-bold",
          isCurrentMonth && dayStyling.isHoliday && "text-red-700",
          isCurrentMonth && dayStyling.isWeekend && "text-blue-700"
        )}>
          {format(day, "d")}
        </span>
        {dayData?.isAbsence && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  absenceTypeColors[dayData.absenceType || 'other']
                )} />
              </TooltipTrigger>
              <TooltipContent>
                <p>{absenceTypeTranslations[dayData.absenceType || 'other']}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Holiday indicator */}
      {isCurrentMonth && dayStyling.isHoliday && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs text-red-600 font-medium truncate">
                {dayStyling.holidayName}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{dayStyling.holidayName}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Assignment summary */}
      {totalAssignments > 0 && (
        <div className="space-y-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                    {totalAssignments}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {totalHours.toFixed(1)}h
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-1 max-w-48">
                  {dayData.assignments.map((assignment: any) => (
                    <div key={assignment.id} className="flex items-center gap-1">
                      <span className="font-medium truncate">{assignment.title}</span>
                      <span className="text-muted-foreground">({assignment.hours.toFixed(1)}h)</span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Unassigned orders indicator */}
      {ordersForDay.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mt-1">
                <Badge variant="outline" className="text-xs px-1 py-0 h-4 border-orange-200 text-orange-600">
                  {ordersForDay.length} offen
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1 max-w-48">
                {ordersForDay.map((order) => (
                  <div key={order.id} className="truncate">
                    {order.title}
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

interface PlanningCalendarMonthProps {
  planningData: PlanningData;
  unassignedOrders: UnassignedOrder[];
  weekDays: Date[];
  activeDragId: string | null;
  showUnassigned: boolean;
  onActionSuccess: () => void;
  weekNumber: number;
}

export function PlanningCalendarMonth({ 
  planningData, 
  unassignedOrders, 
  weekDays, 
  activeDragId, 
  showUnassigned, 
  onActionSuccess, 
  weekNumber 
}: PlanningCalendarMonthProps) {
  const employeeIds = Object.keys(planningData);
  const monthStart = startOfMonth(weekDays[0]);
  const monthEnd = endOfMonth(weekDays[0]);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group days by week
  const weeks: (Date | null)[][] = [];
  let currentWeek: Date[] = [];
  
  for (let i = 0; i < monthDays.length; i++) {
    const day = monthDays[i];
    currentWeek.push(day);
    
    // Start new week on Monday (day 1) or when we reach the end of month
    if (getDay(day) === 0 || i === monthDays.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  }

  // Pad first week with empty days to start on Monday
  if (weeks.length > 0 && weeks[0].length < 7) {
    const firstDay = weeks[0][0];
    if (firstDay) {
      const dayOfWeek = getDay(firstDay);
      const paddingDays = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      for (let i = 0; i < paddingDays; i++) {
        weeks[0].unshift(null);
      }
    }
  }

  // Pad last week with empty days to end on Sunday
  if (weeks.length > 0 && weeks[weeks.length - 1].length < 7) {
    const lastWeek = weeks[weeks.length - 1];
    while (lastWeek.length < 7) {
      lastWeek.push(null);
    }
  }

  const dayHeaders = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  return (
    <div className="border rounded-lg shadow-neumorphic glassmorphism-card h-full overflow-auto custom-scrollbar">
      <div className="p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">
            {format(monthStart, "MMMM yyyy", { locale: de })}
          </h3>
          <p className="text-sm text-muted-foreground">
            Woche {weekNumber} • {employeeIds.length} Mitarbeiter
          </p>
        </div>

        {/* Unassigned orders summary */}
        {showUnassigned && unassignedOrders.length > 0 && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-orange-800">
                {unassignedOrders.length} unbesetzte Aufträge
              </span>
              <div className="flex gap-1">
                {unassignedOrders.slice(0, 3).map((order) => (
                  <Badge key={order.id} variant="outline" className="text-xs">
                    {order.title.length > 15 ? `${order.title.substring(0, 15)}...` : order.title}
                  </Badge>
                ))}
                {unassignedOrders.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{unassignedOrders.length - 3} mehr
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="space-y-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1">
            {dayHeaders.map((day, index) => {
              const isWeekend = index >= 5; // Saturday (5) and Sunday (6)
              return (
                <div key={day} className={cn(
                  "text-center text-xs font-semibold p-2",
                  isWeekend && "text-blue-600"
                )}>
                  {day}
                </div>
              );
            })}
          </div>

          {/* Employee rows */}
          {employeeIds.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Keine Mitarbeiter gefunden.
            </div>
          ) : (
            employeeIds.map((id) => {
              const employee = planningData[id];
              if (!employee) return null;

              return (
                <div key={id} className="space-y-2">
                  {/* Employee header */}
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={employee.raw.avatar_url} alt={employee.name} />
                      <AvatarFallback className="text-xs">
                        {employee.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <EmployeeEditDialog employee={employee.raw as any} onEmployeeUpdated={onActionSuccess}>
                      <div className="cursor-pointer hover:text-primary">
                        <span className="text-sm font-medium">{employee.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {employee.raw.job_title || 'Mitarbeiter'}
                        </span>
                      </div>
                    </EmployeeEditDialog>
                    <div className="ml-auto text-xs text-muted-foreground">
                      {employee.totalHoursPlanned.toFixed(1)}h / {employee.totalHoursAvailable.toFixed(1)}h
                    </div>
                  </div>

                  {/* Calendar days for this employee */}
                  <div className="grid grid-cols-7 gap-1">
                    {weeks.map((week: (Date | null)[], weekIndex: number) => (
                      <React.Fragment key={weekIndex}>
                        {week.map((day: Date | null, dayIndex: number) => (
                          <div key={`${weekIndex}-${dayIndex}`}>
                            {day ? (
                              <MonthDayCell
                                day={day}
                                monthStart={monthStart}
                                employeeId={id}
                                employee={employee}
                                activeDragId={activeDragId}
                                onActionSuccess={onActionSuccess}
                                unassignedOrders={unassignedOrders}
                              />
                            ) : (
                              <div className="min-h-[80px] border border-transparent" />
                            )}
                          </div>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}