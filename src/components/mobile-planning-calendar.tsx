"use client";

import React, { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, subDays, isSameMonth, isToday, getDay } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Plus,
  Filter,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SwipeableActions } from "./swipeable-actions";

interface Assignment {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  hours: number;
  status: 'completed' | 'pending' | 'future' | 'in_progress';
  service_type?: string;
  object_name?: string;
  employee_name?: string;
}

interface UnassignedOrder {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  due_date: string;
  service_type?: string;
}

interface MobilePlanningCalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  assignments: { [date: string]: Assignment[] };
  unassignedOrders: UnassignedOrder[];
  employees: Array<{
    id: string;
    name: string;
    avatar_url?: string;
    totalHours: number;
    plannedHours: number;
  }>;
  onAssignmentClick?: (assignment: Assignment) => void;
  onOrderClick?: (order: UnassignedOrder) => void;
  onEmployeeClick?: (employeeId: string) => void;
}

const serviceTypeColors: { [key: string]: string } = {
  "Unterhaltsreinigung": "bg-green-500",
  "Glasreinigung": "bg-cyan-500",
  "Grundreinigung": "bg-blue-500",
  "Graffitientfernung": "bg-orange-500",
  "Sonderreinigung": "bg-purple-500",
  "default": "bg-gray-500",
};

const priorityColors: { [key: string]: string } = {
  high: "bg-red-500",
  medium: "bg-orange-500",
  low: "bg-blue-500",
};

