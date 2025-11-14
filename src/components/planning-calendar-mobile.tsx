"use client";

import * as React from "react";
import { format, isToday } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight, Clock, MapPin, User, AlertCircle } from "lucide-react";
import { PlanningData, UnassignedOrder } from "@/app/dashboard/planning/actions";
import { AssignmentEditDialog } from "./assignment-edit-dialog";

const absenceTypeLabels: Record<string, string> = {
  vacation: "Urlaub",
  sick_leave: "Krankheit",
  training: "Weiterbildung",
  other: "Abwesend",
};

const absenceTypeEmojis: Record<string, string> = {
  vacation: "🏖️",
  sick_leave: "🤒",
  training: "📚",
  other: "📅",
};

const statusBadgeClassNames: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  future: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200",
};

const dayHeaders = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

const sanitizeWeekday = (date: Date) =>
  format(date, "EEE", { locale: de }).replace(/\./g, "");

const formatRangeEdge = (date: Date) =>
  `${sanitizeWeekday(date)} ${format(date, "dd.MM.", { locale: de })}`;

const getWeekdayIndex = (date: Date) => (date.getDay() + 6) % 7;

interface MobilePlanningCalendarProps {
  planningData: PlanningData;
  unassignedOrders: UnassignedOrder[];
  weekDays: Date[];
  selectedDate: Date;
  showUnassigned: boolean;
  onActionSuccess: () => void;
  onSelectedDateChange: (date: Date) => void;
  viewMode: "day" | "week" | "month";
  holidaysMap: { [key: string]: { name: string } | null };
}

