"use client";

import * as React from "react";
import { format, parseISO, isToday, isSameMonth, getDay, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlanningData, UnassignedOrder } from "@/app/dashboard/planning/actions";
import { EmployeeWorkloadBar } from "./employee-workload-bar";
import { SwipeableActions } from "./swipeable-actions";
import { getDateStyling, getHolidayTooltip } from "@/lib/date-utils";

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

interface MobilePlanningCalendarProps {
  planningData: PlanningData;
  unassignedOrders: UnassignedOrder[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: 'day' | 'week' | 'month';
  onViewModeChange: (mode: 'day' | 'week' | 'month') => void;
  showUnassigned: boolean;
  onShowUnassignedChange: (show: boolean) => void;
  onActionSuccess: () => void;
  weekNumber: number;
}

export function MobilePlanningCalendar({
  planningData,
  unassignedOrders,
  currentDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  showUnassigned,
  onShowUnassignedChange,
  onActionSuccess,
  weekNumber,
}: MobilePlanningCalendarProps) {
  const [selectedDate, setSelectedDate] = React.useState(currentDate);
  const [showFilters, setShowFilters] = React.useState(false);

  const employeeIds = Object.keys(planningData);
  const { startDate, endDate, daysToDisplay } = React.useMemo(() => {
    let start, end;
    switch (viewMode) {
      case 'day':
        start = new Date(currentDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(currentDate);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        break;
      case 'week':
      default:
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
        break;
    }
    return { startDate: start, endDate: end, daysToDisplay: eachDayOfInterval({ start, end }) };
  }, [currentDate, viewMode]);

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'week':
      default:
        newDate.setDate(newDate.getDate() - 7);
        break;
    }
    onDateChange(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'week':
      default:
        newDate.setDate(newDate.getDate() + 7);
        break;
    }
    onDateChange(newDate);
  };

