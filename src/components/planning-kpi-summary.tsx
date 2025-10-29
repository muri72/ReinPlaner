"use client";

import * as React from "react";
import { format, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlanningData, UnassignedOrder } from "@/app/dashboard/planning/actions";
import { cn } from "@/lib/utils";
import { Clock3, Gauge, ListChecks, UsersRound } from "lucide-react";

interface PlanningKpiSummaryProps {
  planningData: PlanningData;
  unassignedOrders: UnassignedOrder[];
  selectedDate: Date;
  dateRange: Date[];
  isLoading: boolean;
}

interface PlanningMetrics {
  totalAssignments: number;
  completedAssignments: number;
  overdueAssignments: number;
  plannedHours: number;
  availableHours: number;
  occupancy: number;
  completionRate: number;
  absentEmployees: number;
  employeeCount: number;
  unassignedToday: number;
  unassignedInRange: number;
  rangeAssignments: number;
  rangeHours: number;
}

const INITIAL_METRICS: PlanningMetrics = {
  totalAssignments: 0,
  completedAssignments: 0,
  overdueAssignments: 0,
  plannedHours: 0,
  availableHours: 0,
  occupancy: 0,
  completionRate: 0,
  absentEmployees: 0,
  employeeCount: 0,
  unassignedToday: 0,
  unassignedInRange: 0,
  rangeAssignments: 0,
  rangeHours: 0,
};

