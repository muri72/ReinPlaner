"use client";

import * as React from "react";
import { format, parseISO, isWeekend } from "date-fns";
import { de } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { UnassignedShift, ShiftPlanningData, ShiftAssignment } from "@/lib/actions/shift-planning";
import { Service } from "@/app/dashboard/services/actions";
import { ShiftCard } from "./shift-card";
import { CircleDashed, Clock, UserX } from "lucide-react";

function DroppableDateCell({ id, children, isOver, day, holidaysMap }: {
  id: string;
  children: React.ReactNode;
  isOver: boolean;
  day?: Date;
  holidaysMap: { [key: string]: { name: string } | null };
}) {
  const { setNodeRef } = useDroppable({ id });

  // Get styling based on holidaysMap and weekend check
  let className = "";
  if (day) {
    const dayKey = format(day, "yyyy-MM-dd");
    const holidayInfo = holidaysMap[dayKey];

    if (holidayInfo) {
      // Holiday styling
      className = "bg-red-50 border-red-200 text-red-700";
    } else if (isWeekend(day)) {
      // Weekend styling
      className = "bg-blue-50 border-blue-200 text-blue-700";
    }
  }

  return (
    <TableCell
      ref={setNodeRef}
      className={cn(
        "p-2 border h-48 align-top relative transition-all duration-200",
        // Blue background when dragging over - clear visual feedback
        isOver && "bg-blue-100 border-blue-500 border-2 ring-2 ring-blue-400",
        className
      )}
    >
      <div className={cn("h-full w-full relative z-10", isOver && "opacity-50")}>{children}</div>
    </TableCell>
  );
}

interface ShiftCalendarProps {
  planningData: ShiftPlanningData;
  unassignedOrders: UnassignedShift[];
  weekDays: Date[];
  activeDragId: string | null;
  showUnassigned: boolean;
  onActionSuccess: () => void;
  weekNumber: number;
  holidaysMap: { [key: string]: { name: string } | null };
  currentUserRole?: 'admin' | 'manager' | 'employee' | 'customer';
  services: Service[];
}