  const getOrdersForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return unassignedOrders.filter(
      (order) => order.due_date && format(parseISO(order.due_date), 'yyyy-MM-dd') === dateString
    );
  };

  const getEmployeeAssignmentsForDate = (employeeId: string, date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const employee = planningData[employeeId];
    return employee?.schedule[dateString]?.assignments || [];
  };

  const MobileDayView = () => {
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const dayStyling = getDateStyling(selectedDate);
    const ordersForDay = getOrdersForDate(selectedDate);

    return (
      <div className="space-y-4">
        {/* Date Header */}
        <Card className="glassmorphism-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {format(selectedDate, 'EEEE, dd. MMMM yyyy', { locale: de })}
              </CardTitle>
              <div className="flex space-x-1">
                <Button variant="outline" size="sm" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {dayStyling.isHoliday && (
              <div className="text-sm text-red-600 font-medium">
                {dayStyling.holidayName}
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Unassigned Orders */}
        {showUnassigned && ordersForDay.length > 0 && (
          <Card className="glassmorphism-card border-orange-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-orange-600" />
                Unbesetzte Aufträge ({ordersForDay.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ordersForDay.map((order) => (
                <div
                  key={order.id}
                  className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{order.title}</h4>
                      {order.service_type && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {order.service_type}
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                      {order.total_estimated_hours || 0}h
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Employee Assignments */}
        <div className="space-y-3">
          {employeeIds.map((employeeId) => {
            const employee = planningData[employeeId];
            if (!employee) return null;

            const assignments = getEmployeeAssignmentsForDate(employeeId, selectedDate);
            const dayData = employee.schedule[dateString];

            if (assignments.length === 0 && !dayData?.isAbsence) return null;

            return (
              <Card key={employeeId} className="glassmorphism-card">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={employee.raw.avatar_url} alt={employee.name} />
                      <AvatarFallback className="text-xs">
                        {employee.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{employee.name}</h4>
                      {dayData?.isAbsence ? (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs mt-1",
                            absenceTypeColors[dayData.absenceType || 'other']
                          )}
                        >
                          {absenceTypeTranslations[dayData.absenceType || 'other']}
                        </Badge>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {assignments.length} Einsatz{assignments.length !== 1 ? 'e' : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {!dayData?.isAbsence && assignments.length > 0 && (
                    <div className="space-y-2">
                      {assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="p-2 bg-primary/5 border border-primary/20 rounded-lg"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-sm">{assignment.title}</h5>
                              <div className="flex items-center space-x-2 mt-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {assignment.startTime || '09:00'} - {assignment.endTime || '17:00'}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {assignment.hours}h
                                </Badge>
                              </div>
                              {assignment.service_type && (
                                <Badge variant="secondary" className="mt-1 text-xs">
                                  {assignment.service_type}
                                </Badge>
                              )}
                            </div>
                            <Badge
                              variant={assignment.status === 'completed' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {assignment.status === 'completed' ? 'Erledigt' : 
                               assignment.status === 'pending' ? 'Ausstehend' : 'Zukünftig'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const MobileWeekView = () => {
    return (
      <div className="space-y-4">
        {/* Week Header */}
        <Card className="glassmorphism-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Woche {weekNumber} • {format(startDate, 'dd. MMM', { locale: de })} - {format(endDate, 'dd. MMM yyyy', { locale: de })}
              </CardTitle>
              <div className="flex space-x-1">
                <Button variant="outline" size="sm" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Days Grid */}
        <div className="space-y-3">
          {daysToDisplay.map((day) => {
            const dateString = format(day, 'yyyy-MM-dd');
            const dayStyling = getDateStyling(day);
            const ordersForDay = getOrdersForDate(day);
            const isCurrentDay = isToday(day);

            return (
              <Card key={dateString} className={cn(
                "glassmorphism-card",
                isCurrentDay && "ring-2 ring-primary/20"
              )}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {format(day, 'EEEE', { locale: de })}, {format(day, 'dd. MMMM', { locale: de })}
                    </CardTitle>
                    {dayStyling.isHoliday && (
                      <Badge variant="destructive" className="text-xs">
                        {dayStyling.holidayName}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Unassigned Orders */}
                  {showUnassigned && ordersForDay.length > 0 && (
                    <div className="p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                          Unbesetzt ({ordersForDay.length})
                        </span>
                      </div>
                      <div className="space-y-1">
                        {ordersForDay.slice(0, 2).map((order) => (
                          <div key={order.id} className="text-xs">
                            {order.title}
                          </div>
                        ))}
                        {ordersForDay.length > 2 && (
                          <div className="text-xs text-orange-600 dark:text-orange-400">
                            +{ordersForDay.length - 2} weitere
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Employee Summary */}
                  <div className="space-y-2">
                    {employeeIds.map((employeeId) => {
                      const employee = planningData[employeeId];
                      if (!employee) return null;

                      const assignments = getEmployeeAssignmentsForDate(employeeId, day);
                      const dayData = employee.schedule[dateString];

                      if (assignments.length === 0 && !dayData?.isAbsence) return null;

                      return (
                        <div key={employeeId} className="flex items-center space-x-2 p-2 bg-muted/30 rounded-lg">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={employee.raw.avatar_url} alt={employee.name} />
                            <AvatarFallback className="text-xs">
                              {employee.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            {dayData?.isAbsence ? (
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-xs",
                                  absenceTypeColors[dayData.absenceType || 'other']
                                )}
                              >
                                {absenceTypeTranslations[dayData.absenceType || 'other']}
                              </Badge>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-medium truncate">
                                  {employee.name}
                                </span>
                                {assignments.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {assignments.reduce((sum, a) => sum + a.hours, 0)}h
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const MobileMonthView = () => {
    return (
      <div className="space-y-4">
        {/* Month Header */}
        <Card className="glassmorphism-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {format(currentDate, 'MMMM yyyy', { locale: de })}
              </CardTitle>
              <div className="flex space-x-1">
                <Button variant="outline" size="sm" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Employee Summary Cards */}
        <div className="space-y-3">
          {employeeIds.map((employeeId) => {
            const employee = planningData[employeeId];
            if (!employee) return null;

            return (
              <Card key={employeeId} className="glassmorphism-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={employee.raw.avatar_url} alt={employee.name} />
                      <AvatarFallback>
                        {employee.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-base">{employee.name}</CardTitle>
                      <div className="text-sm text-muted-foreground">
                        {employee.totalHoursPlanned.toFixed(1)}h / {employee.totalHoursAvailable.toFixed(1)}h
                      </div>
                    </div>
                  </div>
                  <EmployeeWorkloadBar
                    planned={employee.totalHoursPlanned}
                    available={employee.totalHoursAvailable}
                  />
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Monatliche Auslastung: {employee.totalHoursAvailable > 0 
                      ? Math.round((employee.totalHoursPlanned / employee.totalHoursAvailable) * 100)
                      : 0}%
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* View Mode Selector */}
      <Card className="glassmorphism-card mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Ansicht</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(['day', 'week', 'month'] as const).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'outline'}
                size="sm"
                onClick={() => onViewModeChange(mode)}
                className="text-xs"
              >
                {mode === 'day' ? 'Tag' : mode === 'week' ? 'Woche' : 'Monat'}
              </Button>
            ))}
          </div>
          
          {showFilters && (
            <div className="space-y-2 pt-2 border-t">
              <Button
                variant={showUnassigned ? 'default' : 'outline'}
                size="sm"
                onClick={() => onShowUnassignedChange(!showUnassigned)}
                className="w-full text-xs"
              >
                Unbesetzte Aufträge {showUnassigned ? 'ausblenden' : 'anzeigen'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content based on view mode */}
      {viewMode === 'day' ? <MobileDayView /> : 
       viewMode === 'week' ? <MobileWeekView /> : 
       <MobileMonthView />}
    </div>
  );
}