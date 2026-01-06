"use client";

import * as React from "react";
import { format, parseISO, isWeekend } from "date-fns";
import { de } from "date-fns/locale";
import { getDateStyling, getHolidayTooltip } from "@/lib/date-utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { UnassignedShift, ShiftPlanningData } from "@/lib/actions/shift-planning";
import { Service } from "@/app/dashboard/services/actions";
import { ShiftCard } from "./shift-card";
import { EmployeeEditDialog } from "./employee-edit-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { CircleDashed, Clock, UserX } from "lucide-react";

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

function DroppableCell({ id, children, isOver, isAvailable, day, holidaysMap }: {
  id: string;
  children: React.ReactNode;
  isOver?: boolean;
  isAvailable: boolean;
  day?: Date;
  holidaysMap: { [key: string]: { name: string } | null };
}) {
  const { setNodeRef, isOver: dndIsOver } = useDroppable({ id });
  const isOverCell = isOver ?? dndIsOver;

  // Memoize styling calculations
  const styling = React.useMemo(() => {
    if (day) {
      const dayKey = format(day, "yyyy-MM-dd");
      const holidayInfo = holidaysMap[dayKey];

      if (holidayInfo) {
        return "bg-red-50 border-red-200 text-red-700";
      } else if (isWeekend(day)) {
        return "bg-blue-50 border-blue-200 text-blue-700";
      }
    }
    return "";
  }, [day, holidaysMap]);

  return (
    <TableCell
      ref={setNodeRef}
      className={cn(
        "p-1 border h-24 align-top relative transition-all duration-200",
        // Blue background when dragging over - clear visual feedback
        isOverCell && "bg-blue-100 border-blue-500 border-2 ring-2 ring-blue-400",
        // Unavailable days have striped pattern
        !isAvailable && !isOverCell && "bg-muted/50 bg-[repeating-linear-gradient(-45deg,transparent,transparent_4px,hsl(var(--border))_4px,hsl(var(--border))_5px)]",
        styling
      )}
    >
      <div className={cn("h-full w-full relative z-10", isOverCell && "opacity-50")}>{children}</div>
    </TableCell>
  );
}

interface PlanningCalendarProps {
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
  onEditShift?: (shiftId: string, shift: any, date: string) => void;
}