export function ShiftCalendar({
  planningData,
  unassignedOrders,
  weekDays,
  activeDragId,
  showUnassigned,
  onActionSuccess,
  weekNumber,
  holidaysMap,
  currentUserRole = 'employee',
  services
}: ShiftCalendarProps) {
  // Flatten all shifts from all employees
  const allShifts: { shift: ShiftAssignment; date: string }[] = [];

  Object.values(planningData).forEach((employee) => {
    Object.entries(employee.schedule).forEach(([date, dayData]) => {
      dayData.shifts.forEach((shift) => {
        allShifts.push({ shift, date });
      });
    });
  });

  // Sort shifts by time
  allShifts.sort((a, b) => {
    if (!a.shift.start_time || !b.shift.start_time) return 0;
    return a.shift.start_time.localeCompare(b.shift.start_time);
  });

  // Group shifts by date
  const shiftsByDate: { [date: string]: ShiftAssignment[] } = {};
  allShifts.forEach(({ shift, date }) => {
    if (!shiftsByDate[date]) {
      shiftsByDate[date] = [];
    }
    shiftsByDate[date].push(shift);
  });

  return (
    <div className="border rounded-lg shadow-neumorphic glassmorphism-card h-full overflow-auto custom-scrollbar">
      <Table className="min-w-full border-collapse table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="text-center text-sm font-semibold border-b" colSpan={weekDays.length}>
              Woche {weekNumber}
            </TableHead>
          </TableRow>
          <TableRow>
            {weekDays.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const holidayInfo = holidaysMap[dayKey];
              const shiftsForDay = shiftsByDate[dayKey] || [];
              const unassignedForDay = unassignedOrders.filter(
                (shift) => shift.shift_date && format(parseISO(shift.shift_date), "yyyy-MM-dd") === dayKey
              );

              return (
                <TableHead key={day.toString()} className="text-center text-sm w-[180px] min-w-[180px] border-r last:border-r-0">
                  <div className="space-y-1">
                    <div className="font-semibold">
                      {format(day, "E dd.", { locale: de })}
                    </div>
                    {holidayInfo && (
                      <div className="text-xs text-red-600 font-medium">{holidayInfo.name}</div>
                    )}
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <span>{shiftsForDay.length} Einsätze</span>
                      {unassignedForDay.length > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                          {unassignedForDay.length} offen
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Unassigned Orders Section */}
          {showUnassigned && (
            <TableRow className="bg-amber-50/50">
              <TableCell colSpan={weekDays.length} className="font-semibold align-top p-3 border-b-2 border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-full bg-amber-100">
                    <CircleDashed className="h-4 w-4 text-amber-600" />
                  </div>
                  <span className="text-sm font-medium">Unbesetzte Einsätze</span>
                </div>
              </TableCell>
            </TableRow>
          )}

          {/* Unassigned Orders by Day */}
          {showUnassigned && (
            <TableRow className="bg-amber-50/30">
              {weekDays.map((day) => {
                const dateString = format(day, "yyyy-MM-dd");
                const ordersForDay = unassignedOrders.filter(
                  (shift) => shift.shift_date && format(parseISO(shift.shift_date), "yyyy-MM-dd") === dateString
                );
                const droppableId = `unassigned__${dateString}`;
                return (
                  <DroppableDateCell
                    key={dateString}
                    id={droppableId}
                    isOver={activeDragId !== null && droppableId === (activeDragId as string)}
                    day={day}
                    holidaysMap={holidaysMap}
                  >
                    <div className="space-y-1">
                      {ordersForDay.map((shift) => (
                        <TooltipProvider key={shift.id} delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="p-2 rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer">
                                <div className="flex items-center gap-1.5">
                                  <UserX className="h-3 w-3 text-amber-600 shrink-0" />
                                  <span className="text-sm font-medium truncate">{shift.job_title}</span>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  {shift.estimated_hours && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {shift.estimated_hours}h
                                    </span>
                                  )}
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">{shift.service_title || 'N/A'}</Badge>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="font-medium">{shift.job_title}</p>
                              <p className="text-xs text-muted-foreground">Ziehen Sie diesen Einsatz auf einen Mitarbeiter</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </DroppableDateCell>
                );
              })}
            </TableRow>
          )}

          {/* Scheduled Shifts Section */}
          <TableRow>
            <TableCell colSpan={weekDays.length} className="font-semibold align-top p-3 border-b">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-green-100">
                  <Clock className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm font-medium">Geplante Einsätze</span>
              </div>
            </TableCell>
          </TableRow>

          {/* Shifts by Day */}
          <TableRow>
            {weekDays.map((day) => {
              const dateString = format(day, "yyyy-MM-dd");
              const shiftsForDay = shiftsByDate[dateString] || [];
              const droppableId = `date__${dateString}`;

              return (
                <DroppableDateCell
                  key={dateString}
                  id={droppableId}
                  isOver={activeDragId !== null && droppableId === (activeDragId as string)}
                  day={day}
                  holidaysMap={holidaysMap}
                >
                  <div className="space-y-1">
                    {shiftsForDay.length === 0 ? (
                      <div className="text-xs text-muted-foreground italic">Keine Einsätze</div>
                    ) : (
                      shiftsForDay.map((shift) => (
                        <ShiftCard
                          key={shift.id}
                          shift={shift}
                          onSuccess={onActionSuccess}
                        />
                      ))
                    )}
                  </div>
                </DroppableDateCell>
              );
            })}
          </TableRow>

          {/* Summary Row */}
          <TableRow className="bg-muted/30">
            <TableCell colSpan={weekDays.length} className="text-center text-xs text-muted-foreground p-2">
              <div className="flex items-center justify-center gap-4">
                <span>Gesamt: {allShifts.length} Einsätze</span>
                <span>•</span>
                <span>Unbesetzt: {unassignedOrders.length}</span>
                <span>•</span>
                <span>
                  Mitarbeiter: {Object.keys(planningData).length}
                </span>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
