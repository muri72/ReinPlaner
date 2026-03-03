"use client";

import * as React from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getWeek, getDay } from "date-fns";
import { de } from "date-fns/locale";
import { getDateStyling, getHolidayTooltip } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { ShiftPlanningData, UnassignedShift } from "@/lib/actions/shift-planning";
import { EmployeeEditDialog } from "./employee-edit-dialog";
import { ShiftCard } from "./shift-card";
import { useDroppable } from "@dnd-kit/core";
import { absenceTypeConfig, typeTranslations } from "@/lib/absence-type-config";

interface MonthDayCellProps {
  day: Date;
  monthStart: Date;
  employeeId: string;
  employee: any;
  activeDragId: string | null;
  onActionSuccess: () => void;
  unassignedOrders: UnassignedShift[];
  holidaysMap: { [key: string]: { name: string } | null };
}

function MonthDayCell({ day, monthStart, employeeId, employee, activeDragId, onActionSuccess, unassignedOrders, holidaysMap }: MonthDayCellProps) {
  const dateString = format(day, "yyyy-MM-dd");
  const dayData = employee.schedule[dateString];
  const droppableId = `${employeeId}__${dateString}`;
  const isCurrentMonth = isSameMonth(day, monthStart);
  const isCurrentDay = isToday(day);

  // Use holidaysMap instead of getDateStyling
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

  const totalAssignments = dayData?.shifts?.length || 0;
  const totalHours = dayData?.shifts?.reduce((sum: number, a: any) => sum + a.estimated_hours, 0) || 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[80px] p-1 border border-border/50 transition-all relative",
        !isCurrentMonth && "bg-muted/30 text-muted-foreground",
        isCurrentDay && "ring-2 ring-red-500 ring-offset-1",
        // Blue background when dragging over
        isOver && "bg-blue-100 border-blue-500 border-2 ring-2 ring-blue-400",
        dayData?.isAbsence && "bg-muted/50",
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
        {dayData?.isAbsence && (dayData?.isAvailable || (dayData?.shifts?.length ?? 0) > 0) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                absenceTypeConfig[dayData.absenceType || 'other']?.bg || absenceTypeConfig.other.bg,
                absenceTypeConfig[dayData.absenceType || 'other']?.border || absenceTypeConfig.other.border,
                absenceTypeConfig[dayData.absenceType || 'other']?.text || absenceTypeConfig.other.text
              )}>
                {(() => {
                  const absenceType = dayData.absenceType || 'other';
                  const config = absenceTypeConfig[absenceType] || absenceTypeConfig.other;
                  const IconComponent = config.icon;
                  return <IconComponent className="h-3 w-3" />;
                })()}
                <span>{typeTranslations[dayData.absenceType || 'other'] || 'Abwesend'}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{typeTranslations[dayData.absenceType || 'other'] || 'Abwesend'}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Holiday indicator */}
      {isCurrentMonth && holidayInfo && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-xs text-red-600 font-medium truncate">
              {holidayInfo.name}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{holidayInfo.name}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Assignment summary */}
      {totalAssignments > 0 && (
        <div className="space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                  {totalAssignments}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {totalHours.toFixed(2)}h
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1 max-w-48">
                {dayData.shifts.map((shift: any) => (
                  <div key={shift.id} className="flex items-center gap-1">
                    <span className="font-medium truncate">{shift.job_title}</span>
                    <span className="text-muted-foreground">({shift.estimated_hours.toFixed(2)}h)</span>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Unassigned orders indicator */}
      {ordersForDay.length > 0 && (
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
              {ordersForDay.map((shift) => (
                <div key={shift.id} className="truncate">
                  {shift.job_title}
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
      </div>
    </div>
  );
}

interface PlanningCalendarMonthProps {
  planningData: ShiftPlanningData;
  unassignedOrders: UnassignedShift[];
  weekDays: Date[];
  activeDragId: string | null;
  showUnassigned: boolean;
  onActionSuccess: () => void;
  weekNumber: number;
  holidaysMap: { [key: string]: { name: string } | null };
  showHiddenEmployees?: boolean;
  onShowHiddenEmployeesChange?: (show: boolean) => void;
}

export function PlanningCalendarMonth({
  planningData,
  unassignedOrders,
  weekDays,
  activeDragId,
  showUnassigned,
  onActionSuccess,
  weekNumber,
  holidaysMap,
  showHiddenEmployees = false,
  onShowHiddenEmployeesChange,
}: PlanningCalendarMonthProps) {
  const employeeIds = Object.keys(planningData);
  const monthStart = startOfMonth(weekDays[0]);
  const monthEnd = endOfMonth(weekDays[0]);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calculate hidden employees (those with no shifts in the month)
  const { visibleEmployeeIds, hiddenEmployeeIds } = React.useMemo(() => {
    const visible: string[] = [];
    const hidden: string[] = [];

    for (const employeeId of employeeIds) {
      const employee = planningData[employeeId];
      if (!employee) continue;

      // Check if employee has any shifts OR absences in the month
      let hasVisibleContent = false;
      for (const [dateKey, dayData] of Object.entries(employee.schedule)) {
        if ((dayData.shifts && dayData.shifts.length > 0) || dayData.isAbsence) {
          hasVisibleContent = true;
          break;
        }
      }

      if (hasVisibleContent) {
        visible.push(employeeId);
      } else {
        hidden.push(employeeId);
      }
    }

    return { visibleEmployeeIds: visible, hiddenEmployeeIds: hidden };
  }, [employeeIds, planningData]);

  // Filter employee IDs based on showHiddenEmployees state
  const filteredEmployeeIds = React.useMemo(() => {
    return showHiddenEmployees ? employeeIds : visibleEmployeeIds;
  }, [employeeIds, visibleEmployeeIds, showHiddenEmployees]);

  // Calculate monthly hours for all employees (outside map to follow Rules of Hooks)
  // Monthly = weekly available × 4 (assuming 4 weeks per month)
  const allMonthlyHours = React.useMemo(() => {
    const result: { [employeeId: string]: { planned: number; available: number } } = {};
    for (const employeeId of employeeIds) {
      const employee = planningData[employeeId];
      if (!employee) continue;
      let planned = 0;
      // Sum up planned hours from all shifts in the schedule
      for (const [dateKey, dayData] of Object.entries(employee.schedule)) {
        if (dayData.shifts && dayData.shifts.length > 0) {
          planned += dayData.shifts.reduce((sum: number, shift: any) => sum + (shift.estimated_hours || 0), 0);
        }
      }
      // Monthly available = weekly available × 4 weeks
      const available = (employee.totalHoursAvailable || 0) * 4;
      result[employeeId] = { planned, available };
    }
    return result;
  }, [employeeIds, planningData]);

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
    <div className="border rounded-lg shadow-neumorphic glassmorphism-card h-full overflow-auto custom-scrollbar relative">
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {format(monthStart, "MMMM yyyy", { locale: de })}
            </h3>
            <p className="text-sm text-muted-foreground">
              Woche {weekNumber} • {visibleEmployeeIds.length} mit Einsätzen
              {hiddenEmployeeIds.length > 0 && (
                <span className="text-muted-foreground">/</span>
              )}
              {hiddenEmployeeIds.length > 0 && (
                <span className="text-amber-600"> {hiddenEmployeeIds.length} ohne</span>
              )}
            </p>
          </div>

          {/* Hide/Show hidden employees button */}
          {hiddenEmployeeIds.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onShowHiddenEmployeesChange?.(!showHiddenEmployees)}
            >
              {showHiddenEmployees ? (
                <Eye className="h-4 w-4 text-muted-foreground" />
              ) : (
                <EyeOff className="h-4 w-4 text-amber-600" />
              )}
            </Button>
          )}
        </div>

        {/* Unassigned orders summary */}
        {showUnassigned && unassignedOrders.length > 0 && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-orange-800">
                {unassignedOrders.length} unbesetzte Aufträge
              </span>
              <div className="flex gap-1">
                {unassignedOrders.slice(0, 3).map((shift) => (
                  <Badge key={shift.id} variant="outline" className="text-xs">
                    {shift.job_title.length > 15 ? `${shift.job_title.substring(0, 15)}...` : shift.job_title}
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
        <TooltipProvider delayDuration={200}>
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
          {filteredEmployeeIds.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Keine Mitarbeiter gefunden.
            </div>
          ) : (
            filteredEmployeeIds.map((id) => {
              const employee = planningData[id];
              if (!employee) return null;
              const monthlyHours = allMonthlyHours[id] || { planned: 0, available: 0 };

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
                    <div className="cursor-pointer hover:text-primary">
                      <EmployeeEditDialog employee={employee.raw as any} />
                      <span className="text-sm font-medium">{employee.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {employee.raw.job_title || 'Mitarbeiter'}
                      </span>
                    </div>

                    {/* Weekly workload */}
                    <div className="ml-auto flex items-center gap-3">
                      {/* Monthly workload */}
                      <TooltipProvider delayDuration={100} disableHoverableContent>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1">
                              <Progress
                                value={monthlyHours.available > 0 ? (monthlyHours.planned / monthlyHours.available) * 100 : 0}
                                className="h-2 w-16"
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                Mo: {monthlyHours.planned.toFixed(2)}h
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="z-[100]">
                            <div className="text-sm space-y-1">
                              <p>Monat: {monthlyHours.planned.toFixed(2)}h / {monthlyHours.available.toFixed(2)}h</p>
                              <p>Noch verfügbar: {(monthlyHours.available - monthlyHours.planned).toFixed(2)}h</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Weekly workload */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1">
                              <Progress
                                value={employee.totalHoursAvailable > 0 ? (employee.totalHoursPlanned / employee.totalHoursAvailable) * 100 : 0}
                                className="h-2 w-16"
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                Wo: {employee.totalHoursPlanned.toFixed(2)}h / {employee.totalHoursAvailable.toFixed(2)}h
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="z-[100]">
                            <div className="text-sm space-y-1">
                              <p>Woche: {employee.totalHoursPlanned.toFixed(2)}h / {employee.totalHoursAvailable.toFixed(2)}h</p>
                              <p>Noch verfügbar: {(employee.totalHoursAvailable - employee.totalHoursPlanned).toFixed(2)}h</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
                                holidaysMap={holidaysMap}
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
        </TooltipProvider>
      </div>
    </div>
  );
}