export function PlanningCalendar({ planningData, unassignedOrders, weekDays, activeDragId, showUnassigned, onActionSuccess, weekNumber, holidaysMap, currentUserRole = 'employee', services, onEditShift }: PlanningCalendarProps) {
  const employeeIds = Object.keys(planningData);
  const canManageSubstitutions = currentUserRole === 'admin' || currentUserRole === 'manager';

  // Build a map of all team members per order for team display in ShiftCard
  // Memoize to avoid recalculation on every render
  const orderTeamMembersMap = React.useMemo(() => {
    const map: Record<string, Array<{ employee_id: string; employee_name: string; avatar_url?: string }>> = {};

    for (const employee of Object.values(planningData)) {
      for (const dayData of Object.values(employee.schedule)) {
        if (!dayData.shifts?.length) continue;

        for (const shift of dayData.shifts) {
          const orderId = shift.order_id;
          if (!orderId || !shift.employees?.length) continue;

          if (!map[orderId]) {
            map[orderId] = [];
          }

          // Add unique team members
          for (const emp of shift.employees) {
            const exists = map[orderId].some(m => m.employee_id === emp.employee_id);
            if (!exists) {
              map[orderId].push({
                employee_id: emp.employee_id,
                employee_name: emp.employee_name,
                avatar_url: emp.avatar_url
              });
            }
          }
        }
      }
    }

    return map;
  }, [planningData]);

  return (
    <div className="border rounded-lg shadow-neumorphic glassmorphism-card h-full overflow-auto custom-scrollbar">
      <Table className="min-w-full border-collapse table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-card z-20 w-[250px] text-sm" rowSpan={2}>Mitarbeiter</TableHead>
            <TableHead colSpan={weekDays.length} className="text-center text-sm font-semibold border-b">
              Woche {weekNumber}
            </TableHead>
          </TableRow>
          <TableRow>
            {weekDays.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const holidayInfo = holidaysMap[dayKey];
              return (
                <TableHead key={day.toString()} className="text-center text-sm w-[120px] min-w-[120px]">
                  <div>
                    {format(day, "E dd.", { locale: de })}
                    {holidayInfo && (
                      <div className="text-xs text-red-600 font-medium">{holidayInfo.name}</div>
                    )}
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Unassigned Orders Row */}
          {showUnassigned && (
            <TableRow className="bg-amber-50/50">
              <TableCell className="font-semibold sticky left-0 bg-amber-50 z-10 align-top">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-amber-100">
                    <CircleDashed className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-sm font-medium">Unbesetzte Einsätze</span>
                    <p className="text-xs text-muted-foreground">Noch nicht zugewiesen</p>
                  </div>
                </div>
              </TableCell>
              {weekDays.map((day) => {
                const dateString = format(day, "yyyy-MM-dd");
                const ordersForDay = unassignedOrders.filter(
                  (shift) => shift.shift_date && format(parseISO(shift.shift_date), "yyyy-MM-dd") === dateString
                );
                const droppableId = `unassigned__${dateString}`;
                return (
                  <DroppableCell
                    key={dateString}
                    id={droppableId}
                    isAvailable={true}
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
                  </DroppableCell>
                );
              })}
            </TableRow>
          )}

          {/* Employee Rows */}
          {employeeIds.length === 0 ? (
            <TableRow>
              <TableCell colSpan={weekDays.length + 1} className="text-center text-muted-foreground h-24">
                Keine Mitarbeiter gefunden.
              </TableCell>
            </TableRow>
          ) : (
            employeeIds.map(id => {
              const employee = planningData[id];
              if (!employee) return null;
              const available = employee.totalHoursAvailable - employee.totalHoursPlanned;
              return (
                <TableRow key={id}>
                  <TableCell className="font-normal sticky left-0 bg-card z-10 align-top p-2 w-[250px]">
                    <div className="flex items-start gap-2">
                      <Avatar>
                        <AvatarImage src={employee.raw.avatar_url} alt={employee.name} />
                        <AvatarFallback>{employee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="text-sm font-semibold cursor-pointer hover:text-primary">
                          <EmployeeEditDialog employee={employee.raw as any} />
                          {employee.name}
                        </div>
                        <p className="text-xs text-muted-foreground">{employee.raw.job_title || 'Mitarbeiter'}</p>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="mt-2 space-y-1">
                                <Progress
                                  value={employee.totalHoursAvailable > 0 ? (employee.totalHoursPlanned / employee.totalHoursAvailable) * 100 : 0}
                                  className="h-2"
                                />
                                <p className="text-xs text-muted-foreground">
                                  {employee.totalHoursPlanned.toFixed(1)}h / {employee.totalHoursAvailable.toFixed(1)}h
                                </p>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm space-y-1">
                                <p>Eingeplant (Woche): {employee.totalHoursPlanned.toFixed(2)}h</p>
                                <p>Verfügbar (Woche): {employee.totalHoursAvailable.toFixed(2)}h</p>
                                <p>Noch verfügbar: {available.toFixed(2)}h</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </TableCell>
                  {weekDays.map((day) => {
                    const dateString = format(day, "yyyy-MM-dd");
                    const dayData = employee.schedule[dateString];
                    const droppableId = `${id}__${dateString}`;

                    if (!dayData) return <TableCell key={dateString}></TableCell>;

                    if (dayData.isAbsence) {
                      return (
                        <TableCell key={dateString} className="p-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={cn(
                                  "w-full h-full flex items-center justify-center font-semibold text-xs sm:text-sm text-white",
                                  absenceTypeColors[dayData.absenceType || 'other']
                                )}>
                                  {absenceTypeTranslations[dayData.absenceType || 'other']}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent><p>{absenceTypeTranslations[dayData.absenceType || 'other']}</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      );
                    }

                    return (
                      <DroppableCell
                        key={dateString}
                        id={droppableId}
                        isAvailable={dayData.isAvailable || dayData.shifts.length > 0}
                        day={day}
                        holidaysMap={holidaysMap}
                      >
                        <div className="space-y-1">
                          {dayData.shifts.map((shift) => (
                            <ShiftCard
                              key={shift.id}
                              shift={shift}
                              onSuccess={onActionSuccess}
                              teamMembers={shift.order_id ? orderTeamMembersMap[shift.order_id] : shift.employees}
                              onEdit={onEditShift ? (id) => onEditShift(id, shift, dateString) : undefined}
                            />
                          ))}
                        </div>
                      </DroppableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}