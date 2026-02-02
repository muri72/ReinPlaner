"use client";

import * as React from "react";
import { format, parseISO, isWeekend, isToday, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { getDateStyling, getHolidayTooltip } from "@/lib/date-utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { UnassignedShift, ShiftPlanningData, ShiftAssignment } from "@/lib/actions/shift-planning";
import { Service } from "@/app/dashboard/services/actions";
import { ShiftCard } from "./shift-card";
import { EmployeeEditDialog } from "./employee-edit-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CircleDashed, Clock, UserX, Eye, EyeOff, Users, Plus, CalendarX, MoreHorizontal } from "lucide-react";
import { absenceTypeConfig, typeTranslations } from "@/lib/absence-type-config";

interface HoverAddShiftZoneProps {
  employeeId: string;
  date: string;
  onCreateShift: (employeeId: string, date: string) => void;
}

function HoverAddShiftZone({ employeeId, date, onCreateShift }: HoverAddShiftZoneProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      className="absolute top-0 right-0 z-10 transition-opacity duration-150 -mt-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateShift(employeeId, date);
              }}
              className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center",
                "bg-muted/80 hover:bg-primary text-muted-foreground hover:text-primary-foreground",
                "border border-border/50 backdrop-blur-sm",
                "transition-all duration-150 shadow-sm"
              )}
            >
              <Plus className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Einsatz erstellen</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function DroppableCell({ id, children, isOver, isAvailable, day, holidaysMap, onCreateShift, employeeId, dateString, isTodayColumn, absenceBar }: {
  id: string;
  children: React.ReactNode;
  isOver?: boolean;
  isAvailable: boolean;
  day?: Date;
  holidaysMap: { [key: string]: { name: string } | null };
  onCreateShift?: (employeeId: string, date: string) => void;
  employeeId?: string;
  dateString?: string;
  isTodayColumn?: boolean;
  absenceBar?: React.ReactNode;
}) {
  const isTodayCheck = day ? isToday(day) : false;
  const effectiveIsTodayColumn = isTodayColumn ?? isTodayCheck;
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
        "p-1 border h-24 align-top relative transition-all duration-200 group",
        // Blue background when dragging over - clear visual feedback
        isOverCell && "bg-blue-100 border-blue-500 border-2 ring-2 ring-blue-400",
        // Unavailable days have striped pattern
        !isAvailable && !isOverCell && "bg-muted/50 bg-[repeating-linear-gradient(-45deg,transparent,transparent_4px,hsl(var(--border))_4px,hsl(var(--border))_5px)]",
        styling,
        // Red ring for today's column
        effectiveIsTodayColumn && "ring-2 ring-red-500 ring-offset-1"
      )}
    >
      {absenceBar}
      <div className={cn("h-full w-full relative z-10", isOverCell && "opacity-50")}>
        {children}
      </div>
      {/* Hover Add Shift Zone - REMOVED per user request */}
      {/* {onCreateShift && employeeId && dateString && (
        <HoverAddShiftZone
          employeeId={employeeId}
          date={dateString}
          onCreateShift={onCreateShift}
        />
      )} */}
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
  onCreateShift?: (employeeId: string, date: string) => void;
  showHiddenEmployees?: boolean;
  onShowHiddenEmployeesChange?: (show: boolean) => void;
}

