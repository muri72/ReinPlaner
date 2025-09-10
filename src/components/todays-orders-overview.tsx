"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, getWeek, differenceInDays, parse } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, UserRound, CheckCircle2, PlayCircle, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AssignedEmployee } from "@/components/order-form";
import { TimeProgressBar } from "@/components/time-progress-bar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useIsMobile } from "@/hooks/use-mobile";

interface DisplayOrder {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  assignedEmployees: (AssignedEmployee & { name: string; avatarUrl: string | null })[];
  customer_name: string | null;
  object_name: string | null;
  order_type: string;
  recurring_start_date: string | null;
  object: { recurrence_interval_weeks: number; start_week_offset: number; } | null;
}

const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export function TodaysOrdersOverview() {
  const supabase = createClient();
  const [upcomingOrders, setUpcomingOrders] = useState<DisplayOrder[]>([]);
  const [inProgressOrders, setInProgressOrders] = useState<DisplayOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<DisplayOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  const getAssignedTimeForEmployeeToday = (
    assignment: AssignedEmployee,
    order: DisplayOrder
  ): { start: string; end: string } | null => {
    const today = new Date();
    const todayDayOfWeek = today.getDay();
    const currentDayKey = dayNames[todayDayOfWeek];
  
    const recurrenceInterval = assignment.assigned_recurrence_interval_weeks || order.object?.recurrence_interval_weeks || 1;
    const startWeekOffset = assignment.assigned_start_week_offset || order.object?.start_week_offset || 0;
    const orderStartDate = order.recurring_start_date ? new Date(order.recurring_start_date) : today;
    
    const daysPassed = differenceInDays(today, orderStartDate);
    if (daysPassed < 0) return null;
  
    const weeksPassed = Math.floor(daysPassed / 7);
    const effectiveWeekIndex = (weeksPassed + startWeekOffset) % recurrenceInterval;
  
    const weekSchedule = assignment.assigned_daily_schedules?.[effectiveWeekIndex];
    const daySchedule = (weekSchedule as any)?.[currentDayKey];
  
    const startTime = daySchedule?.start;
    const endTime = daySchedule?.end;
  
    if (startTime && endTime) {
      return { start: startTime, end: endTime };
    }
    return null;
  };

  const getOrderTimeRangeForToday = (order: DisplayOrder): { start: Date; end: Date } | null => {
    const assignedTimes = order.assignedEmployees
      .map(emp => getAssignedTimeForEmployeeToday(emp, order))
      .filter((time): time is { start: string; end: string } => time !== null);

    if (assignedTimes.length === 0) return null;

    const now = new Date();
    const startDates = assignedTimes.map(t => parse(t.start, 'HH:mm', now));
    const endDates = assignedTimes.map(t => parse(t.end, 'HH:mm', now));

    const earliestStart = new Date(Math.min(...startDates.map(d => d.getTime())));
    const latestEnd = new Date(Math.max(...endDates.map(d => d.getTime())));

    return { start: earliestStart, end: latestEnd };
  };

  const categorizeOrders = useCallback((orders: DisplayOrder[]) => {
    const upcoming: DisplayOrder[] = [];
    const inProgress: DisplayOrder[] = [];
    const completed: DisplayOrder[] = [];
    const now = new Date();

    orders.forEach(order => {
      if (order.status === 'completed') {
        completed.push(order);
        return;
      }

      const timeRange = getOrderTimeRangeForToday(order);
      if (timeRange) {
        if (now < timeRange.start) {
          upcoming.push(order);
        } else if (now > timeRange.end) {
          completed.push(order);
        } else {
          inProgress.push(order);
        }
      } else {
        upcoming.push(order);
      }
    });

    const sortOrdersByStartTime = (a: DisplayOrder, b: DisplayOrder) => {
      const timeA = getOrderTimeRangeForToday(a)?.start.getTime() || Infinity;
      const timeB = getOrderTimeRangeForToday(b)?.start.getTime() || Infinity;
      return timeA - timeB;
    };

    setUpcomingOrders(upcoming.sort(sortOrdersByStartTime));
    setInProgressOrders(inProgress.sort(sortOrdersByStartTime));
    setCompletedOrders(completed.sort(sortOrdersByStartTime));
  }, []);

  const fetchData = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setLoading(true);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (isInitialLoad) toast.error("Benutzer nicht authentifiziert.");
      setLoading(false);
      return;
    }

    let query = supabase
      .from('orders')
      .select(`
        id, title, status, due_date, customer_id, object_id, order_type, recurring_start_date, recurring_end_date,
        objects ( name, recurrence_interval_weeks, start_week_offset, daily_schedules ),
        customers ( name ),
        order_employee_assignments ( 
          employee_id, 
          assigned_daily_schedules,
          assigned_recurrence_interval_weeks, assigned_start_week_offset,
          employees ( first_name, last_name ) 
        )
      `)
      .eq('request_status', 'approved')
      .or(`due_date.eq.${format(today, 'yyyy-MM-dd')},and(recurring_start_date.lte.${format(today, 'yyyy-MM-dd')},or(recurring_end_date.gte.${format(today, 'yyyy-MM-dd')},recurring_end_date.is.null))`);

    const { data, error } = await query;

    if (error) {
      console.error("Fehler beim Laden der heutigen Aufträge:", error.message);
      if (isInitialLoad) toast.error("Fehler beim Laden der heutigen Aufträge.");
      setLoading(false);
      return;
    }

    const todaysOrders = data.filter(order => {
      if (order.order_type === 'one_time') return true;
      if (['recurring', 'permanent', 'substitution'].includes(order.order_type)) {
        const recurrenceInterval = order.order_employee_assignments?.[0]?.assigned_recurrence_interval_weeks || order.objects?.[0]?.recurrence_interval_weeks || 1;
        const startWeekOffset = order.order_employee_assignments?.[0]?.assigned_start_week_offset || order.objects?.[0]?.start_week_offset || 0;
        const orderStartDate = order.recurring_start_date ? new Date(order.recurring_start_date) : today;
        const daysPassed = differenceInDays(today, orderStartDate);
        if (daysPassed < 0) return false;
        const weeksPassed = Math.floor(daysPassed / 7);
        if ((weeksPassed + startWeekOffset) % recurrenceInterval !== 0) return false;

        const effectiveWeekIndex = (weeksPassed + startWeekOffset) % recurrenceInterval;
        const todayDayOfWeek = today.getDay();
        const currentDayKey = dayNames[todayDayOfWeek];

        const hasHours = order.order_employee_assignments?.some(assignment => {
          const weekSchedule = assignment.assigned_daily_schedules?.[effectiveWeekIndex];
          const daySchedule = (weekSchedule as any)?.[currentDayKey];
          return daySchedule && daySchedule.hours > 0;
        });

        if (hasHours) return true;
        
        const object = order.objects?.[0];
        if (object) {
            const weekSchedule = object.daily_schedules?.[effectiveWeekIndex];
            const daySchedule = (weekSchedule as any)?.[currentDayKey];
            if (daySchedule && daySchedule.hours > 0) {
                return true;
            }
        }
        return false;
      }
      return false;
    });

    const mappedOrders: DisplayOrder[] = todaysOrders.map(order => ({
      id: order.id,
      title: order.title,
      status: order.status,
      due_date: order.due_date,
      assignedEmployees: order.order_employee_assignments?.map((a: any) => {
        const employee = Array.isArray(a.employees) ? a.employees[0] : a.employees;
        const name = `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim();
        return {
          employeeId: a.employee_id,
          name: name || 'Unbekannt',
          avatarUrl: null,
          assigned_daily_schedules: a.assigned_daily_schedules,
          assigned_recurrence_interval_weeks: a.assigned_recurrence_interval_weeks,
          assigned_start_week_offset: a.assigned_start_week_offset,
        };
      }) || [],
      customer_name: order.customers?.[0]?.name || null,
      object_name: order.objects?.[0]?.name || null,
      order_type: order.order_type,
      recurring_start_date: order.recurring_start_date,
      object: order.objects?.[0] || null,
    }));

    categorizeOrders(mappedOrders);
    if (isInitialLoad) {
      setLoading(false);
    }
  }, [supabase, categorizeOrders]);

  useEffect(() => {
    fetchData(true); // Initial load with loading state
    const interval = setInterval(() => fetchData(false), 60000); // Subsequent loads without loading state
    return () => clearInterval(interval);
  }, [fetchData]);

  const renderOrderCard = (order: DisplayOrder) => {
    const location = [order.object_name, order.customer_name].filter(Boolean).join(' - ');
    return (
      <div key={order.id} className="border p-3 rounded-md space-y-2 bg-background/70 hover:bg-muted/50 transition-colors">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold text-sm">{order.title}</p>
            <p className="text-xs text-muted-foreground">{location}</p>
          </div>
          <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
        </div>
        
        {order.assignedEmployees.length > 0 && (
          <div className="pt-2 mt-2 border-t space-y-2">
            {order.assignedEmployees.map(emp => {
              const assignedTime = getAssignedTimeForEmployeeToday(emp, order);
              return (
                <div key={emp.employeeId} className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{emp.name}</span>
                    </div>
                    {assignedTime ? (
                      <Badge variant="outline" className="font-mono text-xs">{assignedTime.start} - {assignedTime.end}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">N/A</Badge>
                    )}
                  </div>
                  {assignedTime && order.status !== 'completed' && (
                    <TimeProgressBar startTime={assignedTime.start} endTime={assignedTime.end} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending': default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <Briefcase className="mr-2 h-5 w-5" /> Heutige Einsätze
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-neumorphic glassmorphism-card">
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl font-bold flex items-center">
          <Briefcase className="mr-2 h-5 w-5" /> Heutige Einsätze
        </CardTitle>
        <CardDescription>
          Eine Übersicht aller geplanten, laufenden und abgeschlossenen Aufträge für heute.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={['upcoming', 'inProgress']} className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <AccordionItem value="upcoming" className="border rounded-lg bg-card/50">
            <AccordionTrigger className="p-4 hover:no-underline">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <Hourglass className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <p className="font-semibold">Bevorstehend</p>
                  </div>
                </div>
                <Badge variant="secondary">{upcomingOrders.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 pt-0 h-[40vh] overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,white_5%,white_95%,transparent)]">
              {upcomingOrders.length > 0 ? (
                <div className="space-y-3">{upcomingOrders.map(renderOrderCard)}</div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">Keine bevorstehenden Aufträge.</p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="inProgress" className="border rounded-lg bg-card/50">
            <AccordionTrigger className="p-4 hover:no-underline">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <PlayCircle className="h-5 w-5 text-warning" />
                  <div className="text-left">
                    <p className="font-semibold">In Bearbeitung</p>
                  </div>
                </div>
                <Badge variant="secondary">{inProgressOrders.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 pt-0 h-[40vh] overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,white_5%,white_95%,transparent)]">
              {inProgressOrders.length > 0 ? (
                <div className="space-y-3">{inProgressOrders.map(renderOrderCard)}</div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">Keine Aufträge in Bearbeitung.</p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="completed" className="border rounded-lg bg-card/50">
            <AccordionTrigger className="p-4 hover:no-underline">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <div className="text-left">
                    <p className="font-semibold">Abgeschlossen</p>
                  </div>
                </div>
                <Badge variant="secondary">{completedOrders.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 pt-0 h-[40vh] overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,white_5%,white_95%,transparent)]">
              {completedOrders.length > 0 ? (
                <div className="space-y-3">{completedOrders.map(renderOrderCard)}</div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">Noch keine Aufträge abgeschlossen.</p>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}