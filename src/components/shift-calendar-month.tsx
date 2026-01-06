"use client";

import * as React from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ShiftPlanningData, UnassignedShift, ShiftAssignment } from "@/lib/actions/shift-planning";
import { ShiftCard } from "./shift-card";
import { useDroppable } from "@dnd-kit/core";
import { CircleDashed, Clock } from "lucide-react";

interface MonthDayCellProps {
  day: Date;
  monthStart: Date;
  shifts: ShiftAssignment[];
  unassignedOrders: UnassignedShift[];
  activeDragId: string | null;
  holidaysMap: { [key: string]: { name: string } | null };
}

function MonthDayCell({ day, monthStart, shifts, unassignedOrders, activeDragId, holidaysMap }: MonthDayCellProps) {
  const dateString = format(day, "yyyy-MM-dd");
  const droppableId = `date__${dateString}`;
  const isCurrentMonth = isSameMonth(day, monthStart);
  const isCurrentDay = isToday(day);

  // Use holidaysMap
  const holidayInfo = holidaysMap[dateString];
  const isWeekendDay = getDay(day) === 0 || getDay(day) === 6;

  let className = "";
  if (holidayInfo) {
    className = "bg-red-50 border-red-200 text-red-700";
  } else if (isWeekendDay) {
    className = "bg-blue-50 border-blue-200 text-blue-700";
  }

  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  // Get unassigned orders for this day
  const ordersForDay = unassignedOrders.filter(
    (shift) => shift.shift_date && format(new Date(shift.shift_date), "yyyy-MM-dd") === dateString
  );

  const totalAssignments = shifts.length;
  const totalHours = shifts.reduce((sum, a) => sum + a.estimated_hours, 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[120px] p-2 border border-border/50 transition-all relative",
        !isCurrentMonth && "bg-muted/30 text-muted-foreground",
        isCurrentDay && "bg-primary/5 border-primary/30",
        // Blue background when dragging over
        isOver && "bg-blue-100 border-blue-500 border-2 ring-2 ring-blue-400",
        isCurrentMonth && className,
        "hover:bg-accent/50"
      )}
    >
      <div className={cn("relative z-10", isOver && "opacity-50")}>
        <div className="flex items-center justify-between mb-1">
        <span className={cn(
          "text-xs font-medium",
          isCurrentDay && "text-primary font-bold",
          isCurrentMonth && holidayInfo && "text-red-700",
          isCurrentMonth && isWeekendDay && "text-blue-700"
        )}>
          {format(day, "d")}
        </span>

        {/* Summary badges */}
        {totalAssignments > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                  {totalAssignments}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-1 max-w-48">
                  <p className="font-medium">{totalAssignments} Einsätze ({totalHours.toFixed(1)}h)</p>
                  {shifts.map((shift) => (
                    <div key={shift.id} className="flex items-center gap-1">
                      <span className="font-medium truncate">{shift.job_title}</span>
                      <span className="text-muted-foreground">({shift.estimated_hours.toFixed(2)}h)</span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Holiday indicator */}
      {isCurrentMonth && holidayInfo && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs text-red-600 font-medium truncate mb-1">
                {holidayInfo.name}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{holidayInfo.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Unassigned orders indicator */}
      {ordersForDay.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mb-1">
                <Badge variant="outline" className="text-xs px-1 py-0 h-4 border-orange-200 text-orange-600">
                  {ordersForDay.length} offen
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1 max-w-48">
                <p className="font-medium">{ordersForDay.length} unbesetzte Einsätze</p>
                {ordersForDay.map((shift) => (
                  <div key={shift.id} className="truncate">
                    {shift.job_title}
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Shifts list */}
      <div className="space-y-1">
        {shifts.slice(0, 2).map((shift) => (
          <div key={shift.id} className="text-xs truncate">
            <span className="font-medium">{shift.job_title}</span>
            <span className="text-muted-foreground ml-1">
              ({shift.estimated_hours.toFixed(1)}h)
            </span>
          </div>
        ))}
        {shifts.length > 2 && (
          <div className="text-xs text-muted-foreground">
            +{shifts.length - 2} weitere
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

interface ShiftCalendarMonthProps {
  planningData: ShiftPlanningData;
  unassignedOrders: UnassignedShift[];
  weekDays: Date[];
  activeDragId: string | null;
  showUnassigned: boolean;
  onActionSuccess: () => void;
  weekNumber: number;
  holidaysMap: { [key: string]: { name: string } | null };
}

export function ShiftCalendarMonth({
  planningData,
  unassignedOrders,
  weekDays,
  activeDragId,
  showUnassigned,
  onActionSuccess,
  weekNumber,
  holidaysMap
}: ShiftCalendarMonthProps) {
  // Flatten all shifts from all employees
  const allShifts: { shift: ShiftAssignment; date: string }[] = [];

  Object.values(planningData).forEach((employee) => {
    Object.entries(employee.schedule).forEach(([date, dayData]) => {
      dayData.shifts.forEach((shift) => {
        allShifts.push({ shift, date });
      });
    });
  });

  // Group shifts by date
  const shiftsByDate: { [date: string]: ShiftAssignment[] } = {};
  allShifts.forEach(({ shift, date }) => {
    if (!shiftsByDate[date]) {
      shiftsByDate[date] = [];
    }
    shiftsByDate[date].push(shift);
  });

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

  // Calculate totals
  const totalShifts = allShifts.length;
  const totalHours = allShifts.reduce((sum, { shift }) => sum + shift.estimated_hours, 0);
  const totalUnassigned = unassignedOrders.length;

  return (
    <div className="border rounded-lg shadow-neumorphic glassmorphism-card h-full overflow-auto custom-scrollbar">
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {format(monthStart, "MMMM yyyy", { locale: de })}
            </h3>
            <p className="text-sm text-muted-foreground">
              Woche {weekNumber} • {totalShifts} Einsätze ({totalHours.toFixed(1)}h)
            </p>
          </div>

          {/* Summary badges */}
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {totalShifts} Einsätze
            </Badge>
            {showUnassigned && totalUnassigned > 0 && (
              <Badge variant="outline" className="text-xs border-orange-200 text-orange-600">
                <CircleDashed className="h-3 w-3 mr-1" />
                {totalUnassigned} offen
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {Object.keys(planningData).length} Mitarbeiter
            </Badge>
          </div>
        </div>

        {/* Unassigned orders summary */}
        {showUnassigned && totalUnassigned > 0 && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-orange-800">
                {totalUnassigned} unbesetzte Einsätze
              </span>
              <div className="flex gap-1">
                {unassignedOrders.slice(0, 3).map((shift) => (
                  <Badge key={shift.id} variant="outline" className="text-xs">
                    {shift.job_title.length > 15 ? `${shift.job_title.substring(0, 15)}...` : shift.job_title}
                  </Badge>
                ))}
                {totalUnassigned > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{totalUnassigned - 3} mehr
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

          {/* Calendar days */}
          <div className="space-y-1">
            {weeks.map((week: (Date | null)[], weekIndex: number) => (
              <React.Fragment key={weekIndex}>
                <div className="grid grid-cols-7 gap-1">
                  {week.map((day: Date | null, dayIndex: number) => (
                    <div key={`${weekIndex}-${dayIndex}`}>
                      {day ? (
                        <MonthDayCell
                          day={day}
                          monthStart={monthStart}
                          shifts={shiftsByDate[format(day, "yyyy-MM-dd")] || []}
                          unassignedOrders={unassignedOrders}
                          activeDragId={activeDragId}
                          holidaysMap={holidaysMap}
                        />
                      ) : (
                        <div className="min-h-[120px] border border-transparent" />
                      )}
                    </div>
                  ))}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Footer summary */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span>Geplante Einsätze: {totalShifts}</span>
            <span>•</span>
            <span>Gesamtstunden: {totalHours.toFixed(1)}h</span>
            <span>•</span>
            <span>Mitarbeiter: {Object.keys(planningData).length}</span>
            {showUnassigned && (
              <>
                <span>•</span>
                <span className="text-orange-600">Unbesetzt: {totalUnassigned}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