export function PlanningKpiSummary({
  planningData,
  unassignedOrders,
  selectedDate,
  dateRange,
  isLoading,
}: PlanningKpiSummaryProps) {
  const numberFormatter = React.useMemo(
    () =>
      new Intl.NumberFormat("de-DE", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }),
    [],
  );

  const percentFormatter = React.useMemo(
    () =>
      new Intl.NumberFormat("de-DE", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    [],
  );

  const selectedDateLabel = React.useMemo(() => {
    return format(selectedDate, "EEEE, dd. MMM yyyy", { locale: de });
  }, [selectedDate]);

  const rangeLabel = React.useMemo(() => {
    if (!dateRange || dateRange.length === 0) {
      return "";
    }
    const sortedRange = [...dateRange].sort((a, b) => a.getTime() - b.getTime());
    const start = sortedRange[0];
    const end = sortedRange[sortedRange.length - 1];

    if (isSameDay(start, end)) {
      return format(start, "dd.MM.yyyy", { locale: de });
    }

    return `${format(start, "dd.MM.", { locale: de })} – ${format(end, "dd.MM.yyyy", { locale: de })}`;
  }, [dateRange]);

  const metrics = React.useMemo<PlanningMetrics>(() => {
    if (!planningData || !selectedDate || !dateRange || dateRange.length === 0) {
      return INITIAL_METRICS;
    }

    const selectedKey = format(selectedDate, "yyyy-MM-dd");
    const rangeKeyArray = dateRange.map((day) => format(day, "yyyy-MM-dd"));

    let plannedHours = 0;
    let availableHours = 0;
    let totalAssignments = 0;
    let completedAssignments = 0;
    let overdueAssignments = 0;
    let absentEmployees = 0;
    let rangeAssignments = 0;
    let rangeHours = 0;

    Object.values(planningData ?? {}).forEach((employee) => {
      if (!employee?.schedule) {
        return;
      }

      rangeKeyArray.forEach((dateKey) => {
        const rangeDayData = employee.schedule?.[dateKey];
        if (!rangeDayData) {
          return;
        }
        rangeAssignments += rangeDayData.assignments?.length ?? 0;
        rangeHours += rangeDayData.totalHours ?? 0;
      });

      const dayData = employee.schedule[selectedKey];
      if (!dayData) {
        return;
      }

      availableHours += dayData.availableHours ?? 0;
      plannedHours += dayData.totalHours ?? 0;

      if (dayData.isAbsence) {
        absentEmployees += 1;
      }

      const assignments = dayData.assignments ?? [];
      totalAssignments += assignments.length;

      assignments.forEach((assignment) => {
        if (assignment.status === "completed") {
          completedAssignments += 1;
        } else if (assignment.status === "pending") {
          overdueAssignments += 1;
        }
      });
    });

    let unassignedToday = 0;
    let unassignedInRange = 0;

    unassignedOrders.forEach((order) => {
      if (!order.due_date) {
        return;
      }
      const dueDate = new Date(order.due_date);
      if (Number.isNaN(dueDate.getTime())) {
        return;
      }
      const dueKey = format(dueDate, "yyyy-MM-dd");
      if (dueKey === selectedKey) {
        unassignedToday += 1;
      }
      if (rangeKeyArray.includes(dueKey)) {
        unassignedInRange += 1;
      }
    });

    const occupancy = availableHours > 0 ? (plannedHours / availableHours) * 100 : 0;
    const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

    return {
      totalAssignments,
      completedAssignments,
      overdueAssignments,
      plannedHours,
      availableHours,
      occupancy,
      completionRate,
      absentEmployees,
      employeeCount: Object.keys(planningData ?? {}).length,
      unassignedToday,
      unassignedInRange,
      rangeAssignments,
      rangeHours,
    };
  }, [planningData, selectedDate, dateRange, unassignedOrders]);

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={`planning-kpi-skeleton-${index}`} className="glassmorphism-card">
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const occupancyDisplay = percentFormatter.format(Math.round(metrics.occupancy));
  const completionDisplay = percentFormatter.format(Math.round(metrics.completionRate));
  const plannedHoursDisplay = `${numberFormatter.format(metrics.plannedHours)}h`;
  const availableHoursDisplay = `${numberFormatter.format(metrics.availableHours)}h`;
  const rangeHoursDisplay = `${numberFormatter.format(metrics.rangeHours)}h`;
  const occupancyBarWidth = Math.min(100, Math.max(0, metrics.occupancy));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Planungs-KPIs
          </p>
          <p className="text-sm text-foreground/70">{selectedDateLabel}</p>
        </div>
        {rangeLabel && (
          <Badge variant="outline" className="text-xs font-medium">
            {rangeLabel}
          </Badge>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="glassmorphism-card">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Einsätze heute</CardTitle>
            <ListChecks className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">{metrics.totalAssignments}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.completedAssignments} erledigt • {metrics.overdueAssignments} überfällig
            </p>
            <Badge variant="secondary" className="w-fit text-[11px]">
              {metrics.rangeAssignments} Einsätze im Zeitraum
            </Badge>
          </CardContent>
        </Card>

        <Card className="glassmorphism-card">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Arbeitsstunden</CardTitle>
            <Clock3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">{plannedHoursDisplay}</div>
            <p className="text-xs text-muted-foreground">
              von {availableHoursDisplay} verfügbar • Differenz {numberFormatter.format(metrics.availableHours - metrics.plannedHours)}h
            </p>
            <Badge variant="outline" className="w-fit text-[11px]">
              {rangeHoursDisplay} Stunden im Zeitraum
            </Badge>
          </CardContent>
        </Card>

        <Card className="glassmorphism-card">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Auslastung</CardTitle>
            <Gauge className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">{occupancyDisplay}%</div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  metrics.occupancy >= 100
                    ? "bg-red-500"
                    : metrics.occupancy >= 80
                      ? "bg-yellow-500"
                      : "bg-green-500",
                )}
                style={{ width: `${occupancyBarWidth}%` }}
              />
            </div>
            <Badge variant="outline" className="w-fit text-[11px]">
              Abschlussquote {completionDisplay}%
            </Badge>
          </CardContent>
        </Card>

        <Card className="glassmorphism-card">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Team & Verfügbarkeit</CardTitle>
            <UsersRound className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">{metrics.unassignedToday}</div>
            <p className="text-xs text-muted-foreground">
              Unbesetzte Einsätze heute • {metrics.unassignedInRange} im Zeitraum
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "text-[11px]",
                  metrics.unassignedToday > 0 &&
                    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-100",
                )}
              >
                {metrics.unassignedToday > 0 ? "Handlungsbedarf" : "Alles besetzt"}
              </Badge>
              <Badge variant="secondary" className="text-[11px]">
                {metrics.employeeCount} Mitarbeitende
              </Badge>
              {metrics.absentEmployees > 0 && (
                <Badge variant="outline" className="text-[11px]">
                  {metrics.absentEmployees} abwesend
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}