export function MobilePlanningCalendar({
  currentDate,
  onDateChange,
  assignments,
  unassignedOrders,
  employees,
  onAssignmentClick,
  onOrderClick,
  onEmployeeClick,
}: MobilePlanningCalendarProps) {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const handlePreviousWeek = () => {
    onDateChange(subDays(currentDate, 7));
  };

  const handleNextWeek = () => {
    onDateChange(addDays(currentDate, 7));
  };

  const handlePreviousDay = () => {
    onDateChange(subDays(currentDate, 1));
  };

  const handleNextDay = () => {
    onDateChange(addDays(currentDate, 1));
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const getAssignmentsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return assignments[dateString] || [];
  };

  const getUnassignedOrdersForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return unassignedOrders.filter(order => 
      order.due_date === dateString
    );
  };

  const getEmployeeWorkload = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return { total: 0, planned: 0, percentage: 0 };
    
    const total = employee.totalHours;
    const planned = employee.plannedHours;
    const percentage = total > 0 ? (planned / total) * 100 : 0;
    
    return { total, planned, percentage };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={viewMode === 'day' ? handlePreviousDay : handlePreviousWeek}
              className="mobile-tap-target"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center">
              <div className="text-lg font-semibold">
                {viewMode === 'day' 
                  ? format(currentDate, 'EEEE, dd. MMMM', { locale: de })
                  : `KW ${format(currentDate, 'ww', { locale: de })}`
                }
              </div>
              <div className="text-sm text-muted-foreground">
                {format(currentDate, 'dd.MM.yyyy', { locale: de })}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={viewMode === 'day' ? handleNextDay : handleNextWeek}
              className="mobile-tap-target"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('day')}
              className="mobile-tap-target"
            >
              Tag
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
              className="mobile-tap-target"
            >
              Woche
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="mobile-tap-target"
            >
              Heute
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="mobile-tap-target"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="fixed inset-x-0 top-16 z-30 bg-background border-b border-border p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Filter</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(false)}
              >
                ×
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm">Alle Mitarbeiter</Button>
              <Button variant="outline" size="sm">Meine Aufgaben</Button>
              <Button variant="outline" size="sm">Hohe Priorität</Button>
              <Button variant="outline" size="sm">Nur heute</Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="pb-20">
        {viewMode === 'day' ? (
          /* Day View */
          <div className="space-y-4">
            {/* Date Header */}
            <Card className="glassmorphism-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  {format(currentDate, 'EEEE, dd. MMMM yyyy', { locale: de })}
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Employee List */}
            <div className="space-y-3">
              {employees.map((employee) => {
                const dayAssignments = getAssignmentsForDate(currentDate).filter(
                  assignment => assignment.employee_name === employee.name
                );
                const workload = getEmployeeWorkload(employee.id);

                return (
                  <Card key={employee.id} className="glassmorphism-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {employee.avatar_url ? (
                              <img 
                                src={employee.avatar_url} 
                                alt={employee.name}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <span className="text-primary font-semibold">
                                {employee.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold">{employee.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {workload.planned.toFixed(1)}h / {workload.total.toFixed(1)}h
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Auslastung</div>
                            <div className="text-lg font-bold text-primary">
                              {workload.percentage.toFixed(0)}%
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEmployeeClick?.(employee.id)}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Workload Bar */}
                      <div className="mb-3">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(workload.percentage, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Assignments */}
                      <div className="space-y-2">
                        {dayAssignments.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground">
                            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Keine Einsätze heute</p>
                          </div>
                        ) : (
                          dayAssignments.map((assignment) => (
                            <SwipeableActions
                              key={assignment.id}
                              leftActions={[
                                {
                                  icon: <CheckCircle className="h-4 w-4" />,
                                  label: "Abschließen",
                                  action: () => console.log('Complete assignment:', assignment.id),
                                  color: "bg-green-500",
                                }
                              ]}
                              rightActions={[
                                {
                                  icon: <MoreHorizontal className="h-4 w-4" />,
                                  label: "Details",
                                  action: () => onAssignmentClick?.(assignment),
                                  color: "bg-gray-500",
                                }
                              ]}
                            >
                              <div className="bg-card border rounded-lg p-3">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-grow">
                                    <h4 className="font-semibold text-sm">{assignment.title}</h4>
                                    <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                                      <Clock className="h-3 w-3" />
                                      <span>{assignment.startTime} - {assignment.endTime}</span>
                                      <span className="ml-2">{assignment.hours}h</span>
                                    </div>
                                    {assignment.object_name && (
                                      <div className="flex items-center text-xs text-muted-foreground">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {assignment.object_name}
                                      </div>
                                    )}
                                  </div>
                                  <Badge 
                                    variant="outline" 
                                    className={cn("text-xs", getStatusColor(assignment.status))}
                                  >
                                    {assignment.status === 'completed' ? 'Erledigt' : 
                                     assignment.status === 'in_progress' ? 'Aktiv' : 'Geplant'}
                                  </Badge>
                                </div>
                                {assignment.service_type && (
                                  <div className={cn(
                                    "w-3 h-3 rounded-full",
                                    serviceTypeColors[assignment.service_type] || serviceTypeColors.default
                                  )} />
                                )}
                              </div>
                            </SwipeableActions>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Unassigned Orders */}
            {getUnassignedOrdersForDate(currentDate).length > 0 && (
              <Card className="glassmorphism-card">
                <CardHeader>
                  <CardTitle className="text-lg text-orange-600">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Unbesetzte Einsätze ({getUnassignedOrdersForDate(currentDate).length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {getUnassignedOrdersForDate(currentDate).map((order) => (
                    <SwipeableActions
                      key={order.id}
                      leftActions={[
                        {
                          icon: <Plus className="h-4 w-4" />,
                          label: "Zuweisen",
                          action: () => onOrderClick?.(order),
                          color: "bg-blue-500",
                        }
                      ]}
                      rightActions={[
                        {
                          icon: <MoreHorizontal className="h-4 w-4" />,
                          label: "Details",
                          action: () => onOrderClick?.(order),
                          color: "bg-gray-500",
                        }
                      ]}
                    >
                      <div className="bg-card border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-grow">
                            <h4 className="font-semibold text-sm">{order.title}</h4>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" />
                              <span>{format(new Date(order.due_date), 'HH:mm', { locale: de })}</span>
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getPriorityColor(order.priority))}
                          >
                            {order.priority}
                          </Badge>
                        </div>
                        {order.service_type && (
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            serviceTypeColors[order.service_type] || serviceTypeColors.default
                          )} />
                        )}
                      </div>
                    </SwipeableActions>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* Week View */
          <div className="space-y-4">
            {/* Week Overview */}
            <Card className="glassmorphism-card">
              <CardHeader>
                <CardTitle className="text-lg">
                  KW {format(currentDate, 'ww', { locale: de })} - {format(weekStart, 'dd.MM.yyyy', { locale: de })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, index) => (
                    <div key={day} className="text-center font-semibold p-2">
                      {day}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Week Grid */}
            <div className="space-y-3">
              {weekDays.map((day) => {
                const dayAssignments = getAssignmentsForDate(day);
                const dayUnassignedOrders = getUnassignedOrdersForDate(day);
                const isTodayDate = isToday(day);

                return (
                  <Card key={day.toISOString()} className="glassmorphism-card">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className={cn(
                          "text-base",
                          isTodayDate && "text-primary"
                        )}>
                          {format(day, 'EEE dd.MM', { locale: de })}
                        </CardTitle>
                        <div className="flex items-center space-x-1">
                          {dayUnassignedOrders.length > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {dayUnassignedOrders.length}
                            </Badge>
                          )}
                          {dayAssignments.length > 0 && (
                            <Badge variant="default" className="text-xs">
                              {dayAssignments.length}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {dayAssignments.length === 0 && dayUnassignedOrders.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground">
                            <Clock className="h-6 w-6 mx-auto mb-1 opacity-50" />
                            <p className="text-sm">Keine Einsätze</p>
                          </div>
                        ) : (
                          <>
                            {dayAssignments.map((assignment) => (
                              <div key={assignment.id} className="bg-card border rounded p-2 mb-2">
                                <div className="flex items-start justify-between">
                                  <div className="flex-grow">
                                    <h5 className="font-semibold text-sm">{assignment.title}</h5>
                                    <div className="text-xs text-muted-foreground">
                                      {assignment.startTime} - {assignment.endTime} ({assignment.hours}h)
                                    </div>
                                    {assignment.object_name && (
                                      <div className="flex items-center text-xs text-muted-foreground">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {assignment.object_name}
                                      </div>
                                    )}
                                  </div>
                                  <Badge 
                                    variant="outline" 
                                    className={cn("text-xs", getStatusColor(assignment.status))}
                                  >
                                    {assignment.status === 'completed' ? '✓' : 
                                     assignment.status === 'in_progress' ? '▶' : '○'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                            {dayUnassignedOrders.map((order) => (
                              <div key={order.id} className="bg-orange-50 border border-orange-200 rounded p-2 mb-2">
                                <div className="flex items-start justify-between">
                                  <div className="flex-grow">
                                    <h5 className="font-semibold text-sm text-orange-800">{order.title}</h5>
                                    <div className="text-xs text-orange-600">
                                      {format(new Date(order.due_date), 'HH:mm', { locale: de })}
                                    </div>
                                  </div>
                                  <Badge 
                                    variant="outline" 
                                    className={cn("text-xs", getPriorityColor(order.priority))}
                                  >
                                    {order.priority}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => console.log('Add new assignment')}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg mobile-tap-target"
          size="lg"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}