"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, getWeek, differenceInDays, parse, isToday } from "date-fns";
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
import { dashboardCache, CACHE_KEYS } from "@/lib/performance-cache";
import { getTodaysOrdersRPC, TodaysOrderRPCResult } from "@/lib/todays-orders-rpc";

// Simple debounce utility
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout;

  const debounced = ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    clearTimeout(timeout);
  };

  return debounced;
}

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

    // Try employee-specific schedule first, fallback to object schedule
    let daySchedule = null;

    if (assignment.assigned_daily_schedules && assignment.assigned_daily_schedules.length > 0) {
      const weekSchedule = assignment.assigned_daily_schedules[effectiveWeekIndex];
      daySchedule = (weekSchedule as any)?.[currentDayKey];
    }

    // Fallback to object schedule if no employee-specific schedule
    if (!daySchedule && order.object?.daily_schedules && order.object.daily_schedules.length > 0) {
      const weekSchedule = order.object.daily_schedules[effectiveWeekIndex];
      daySchedule = (weekSchedule as any)?.[currentDayKey];
    }

    const startTime = daySchedule?.start;
    const endTime = daySchedule?.end;

    if (startTime && endTime) {
      return { start: startTime, end: endTime };
    }
    return null;
  };

  const getOrderTimeRangeForToday = (order: DisplayOrder): { start: Date; end: Date } | null => {
    // Get all valid assigned times for today
    const assignedTimes = order.assignedEmployees
      .map(emp => getAssignedTimeForEmployeeToday(emp, order))
      .filter((time): time is { start: string; end: string } => time !== null && time.start && time.end);

    // If no valid times found, return null
    if (assignedTimes.length === 0) {
      return null;
    }

    const now = new Date();

    // Parse all start and end times
    const startDates: Date[] = [];
    const endDates: Date[] = [];

    for (const time of assignedTimes) {
      try {
        const startDate = parse(time.start, 'HH:mm', now);
        const endDate = parse(time.end, 'HH:mm', now);

        // Only add if parsing was successful
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          startDates.push(startDate);
          endDates.push(endDate);
        }
      } catch (error) {
        console.warn(`Failed to parse time for order ${order.id}:`, error);
      }
    }

    // If no valid dates after parsing, return null
    if (startDates.length === 0 || endDates.length === 0) {
      return null;
    }

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
      // If order is marked as completed in database, always show as completed
      if (order.status === 'completed') {
        completed.push(order);
        return;
      }

      const timeRange = getOrderTimeRangeForToday(order);

      // Skip orders that don't have a valid time range for today
      // (they're not actually scheduled for today)
      if (!timeRange || !timeRange.start || !timeRange.end) {
        return;
      }

      const nowTime = now.getTime();
      const startTime = timeRange.start.getTime();
      const endTime = timeRange.end.getTime();

      // Add a 10-minute buffer for status transitions
      const inProgressBuffer = 10 * 60 * 1000; // 10 minutes in ms

      // Upcoming: More than 10 minutes before start time
      if (nowTime < (startTime - inProgressBuffer)) {
        upcoming.push(order);
      }
      // In Progress: Between 10 min before start and 10 min after end
      else if (nowTime >= (startTime - inProgressBuffer) && nowTime <= (endTime + inProgressBuffer)) {
        inProgress.push(order);
      }
      // Completed: More than 10 minutes after end time
      else {
        completed.push(order);
      }
    });

    const sortOrdersByStartTime = (a: DisplayOrder, b: DisplayOrder) => {
      const timeRangeA = getOrderTimeRangeForToday(a);
      const timeRangeB = getOrderTimeRangeForToday(b);

      // Handle null values - put them at the end
      if (!timeRangeA || !timeRangeA.start) return 1;
      if (!timeRangeB || !timeRangeB.start) return -1;

      return timeRangeA.start.getTime() - timeRangeB.start.getTime();
    };

    setUpcomingOrders(upcoming.sort(sortOrdersByStartTime));
    setInProgressOrders(inProgress.sort(sortOrdersByStartTime));
    setCompletedOrders(completed.sort(sortOrdersByStartTime));
  }, []);

  // Memoized helper function for recurring order calculation
  const isRecurringOrderToday = useCallback((
    order: any,
    today: Date
  ): boolean => {
    const recurrenceInterval = order.order_employee_assignments?.[0]?.assigned_recurrence_interval_weeks ||
                              order.recurrence_interval_weeks || 1;
    const startWeekOffset = order.order_employee_assignments?.[0]?.assigned_start_week_offset ||
                            order.start_week_offset || 0;
    const orderStartDate = order.recurring_start_date ? new Date(order.recurring_start_date) : today;
    const daysPassed = differenceInDays(today, orderStartDate);
    if (daysPassed < 0) return false;

    const weeksPassed = Math.floor(daysPassed / 7);
    if ((weeksPassed + startWeekOffset) % recurrenceInterval !== 0) return false;

    const effectiveWeekIndex = (weeksPassed + startWeekOffset) % recurrenceInterval;
    const todayDayOfWeek = today.getDay();
    const currentDayKey = dayNames[todayDayOfWeek];

    // Check employee assignments
    const hasHours = order.order_employee_assignments?.some((assignment: any) => {
      const weekSchedule = assignment.assigned_daily_schedules?.[effectiveWeekIndex];
      const daySchedule = weekSchedule?.[currentDayKey];
      return daySchedule && daySchedule.hours > 0;
    });

    if (hasHours) return true;

    // Check object schedules
    if (order.daily_schedules) {
      const weekSchedule = order.daily_schedules[effectiveWeekIndex];
      const daySchedule = weekSchedule?.[currentDayKey];
      if (daySchedule && daySchedule.hours > 0) {
        return true;
      }
    }

    return false;
  }, []);

  const fetchData = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setLoading(true);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (isInitialLoad) toast.error("Benutzer nicht authentifiziert.");
      setLoading(false);
      return;
    }

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const cacheKey = CACHE_KEYS.TODAYS_ORDERS(user.id, todayStr);

    // Try cache first
    const cachedData = dashboardCache.get<DisplayOrder[]>(cacheKey);
    if (cachedData && !isInitialLoad) {
      console.log('📦 Using cached todays orders');
      categorizeOrders(cachedData);
      setLoading(false);
      return;
    }

    try {
      // Try optimized RPC first
      const rpcData = await getTodaysOrdersRPC(supabase, user.id, todayStr);

      const mappedOrders: DisplayOrder[] = rpcData.map(order => ({
        id: order.order_id,
        title: order.title,
        status: order.status,
        due_date: order.due_date,
        customer_name: order.customer_name,
        object_name: order.object_name,
        order_type: order.order_type,
        recurring_start_date: null,
        object: {
          recurrence_interval_weeks: order.recurrence_interval_weeks,
          start_week_offset: order.start_week_offset,
          daily_schedules: order.daily_schedules || []
        },
        assignedEmployees: order.employee_assignments.map(assignment => ({
          employeeId: assignment.employee_id,
          name: `${assignment.employee.first_name || ''} ${assignment.employee.last_name || ''}`.trim() || 'Unbekannt',
          avatarUrl: null,
          assigned_daily_schedules: assignment.assigned_daily_schedules,
          assigned_recurrence_interval_weeks: assignment.assigned_recurrence_interval_weeks,
          assigned_start_week_offset: assignment.assigned_start_week_offset,
        }))
      }));

      // Cache the results
      dashboardCache.set(cacheKey, mappedOrders);

      categorizeOrders(mappedOrders);
      if (isInitialLoad) setLoading(false);

    } catch (error: any) {
      // Check if RPC function is not available
      if (error?.message?.includes('RPC_NOT_AVAILABLE') || error?.message?.includes('Function get_todays_orders_optimized not found')) {
        console.warn('RPC Function nicht verfügbar - verwende optimierte normale Query');
      } else {
        console.warn('RPC Error, verwende optimierte normale Query:', error?.message);
      }

      // Fallback to regular optimized query
      let query = supabase
        .from('orders')
        .select(`
          id, title, status, due_date, customer_id, object_id, order_type, recurring_start_date,
          objects ( name, recurrence_interval_weeks, start_week_offset, daily_schedules ),
          customers ( name )
        `)
        .eq('request_status', 'approved')
        .or(`due_date.eq.${todayStr},and(recurring_start_date.lte.${todayStr},or(recurring_end_date.gte.${todayStr},recurring_end_date.is.null))`)
        .limit(50); // Reduced limit for faster loading

      const { data: ordersData, error: queryError } = await query;

      if (queryError) {
        console.error("Fehler beim Laden der heutigen Aufträge:", queryError.message);
        if (isInitialLoad) toast.error("Fehler beim Laden der heutigen Aufträge.");
        setLoading(false);
        return;
      }

      if (!ordersData || ordersData.length === 0) {
        categorizeOrders([]);
        if (isInitialLoad) setLoading(false);
        return;
      }

      // Get employee assignments
      const orderIds = ordersData.map(o => o.id);
      const { data: assignmentsData } = await supabase
        .from('order_employee_assignments')
        .select(`
          order_id,
          employee_id,
          assigned_daily_schedules,
          assigned_recurrence_interval_weeks,
          assigned_start_week_offset,
          employees ( first_name, last_name )
        `)
        .in('order_id', orderIds);

      // Combine data with memoized filter
      const data = ordersData.map(order => ({
        ...order,
        order_employee_assignments: assignmentsData?.filter(a => a.order_id === order.id) || []
      }));

      const todaysOrders = data.filter(order => {
        if (order.order_type === 'one_time') return true;
        return ['recurring', 'permanent', 'substitution'].includes(order.order_type) &&
               isRecurringOrderToday(order, today);
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

      // Cache the results
      dashboardCache.set(cacheKey, mappedOrders);

      categorizeOrders(mappedOrders);
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [supabase, categorizeOrders, isRecurringOrderToday]);

  // Memoized categorization function
  const memoizedCategorizeOrders = useCallback((orders: DisplayOrder[]) => {
    categorizeOrders(orders);
  }, [categorizeOrders]);

  // Memoized time range calculator
  const getOrderTimeRange = useCallback((order: DisplayOrder) => {
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
  }, []);

  // Memoized sorting function
  const sortOrdersByStartTime = useCallback((a: DisplayOrder, b: DisplayOrder) => {
    const timeA = getOrderTimeRange(a)?.start.getTime() || Infinity;
    const timeB = getOrderTimeRange(b)?.start.getTime() || Infinity;
    return timeA - timeB;
  }, [getOrderTimeRange]);

  // Debounced fetch to prevent excessive API calls
  const debouncedFetchData = useCallback(
    debounce((isInitialLoad: boolean) => {
      fetchData(isInitialLoad);
    }, 300),
    [fetchData]
  );

  useEffect(() => {
    debouncedFetchData(true); // Initial load with loading state

    // Refresh every 2 minutes instead of 1 (reduced frequency)
    const interval = setInterval(() => {
      debouncedFetchData(false); // Subsequent loads without loading state
    }, 120000);

    return () => {
      clearInterval(interval);
      debouncedFetchData.cancel?.();
    };
  }, [debouncedFetchData]);

  const renderOrderCard = (order: DisplayOrder) => {
    const location = [order.object_name, order.customer_name].filter(Boolean).join(" • ");
    return (
      <div
        key={order.id}
        className="rounded-xl border border-border/60 bg-card/70 p-3 shadow-sm transition-colors hover:bg-accent/40"
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{order.title}</p>
                {location && (
                  <p className="truncate text-xs text-muted-foreground">{location}</p>
                )}
              </div>
              <Badge
                variant={getStatusBadgeVariant(order.status)}
                className="flex-shrink-0 capitalize"
              >
                {order.status.replace("_", " ")}
              </Badge>
            </div>
          </div>

          {order.assignedEmployees.length > 0 && (
            <div className="mt-1 space-y-2 rounded-lg border border-border/40 bg-muted/30 p-2">
              {order.assignedEmployees.map((emp) => {
                const assignedTime = getAssignedTimeForEmployeeToday(emp, order);
                return (
                  <div key={emp.employeeId} className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-muted-foreground/80" />
                        <span className="font-medium text-foreground">{emp.name}</span>
                      </div>
                      {assignedTime ? (
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {assignedTime.start} – {assignedTime.end}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] uppercase">
                          N/A
                        </Badge>
                      )}
                    </div>
                    {assignedTime && order.status !== "completed" && (
                      <TimeProgressBar
                        startTime={assignedTime.start}
                        endTime={assignedTime.end}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
            <AccordionContent className="p-4 pt-0 h-[40vh] overflow-y-auto custom-scrollbar [mask-image:linear-gradient(to_bottom,white_90%,transparent)]">
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
            <AccordionContent className="p-4 pt-0 h-[40vh] overflow-y-auto custom-scrollbar [mask-image:linear-gradient(to_bottom,white_90%,transparent)]">
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
            <AccordionContent className="p-4 pt-0 h-[40vh] overflow-y-auto custom-scrollbar [mask-image:linear-gradient(to_bottom,white_90%,transparent)]">
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