export function PlanningCalendar({
  planningData,
  unassignedOrders,
  weekDays,
  activeDragId,
  showUnassigned,
  onActionSuccess,
  weekNumber,
  holidaysMap,
  currentUserRole = 'employee',
  services,
  onEditShift,
  onCreateShift,
  showHiddenEmployees = false,
  onShowHiddenEmployeesChange,
}: PlanningCalendarProps) {
  const employeeIds = Object.keys(planningData);
  const canManageSubstitutions = currentUserRole === 'admin' || currentUserRole === 'manager';

  // Calculate hidden employees (those with no shifts in the week)
  const { visibleEmployeeIds, hiddenEmployeeIds } = React.useMemo(() => {
    const visible: string[] = [];
    const hidden: string[] = [];

    for (const employeeId of employeeIds) {
      const employee = planningData[employeeId];
      if (!employee) continue;

      // Check if employee has any shifts OR absences in the week
      let hasVisibleContent = false;
      for (const dayData of Object.values(employee.schedule)) {
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

  // Helper function to calculate consecutive absence ranges for Outlook-style display
  // This groups adjacent days with the same absence type into ranges
  const getAbsenceRanges = React.useCallback((employee: ShiftPlanningData[string], days: Date[]) => {
    const ranges: { start: Date; end: Date; type: string }[] = [];
    let currentRange: { start: Date; end: Date; type: string } | null = null;

    for (const day of days) {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayData = employee.schedule[dateKey];

      if (dayData?.isAbsence && dayData.absenceType) {
        if (!currentRange) {
          // Start a new range
          currentRange = { start: day, end: day, type: dayData.absenceType };
        } else if (currentRange.type === dayData.absenceType) {
          // Same type - check if consecutive
          const prevDay = new Date(currentRange.end);
          const diffDays = Math.round((day.getTime() - prevDay.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            // Consecutive day - extend range
            currentRange.end = day;
          } else {
            // Gap in days - start new range
            ranges.push(currentRange);
            currentRange = { start: day, end: day, type: dayData.absenceType };
          }
        } else {
          // Different absence type - start new range
          ranges.push(currentRange);
          currentRange = { start: day, end: day, type: dayData.absenceType };
        }
      } else if (currentRange) {
        // End of absence - close current range
        ranges.push(currentRange);
        currentRange = null;
      }
    }

    // Don't forget the last range
    if (currentRange) ranges.push(currentRange);
    return ranges;
  }, []);

  // Calculate which shifts are multi-shift (different hours for employees at same order on SAME date)
  // Multi-shift: same order, same date, but 2+ employees with different hours
  const multiShiftShiftIds = React.useMemo(() => {
    const result = new Set<string>();

    // Group shifts by order_id + shift_date
    const orderDateData: Record<string, { shifts: ShiftAssignment[]; employees: Set<string> }> = {};
    for (const employee of Object.values(planningData)) {
      for (const dayData of Object.values(employee.schedule)) {
        if (!dayData.shifts?.length) continue;
        for (const shift of dayData.shifts) {
          if (!shift.order_id) continue;
          // Use order_id + shift_date as composite key
          const key = `${shift.order_id}_${shift.shift_date}`;
          if (!orderDateData[key]) {
            orderDateData[key] = { shifts: [], employees: new Set() };
          }
          orderDateData[key].shifts.push(shift);
          for (const emp of shift.employees) {
            orderDateData[key].employees.add(emp.employee_id);
          }
        }
      }
    }

    // Check each order+date combination for multi-shift condition
    for (const [key, data] of Object.entries(orderDateData)) {
      // Must have 2+ unique employees on this date
      if (data.employees.size < 2) continue;

      // Get shifts and check if any have different hours
      const shifts = data.shifts;
      if (shifts.length < 2) continue;

      // Check if shifts have different hours
      const firstShift = shifts[0];
      const hasDifferentTimes = shifts.some(s =>
        s.estimated_hours !== firstShift.estimated_hours
      );

      if (hasDifferentTimes) {
        // Mark all shifts at this order+date as multi-shift
        for (const shift of shifts) {
          result.add(shift.id);
        }
      }
    }

    return result;
  }, [planningData]);

  return (
    <div className="border rounded-lg shadow-neumorphic glassmorphism-card h-full overflow-auto custom-scrollbar relative">
      <Table className="min-w-full border-collapse table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-card z-20 w-[200px] text-sm" rowSpan={2}>
              <div className="flex items-center justify-between">
                <span>Mitarbeiter</span>
                {hiddenEmployeeIds.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => onShowHiddenEmployeesChange?.(!showHiddenEmployees)}
                        >
                          {showHiddenEmployees ? (
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5 text-amber-600" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="!z-[99999]">
                        <p>{showHiddenEmployees ? 'Mitarbeiter ohne Einsätze ausblenden' : 'Alle Mitarbeiter anzeigen'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {/* Hidden employees count */}
              {hiddenEmployeeIds.length > 0 && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {showHiddenEmployees ? 'Alle:' : 'Mit Einsätzen:'}
                  </span>
                  <span className="text-[10px] font-medium text-green-600">
                    {visibleEmployeeIds.length}
                  </span>
                  <span className="text-[10px] text-muted-foreground">/</span>
                  <span className="text-[10px] text-muted-foreground">
                    {showHiddenEmployees ? 'Ausgeblendet:' : 'Ausgeblendet:'}
                  </span>
                  <span className="text-[10px] font-medium text-amber-600">
                    {hiddenEmployeeIds.length}
                  </span>
                </div>
              )}
            </TableHead>
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
          {filteredEmployeeIds.length === 0 ? (
            <TableRow>
              <TableCell colSpan={weekDays.length + 1} className="text-center text-muted-foreground h-24">
                Keine Mitarbeiter gefunden.
              </TableCell>
            </TableRow>
          ) : (
            filteredEmployeeIds.map(id => {
              const employee = planningData[id];
              if (!employee) return null;
              const available = employee.totalHoursAvailable - employee.totalHoursPlanned;
              const monthlyHours = allMonthlyHours[id] || { planned: 0, available: 0 };

              // Check if employee is absent today
              const todayKey = format(new Date(), "yyyy-MM-dd");
              const todayData = employee.schedule[todayKey];
              const isAbsentToday = todayData?.isAbsence;

              // Calculate absence ranges for Outlook-style display
              const absenceRanges = React.useMemo(() => getAbsenceRanges(employee, weekDays), [employee, weekDays, getAbsenceRanges]);

              return (
                <TableRow key={id}>
                  <TableCell className="font-normal sticky left-0 bg-card z-10 align-top p-2 w-[200px]">
                    <div className="flex items-start gap-2">
                      <Avatar>
                        <AvatarImage src={employee.raw.avatar_url} alt={employee.name} />
                        <AvatarFallback>{employee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-center gap-2">
                          {isAbsentToday && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs px-2 py-0.5 h-6 bg-red-100 border-red-300 text-red-900 dark:bg-red-900/50 dark:border-red-700 dark:text-red-100 font-medium">
                                    <CalendarX className="h-3 w-3 mr-1" />
                                    Abwesend
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="z-[100]">
                                  <p>{typeTranslations[todayData.absenceType || 'other'] || 'Abwesend'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <div className="text-sm font-semibold cursor-pointer hover:text-primary truncate">
                            <EmployeeEditDialog employee={employee.raw as any} />
                            {employee.name}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{employee.raw.job_title || 'Mitarbeiter'}</p>

                        {/* Monthly workload */}
                        <TooltipProvider delayDuration={100} disableHoverableContent>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="space-y-1">
                                <Progress
                                  value={monthlyHours.available > 0 ? (monthlyHours.planned / monthlyHours.available) * 100 : 0}
                                  className="h-2"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Mo: {monthlyHours.planned.toFixed(2)}h / {monthlyHours.available.toFixed(2)}h
                                </p>
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
                              <div className="space-y-1">
                                <Progress
                                  value={employee.totalHoursAvailable > 0 ? (employee.totalHoursPlanned / employee.totalHoursAvailable) * 100 : 0}
                                  className="h-2"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Wo: {employee.totalHoursPlanned.toFixed(2)}h / {employee.totalHoursAvailable.toFixed(2)}h
                                </p>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="z-[100]">
                              <div className="text-sm space-y-1">
                                <p>Woche: {employee.totalHoursPlanned.toFixed(2)}h / {employee.totalHoursAvailable.toFixed(2)}h</p>
                                <p>Noch verfügbar: {available.toFixed(2)}h</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </TableCell>
                  {weekDays.map((day, dayIndex) => {
                    const dateString = format(day, "yyyy-MM-dd");
                    const dayData = employee.schedule[dateString];
                    const droppableId = `${id}__${dateString}`;
                    const isTodayColumn = isToday(day);

                    // Check if this day is part of an absence range (for bar positioning)
                    const absenceRangeForDay = absenceRanges.find(range =>
                      day.getTime() >= range.start.getTime() && day.getTime() <= range.end.getTime()
                    );

                    // Check if this is the FIRST day of an absence range (for bar rendering)
                    const isFirstDayOfRange = absenceRanges.find(range =>
                      isSameDay(day, range.start)
                    );

                    if (!dayData) return <TableCell key={dateString} className={cn(isTodayColumn && "ring-2 ring-red-500 ring-offset-1")}></TableCell>;

                    // Nur Abwesenheit anzeigen, wenn der Mitarbeiter an diesem Tag normalerweise arbeiten würde
                    const isWorkDay = dayData.isAvailable || dayData.shifts.length > 0;

                    if (dayData.isAbsence && dayData.shifts.length === 0 && isWorkDay) {
                      // Calculate consecutive absence days inline (no hooks in loops)
                      const absenceType = dayData.absenceType || 'other';
                      let absenceDays = 0;
                      if (employee.schedule) {
                        for (const [, schedData] of Object.entries(employee.schedule)) {
                          if (schedData.isAbsence && (schedData.absenceType || 'other') === absenceType) {
                            absenceDays++;
                          }
                        }
                      }

                      const config = absenceTypeConfig[absenceType] || absenceTypeConfig.other;
                      const IconComponent = config.icon;

                      return (
                        <TableCell key={dateString} className={cn("p-0 relative", isTodayColumn && "ring-2 ring-red-500 ring-offset-1")}>
                          {/* Outlook-style bar - only render on first day of range */}
                          {isFirstDayOfRange && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "absolute top-0 left-0 h-3 rounded-b-md shadow-sm flex items-center justify-center cursor-help z-20",
                                      config.solidBg || "bg-gray-500"
                                    )}
                                    style={{
                                      width: `${((weekDays.findIndex(d => isSameDay(d, isFirstDayOfRange.end)) - dayIndex + 1) * 100)}%`
                                    }}
                                  >
                                    <span className={cn("text-[9px] font-semibold text-white truncate px-1", config.text)}>
                                      {typeTranslations[isFirstDayOfRange.type] || isFirstDayOfRange.type}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[200px] z-[100]" side="top">
                                  <p className="font-medium">{typeTranslations[isFirstDayOfRange.type] || isFirstDayOfRange.type}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(isFirstDayOfRange.start, "dd.MM.", { locale: de })} – {format(isFirstDayOfRange.end, "dd.MM.", { locale: de })}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={cn(
                                  "w-full h-full flex flex-col items-center justify-center font-semibold text-xs sm:text-sm p-1 gap-0.5",
                                  config.bg,
                                  config.border,
                                  config.text
                                )}>
                                  <div className="flex items-center gap-1">
                                    <IconComponent className="h-3.5 w-3.5" />
                                    <span>{typeTranslations[absenceType] || absenceType}</span>
                                  </div>
                                  {absenceDays > 1 && (
                                    <span className="text-[9px] opacity-75">{absenceDays} Tage</span>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[200px] z-[100]">
                                <div className="space-y-1">
                                  <p className="font-semibold flex items-center gap-1">
                                    <IconComponent className="h-3 w-3" />
                                    {typeTranslations[absenceType] || absenceType}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {absenceDays > 1 ? `${absenceDays} aufeinanderfolgende Tage` : '1 Tag'}
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      );
                    }

                    // Regular day cell (with shifts or available)
                    const absenceBar = isFirstDayOfRange ? (
                      <TooltipProvider key="absence-bar">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "absolute top-0 left-0 h-3 rounded-b-md shadow-sm flex items-center justify-center cursor-help z-20 pointer-events-auto",
                                (absenceTypeConfig[isFirstDayOfRange.type] || { solidBg: "bg-gray-500" }).solidBg
                              )}
                              style={{
                                width: `${((weekDays.findIndex(d => isSameDay(d, isFirstDayOfRange.end)) - dayIndex + 1) * 100)}%`
                              }}
                            >
                              <span className={cn("text-[9px] font-semibold text-white truncate px-1", "text-white")}>
                                {typeTranslations[isFirstDayOfRange.type] || isFirstDayOfRange.type}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[200px] z-[100]" side="top">
                            <p className="font-medium">{typeTranslations[isFirstDayOfRange.type] || isFirstDayOfRange.type}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(isFirstDayOfRange.start, "dd.MM.", { locale: de })} – {format(isFirstDayOfRange.end, "dd.MM.", { locale: de })}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : null;

                    return (
                      <DroppableCell
                        key={dateString}
                        id={droppableId}
                        isAvailable={dayData.isAvailable || dayData.shifts.length > 0}
                        day={day}
                        holidaysMap={holidaysMap}
                        onCreateShift={onCreateShift}
                        employeeId={id}
                        dateString={dateString}
                        isTodayColumn={isTodayColumn}
                        absenceBar={absenceBar}
                      >
                        <div className="space-y-1 pt-5">
                          {dayData.shifts.map((shift) => (
                            <ShiftCard
                              key={shift.id}
                              shift={shift}
                              onSuccess={onActionSuccess}
                              teamMembers={shift.order_id ? orderTeamMembersMap[shift.order_id] : shift.employees}
                              isMultiShift={multiShiftShiftIds.has(shift.id)}
                              onEdit={onEditShift ? (id) => {
                                // Override is_multi_shift with frontend-calculated value for accurate display
                                const shiftWithCorrectMultiShift = {
                                  ...shift,
                                  is_multi_shift: multiShiftShiftIds.has(shift.id),
                                };
                                onEditShift(id, shiftWithCorrectMultiShift, dateString);
                              } : undefined}
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