export function MobilePlanningCalendar({
  planningData,
  unassignedOrders,
  weekDays,
  selectedDate,
  showUnassigned,
  onActionSuccess,
  onSelectedDateChange,
  viewMode,
  holidaysMap,
}: MobilePlanningCalendarProps) {
  const sortedDays = React.useMemo(
    () => [...weekDays].sort((a, b) => a.getTime() - b.getTime()),
    [weekDays],
  );

  const rangeLabel = React.useMemo(() => {
    if (viewMode === "month") {
      return format(selectedDate, "MMMM yyyy", { locale: de });
    }
    if (sortedDays.length === 0) {
      return "";
    }
    if (sortedDays.length === 1) {
      return formatRangeEdge(sortedDays[0]);
    }
    return `${formatRangeEdge(sortedDays[0])} – ${formatRangeEdge(sortedDays[sortedDays.length - 1])}`;
  }, [sortedDays, selectedDate, viewMode]);

  const monthGrid = React.useMemo(() => {
    if (viewMode !== "month" || sortedDays.length === 0) {
      return [] as (Date | null)[];
    }

    const firstDay = sortedDays[0];
    const lastDay = sortedDays[sortedDays.length - 1];

    const leading = getWeekdayIndex(firstDay);
    const trailing = 6 - getWeekdayIndex(lastDay);

    const grid: (Date | null)[] = [
      ...Array(leading).fill(null),
      ...sortedDays,
      ...Array(trailing).fill(null),
    ];

    if (grid.length % 7 !== 0) {
      const remainder = grid.length % 7;
      grid.push(...Array(7 - remainder).fill(null));
    }

    return grid;
  }, [sortedDays, viewMode]);

  const monthRows = React.useMemo(() => {
    if (monthGrid.length === 0) {
      return [] as (Date | null)[][];
    }
    const rows: (Date | null)[][] = [];
    for (let i = 0; i < monthGrid.length; i += 7) {
      rows.push(monthGrid.slice(i, i + 7));
    }
    return rows;
  }, [monthGrid]);

  const selectedDateKey = React.useMemo(
    () => format(selectedDate, "yyyy-MM-dd"),
    [selectedDate],
  );

  const assignmentCountByDate = React.useMemo(() => {
    const map = new Map<string, number>();
    Object.values(planningData ?? {}).forEach((employee) => {
      Object.entries(employee.schedule ?? {}).forEach(([dateKey, dayData]) => {
        const count = dayData?.assignments?.length ?? 0;
        if (count > 0) {
          map.set(dateKey, (map.get(dateKey) ?? 0) + count);
        }
      });
    });
    return map;
  }, [planningData]);

  const unassignedCountByDate = React.useMemo(() => {
    const map = new Map<string, number>();
    unassignedOrders.forEach((order) => {
      if (!order.due_date) return;
      try {
        const dateKey = format(new Date(order.due_date), "yyyy-MM-dd");
        map.set(dateKey, (map.get(dateKey) ?? 0) + 1);
      } catch {
        // ignore parsing issues
      }
    });
    return map;
  }, [unassignedOrders]);

  const employeeIds = React.useMemo(
    () => Object.keys(planningData ?? {}),
    [planningData],
  );
  const [showHiddenEmployees, setShowHiddenEmployees] = React.useState(false);

  const { visibleEmployeeIds, hiddenEmployeeIds } = React.useMemo(() => {
    const visible: string[] = [];
    const hidden: string[] = [];

    employeeIds.forEach((employeeId) => {
      const employee = planningData[employeeId];
      if (!employee) {
        return;
      }

      const dayData = employee.schedule?.[selectedDateKey];
      if (!dayData) {
        hidden.push(employeeId);
        return;
      }

      if (dayData.isAbsence) {
        visible.push(employeeId);
        return;
      }

      const assignmentsCount = dayData.assignments?.length ?? 0;
      if (assignmentsCount > 0) {
        visible.push(employeeId);
        return;
      }

      const plannedHours = dayData.totalHours ?? 0;
      if (plannedHours > 0) {
        visible.push(employeeId);
      } else {
        hidden.push(employeeId);
      }
    });

    return { visibleEmployeeIds: visible, hiddenEmployeeIds: hidden };
  }, [employeeIds, planningData, selectedDateKey]);

  const hiddenEmployeeCount = React.useMemo(
    () => hiddenEmployeeIds.length,
    [hiddenEmployeeIds.length],
  );
  const hasVisibleEmployees = visibleEmployeeIds.length > 0;
  const hasHiddenEmployees = hiddenEmployeeCount > 0;

  React.useEffect(() => {
    setShowHiddenEmployees(false);
  }, [selectedDateKey]);

  React.useEffect(() => {
    if (hiddenEmployeeCount === 0) {
      setShowHiddenEmployees(false);
    }
  }, [hiddenEmployeeCount]);

  const unassignedForSelectedDate = React.useMemo(() => {
    return unassignedOrders.filter((order) => {
      if (!order.due_date) {
        return false;
      }
      try {
        const dueKey = format(new Date(order.due_date), "yyyy-MM-dd");
        return dueKey === selectedDateKey;
      } catch {
        return false;
      }
    });
  }, [unassignedOrders, selectedDateKey]);

  React.useEffect(() => {
    if (sortedDays.length === 0) {
      return;
    }

    const currentKey = format(selectedDate, "yyyy-MM-dd");
    const hasCurrent = sortedDays.some(
      (day) => format(day, "yyyy-MM-dd") === currentKey,
    );

    if (!hasCurrent) {
      onSelectedDateChange(sortedDays[0]);
    }
  }, [sortedDays, selectedDate, onSelectedDateChange]);

  const handleSelectDate = React.useCallback(
    (day: Date) => {
      onSelectedDateChange(day);
    },
    [onSelectedDateChange],
  );

  return (
    <div className="space-y-4">
      <Card className="glassmorphism-card">
        <CardHeader className="pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">
              Zeitraum auswählen
            </CardTitle>
            {rangeLabel && (
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {rangeLabel}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sortedDays.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Keine Tage verfügbar.
            </div>
          ) : viewMode === "month" ? (
            <div className="space-y-2">
              <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {dayHeaders.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthRows.map((week, weekIndex) =>
                  week.map((day, index) => {
                    if (!day) {
                      return (
                        <div
                          key={`placeholder-${weekIndex}-${index}`}
                          className="h-16 rounded-lg border border-transparent"
                        />
                      );
                    }

                    const dayKey = format(day, "yyyy-MM-dd");
                    const isSelected = dayKey === selectedDateKey;
                    const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                    const today = isToday(day);
                    const assignmentCount = assignmentCountByDate.get(dayKey) ?? 0;
                    const unassignedCount = unassignedCountByDate.get(dayKey) ?? 0;

                    return (
                      <button
                        type="button"
                        key={day.toISOString()}
                        onClick={() => handleSelectDate(day)}
                        className={cn(
                          "flex h-16 flex-col items-center justify-center rounded-lg border text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-lg"
                            : "border-border bg-card hover:border-primary/40",
                          today && !isSelected && "border-primary/30",
                          !isCurrentMonth && "opacity-50",
                        )}
                        aria-pressed={isSelected}
                      >
                        <span className="text-sm font-semibold">
                          {format(day, "d")}
                        </span>
                        {today && (
                          <span className="text-[10px] font-medium text-primary">
                            Heute
                          </span>
                        )}
                        {(assignmentCount > 0 || unassignedCount > 0) && (
                          <div className="mt-1 flex gap-1">
                            {assignmentCount > 0 && (
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            )}
                            {unassignedCount > 0 && (
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            )}
                          </div>
                        )}
                      </button>
                    );
                  }),
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 pb-1">
              {sortedDays.map((day) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const today = isToday(day);
                const isSelected = dayKey === selectedDateKey;
                const assignmentCount = assignmentCountByDate.get(dayKey) ?? 0;
                const unassignedCount = unassignedCountByDate.get(dayKey) ?? 0;

                return (
                  <button
                    type="button"
                    key={day.toISOString()}
                    onClick={() => handleSelectDate(day)}
                    className={cn(
                      "flex h-16 flex-col items-center justify-center rounded-md border text-center text-[10px] leading-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow"
                        : "border-border bg-card hover:border-primary/40",
                      today && !isSelected && "border-primary/30",
                    )}
                    aria-pressed={isSelected}
                  >
                    <span className="font-semibold uppercase tracking-wide">
                      {sanitizeWeekday(day)}
                    </span>
                    <span className="text-base font-bold">
                      {format(day, "d")}
                    </span>
                    {today && (
                      <Badge variant="secondary" className="mt-0.5 h-3.5 px-1 text-[9px] leading-none">
                        Heute
                      </Badge>
                    )}
                    {(assignmentCount > 0 || unassignedCount > 0) && (
                      <div className="mt-1 flex items-center gap-1">
                        {assignmentCount > 0 && (
                          <Badge variant="secondary" className="h-3.5 px-1.5 text-[9px] leading-none">
                            {assignmentCount}
                          </Badge>
                        )}
                        {unassignedCount > 0 && (
                          <Badge
                            variant="outline"
                            className="h-3.5 px-1.5 text-[9px] leading-none border-amber-400 text-amber-700 dark:border-amber-500 dark:text-amber-200"
                          >
                            {unassignedCount}
                          </Badge>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {showUnassigned && (
        <Card className="glassmorphism-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm font-semibold">
              <Badge variant="outline" className="mr-2 h-6 px-2 text-xs">
                {unassignedForSelectedDate.length}
              </Badge>
              Unbesetzte Einsätze ({format(selectedDate, "dd.MM.", { locale: de })})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unassignedForSelectedDate.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground">
                Keine unbesetzten Einsätze für dieses Datum.
              </div>
            ) : (
              unassignedForSelectedDate.map((order) => (
                <Card
                  key={order.id}
                  className="border border-dashed border-border/60 p-3 transition-colors hover:border-primary/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold leading-tight">
                        {order.title}
                      </p>
                      {order.service_type && (
                        <p className="text-xs text-muted-foreground">
                          {order.service_type}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {order.total_estimated_hours
                        ? `${order.total_estimated_hours}h`
                        : "k.A."}
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3 pb-2">
        {employeeIds.length === 0 ? (
          <Card className="glassmorphism-card">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <User className="h-10 w-10 text-muted-foreground/70" />
              Keine Mitarbeiter gefunden.
            </CardContent>
          </Card>
        ) : (
          <>
            {!hasVisibleEmployees && (
              <Card className="glassmorphism-card">
                <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
                  <User className="h-10 w-10 text-muted-foreground/70" />
                  Keine Einsätze für dieses Datum geplant.
                  {hasHiddenEmployees && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="px-3 py-1 text-xs"
                      onClick={() => setShowHiddenEmployees((prev) => !prev)}
                    >
                      {showHiddenEmployees ? "Ausgeblendete ausblenden" : "Ausgeblendete anzeigen"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {hasVisibleEmployees &&
              visibleEmployeeIds.map((employeeId) => {
                const employee = planningData[employeeId];
                if (!employee) {
                  return null;
                }

                const dayData = employee.schedule[selectedDateKey];
                const assignments = dayData?.assignments ?? [];
                const assignmentCount = assignments.length;

                return (
                  <Card key={employeeId} className="glassmorphism-card">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {employee.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {employee.raw?.job_title ?? "Mitarbeiter"}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {assignmentCount} Einsätze
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {dayData?.isAbsence ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                          {absenceTypeEmojis[dayData.absenceType ?? "other"]}{" "}
                          {absenceTypeLabels[dayData.absenceType ?? "other"]}
                        </div>
                      ) : assignmentCount > 0 ? (
                        assignments.map((assignment) => (
                          <AssignmentEditDialog
                            key={assignment.id}
                            orderId={assignment.orderId}
                            onSuccess={onActionSuccess}
                          >
                            <div className="cursor-pointer rounded-lg border border-border/60 bg-muted/30 p-3 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <p className="text-sm font-semibold leading-tight">
                                    {assignment.title}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>
                                      {(assignment.startTime ?? "09:00") +
                                        " – " +
                                        (assignment.endTime ?? "17:00")}
                                    </span>
                                    <span>•</span>
                                    <span>{assignment.hours.toFixed(2)}h</span>
                                  </div>
                                  {assignment.service_type && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <MapPin className="h-3.5 w-3.5" />
                                      <span className="truncate">
                                        {assignment.service_type}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <Badge
                                    className={cn(
                                      "text-[10px] font-medium",
                                      statusBadgeClassNames[assignment.status],
                                    )}
                                  >
                                    {assignment.status === "completed"
                                      ? "Abgeschlossen"
                                      : assignment.status === "pending"
                                        ? "Überfällig"
                                        : "Geplant"}
                                  </Badge>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            </div>
                          </AssignmentEditDialog>
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed border-border/60 py-6 text-center text-sm text-muted-foreground">
                          Keine Einsätze geplant.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

            {hasHiddenEmployees && (
              <Card className="glassmorphism-card border border-dashed border-primary/20 bg-gradient-to-br from-muted/40 via-background to-background">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        Ausgeblendete Mitarbeitende
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Keine Einsätze für den gewählten Tag.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {hiddenEmployeeCount}
                      </Badge>
                      <Button
                        variant={showHiddenEmployees ? "secondary" : "outline"}
                        size="sm"
                        className="px-3 py-1 text-xs"
                        onClick={() => setShowHiddenEmployees((prev) => !prev)}
                      >
                        {showHiddenEmployees ? "Ausblenden" : "Anzeigen"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {showHiddenEmployees && (
                  <CardContent className="grid gap-2">
                    {hiddenEmployeeIds.map((employeeId) => {
                      const employee = planningData[employeeId];
                      if (!employee) {
                        return null;
                      }

                      return (
                        <div
                          key={employeeId}
                          className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-3 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {employee.name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {employee.raw?.job_title ?? "Mitarbeiter"} • Verfügbar
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              Keine Einsätze
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}