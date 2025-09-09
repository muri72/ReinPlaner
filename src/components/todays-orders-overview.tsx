"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, getWeek, differenceInDays, parse } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, CalendarDays, Clock, UserRound, Building, CheckCircle2, PlayCircle, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AssignedEmployee } from "@/components/order-form";
import { TimeProgressBar } from "@/components/time-progress-bar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DisplayOrder {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  assignedEmployees: AssignedEmployee[];
  customer_name: string | null;
  object_name: string | null;
  order_type: string;
  recurring_start_date: string | null;
  object: { recurrence_interval_weeks: number; start_week_offset: number; } | null;
  description: string | null;
  customer_id: string | null;
  object_id: string | null;
  employee_ids: string[] | null;
  employee_first_names: string[] | null;
  employee_last_names: string[] | null;
  customer_contact_id: string | null;
  customer_contact_first_name: string | null;
  customer_contact_last_name: string | null;
  recurring_end_date: string | null;
  priority: string;
  total_estimated_hours: number | null;
  notes: string | null;
  request_status: string;
  service_type: string | null;
}

interface EmployeeSchedule {
  employeeName: string;
  employeeAvatarUrl: string | null;
  totalHours: number;
  orders: (DisplayOrder & { assignedTimeToday: { start: string; end: string } | null })[];
}

const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export function TodaysOrdersOverview() {
  const supabase = createClient();
  const [upcomingOrders, setUpcomingOrders] = useState<DisplayOrder[]>([]);
  const [inProgressOrders, setInProgressOrders] = useState<DisplayOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<DisplayOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const getAssignedTimeForToday = (order: DisplayOrder): { start: string; end: string } | null => {
    if (!order.assignedEmployees || order.assignedEmployees.length === 0) return null;
    const today = new Date();
    const todayDayOfWeek = today.getDay();
    const currentDayKey = dayNames[todayDayOfWeek];

    // For simplicity, we'll check the first assigned employee's schedule.
    // A more complex system might show times for each assigned employee.
    const assignment = order.assignedEmployees[0];
    if (!assignment) return null;

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Benutzer nicht authentifiziert.");
      setLoading(false);
      return;
    }

    let query = supabase
      .from('orders')
      .select(`
        id, title, status, due_date, customer_id, object_id, order_type, recurring_start_date, recurring_end_date,
        objects ( name, recurrence_interval_weeks, start_week_offset ),
        customers ( name ),
        order_employee_assignments ( 
          employee_id, 
          assigned_daily_schedules,
          assigned_recurrence_interval_weeks, assigned_start_week_offset,
          employees ( first_name, last_name, profiles ( avatar_url ) )
        )
      `)
      .eq('request_status', 'approved')
      .or(`due_date.eq.${format(today, 'yyyy-MM-dd')},and(recurring_start_date.lte.${format(today, 'yyyy-MM-dd')},or(recurring_end_date.gte.${format(today, 'yyyy-MM-dd')},recurring_end_date.is.null))`);

    const { data, error } = await query;

    if (error) {
      console.error("Fehler beim Laden der heutigen Aufträge:", error.message);
      toast.error("Fehler beim Laden der heutigen Aufträge.");
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
        return true;
      }
      return false;
    });

    const upcoming: DisplayOrder[] = [];
    const inProgress: DisplayOrder[] = [];
    const completed: DisplayOrder[] = [];

    todaysOrders.forEach(order => {
      const mappedOrder: DisplayOrder = {
        id: order.id,
        title: order.title,
        status: order.status,
        due_date: order.due_date,
        assignedEmployees: order.order_employee_assignments?.map((a: any) => ({
          employeeId: a.employee_id,
          assigned_daily_schedules: a.assigned_daily_schedules,
          assigned_recurrence_interval_weeks: a.assigned_recurrence_interval_weeks,
          assigned_start_week_offset: a.assigned_start_week_offset,
        })) || [],
        customer_name: order.customers?.[0]?.name || null,
        object_name: order.objects?.[0]?.name || null,
        order_type: order.order_type,
        recurring_start_date: order.recurring_start_date,
        object: order.objects?.[0] || null,
        // Add other fields if needed by child components
        description: null, customer_id: null, object_id: null, employee_ids: null, employee_first_names: null, employee_last_names: null, customer_contact_id: null, customer_contact_first_name: null, customer_contact_last_name: null, recurring_end_date: null, priority: '', total_estimated_hours: null, notes: null, request_status: '', service_type: null
      };

      if (order.status === 'completed') {
        completed.push(mappedOrder);
      } else {
        const assignedTime = getAssignedTimeForToday(mappedOrder);
        if (assignedTime) {
          const now = new Date();
          const startTime = parse(assignedTime.start, 'HH:mm', new Date());
          startTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
          
          if (now < startTime) {
            upcoming.push(mappedOrder);
          } else {
            inProgress.push(mappedOrder);
          }
        } else {
          upcoming.push(mappedOrder); // If no specific time, assume it's upcoming
        }
      }
    });

    setUpcomingOrders(upcoming);
    setInProgressOrders(inProgress);
    setCompletedOrders(completed);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderOrderCard = (order: DisplayOrder) => {
    const assignedTime = getAssignedTimeForToday(order);
    return (
      <div key={order.id} className="border p-3 rounded-md space-y-2 bg-background/70">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold text-sm">{order.title}</p>
            <p className="text-xs text-muted-foreground">{order.object_name} ({order.customer_name})</p>
          </div>
          <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
        </div>
        {assignedTime && (
          <>
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="mr-2 h-4 w-4" />
              <span>{assignedTime.start} - {assignedTime.end}</span>
            </div>
            {order.status !== 'completed' && <TimeProgressBar startTime={assignedTime.start} endTime={assignedTime.end} />}
          </>
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

  return (
    <Card className="shadow-neumorphic glassmorphism-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <Briefcase className="mr-2 h-5 w-5" /> Heutige Einsätze
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={['upcoming', 'inProgress']} className="w-full space-y-2">
            <AccordionItem value="upcoming" className="border rounded-lg bg-card/50">
              <AccordionTrigger className="p-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <Hourglass className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <p className="font-semibold">Bevorstehend ({upcomingOrders.length})</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0">
                {upcomingOrders.length > 0 ? (
                  <div className="space-y-3">{upcomingOrders.map(renderOrderCard)}</div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">Keine bevorstehenden Aufträge.</p>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="inProgress" className="border rounded-lg bg-card/50">
              <AccordionTrigger className="p-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <PlayCircle className="h-5 w-5 text-warning" />
                  <div className="text-left">
                    <p className="font-semibold">In Bearbeitung ({inProgressOrders.length})</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0">
                {inProgressOrders.length > 0 ? (
                  <div className="space-y-3">{inProgressOrders.map(renderOrderCard)}</div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">Keine Aufträge in Bearbeitung.</p>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="completed" className="border rounded-lg bg-card/50">
              <AccordionTrigger className="p-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <div className="text-left">
                    <p className="font-semibold">Abgeschlossen ({completedOrders.length})</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0">
                {completedOrders.length > 0 ? (
                  <div className="space-y-3">{completedOrders.map(renderOrderCard)}</div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">Noch keine Aufträge abgeschlossen.</p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}