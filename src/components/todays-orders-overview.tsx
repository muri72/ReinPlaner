"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, getWeek, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderEditDialog } from "@/components/order-edit-dialog";
import { OrderPlanningDialog } from "@/components/order-planning-dialog";
import { Briefcase, CalendarDays, Clock, UserRound, Building, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AssignedEmployee } from "@/components/order-form";
import { TimeProgressBar } from "@/components/time-progress-bar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DisplayOrder {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  customer_id: string | null;
  object_id: string | null;
  employee_ids: string[] | null;
  employee_first_names: string[] | null;
  employee_last_names: string[] | null;
  assignedEmployees: AssignedEmployee[];
  customer_contact_id: string | null;
  customer_name: string | null;
  object_name: string | null;
  customer_contact_first_name: string | null;
  customer_contact_last_name: string | null;
  order_type: string;
  recurring_start_date: string | null;
  recurring_end_date: string | null;
  priority: string;
  total_estimated_hours: number | null;
  notes: string | null;
  request_status: string;
  service_type: string | null;
  object: { recurrence_interval_weeks: number; start_week_offset: number; daily_schedules: any[]; } | null;
}

interface EmployeeSchedule {
  employeeName: string;
  employeeAvatarUrl: string | null;
  totalHours: number;
  orders: DisplayOrder[];
}

const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export function TodaysOrdersOverview() {
  const supabase = createClient();
  const [employeeSchedules, setEmployeeSchedules] = useState<Record<string, EmployeeSchedule>>({});
  const [loading, setLoading] = useState(true);

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

    const { data: allEmployees, error: employeesError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, profiles ( avatar_url )');
    if (employeesError) {
      console.error("Fehler beim Laden der Mitarbeiter:", employeesError);
      toast.error("Fehler beim Laden der Mitarbeiterdaten.");
    }

    let query = supabase
      .from('orders')
      .select(`
        id, title, description, status, due_date, customer_id, object_id, customer_contact_id, order_type, recurring_start_date, recurring_end_date, priority, total_estimated_hours, notes, request_status, service_type,
        objects ( name, recurrence_interval_weeks, start_week_offset, daily_schedules ),
        customers ( name ),
        customer_contacts ( first_name, last_name ),
        order_employee_assignments ( 
          employee_id, 
          assigned_daily_schedules,
          assigned_recurrence_interval_weeks, assigned_start_week_offset,
          employees ( first_name, last_name ) 
        )
      `)
      .eq('request_status', 'approved')
      .or(`due_date.eq.${format(today, 'yyyy-MM-dd')},and(recurring_start_date.lte.${format(today, 'yyyy-MM-dd')},or(recurring_end_date.gte.${format(today, 'yyyy-MM-dd')},recurring_end_date.is.null))`)
      .order('due_date', { ascending: true })
      .order('recurring_start_date', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("Fehler beim Laden der heutigen Aufträge:", error.message);
      toast.error("Fehler beim Laden der heutigen Aufträge.");
      setEmployeeSchedules({});
    } else {
      const mappedOrders = data.map(order => {
        const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
        const object = Array.isArray(order.objects) ? order.objects[0] : order.objects;
        const customerContact = Array.isArray(order.customer_contacts) ? order.customer_contacts[0] : order.customer_contacts;
        
        const mappedAssignments: AssignedEmployee[] = order.order_employee_assignments?.map((a: any) => ({
          employeeId: a.employee_id,
          assigned_daily_schedules: a.assigned_daily_schedules,
          assigned_recurrence_interval_weeks: a.assigned_recurrence_interval_weeks,
          assigned_start_week_offset: a.assigned_start_week_offset,
        })) || [];

        return {
          id: order.id,
          title: order.title,
          description: order.description,
          status: order.status,
          due_date: order.due_date,
          customer_id: order.customer_id,
          object_id: order.object_id,
          employee_ids: order.order_employee_assignments?.map((a: any) => a.employee_id) || null,
          employee_first_names: order.order_employee_assignments?.map((a: any) => {
            const employee = Array.isArray(a.employees) ? a.employees[0] : a.employees;
            return employee?.first_name || '';
          }) || null,
          employee_last_names: order.order_employee_assignments?.map((a: any) => {
            const employee = Array.isArray(a.employees) ? a.employees[0] : a.employees;
            return employee?.last_name || '';
          }) || null,
          assignedEmployees: mappedAssignments,
          customer_contact_id: order.customer_contact_id,
          customer_name: customer?.name || null,
          object_name: object?.name || null,
          customer_contact_first_name: customerContact?.first_name || null,
          customer_contact_last_name: customerContact?.last_name || null,
          order_type: order.order_type,
          recurring_start_date: order.recurring_start_date,
          recurring_end_date: order.recurring_end_date,
          priority: order.priority,
          total_estimated_hours: order.total_estimated_hours,
          notes: order.notes,
          request_status: order.request_status,
          service_type: order.service_type,
          object: object || null,
        } as DisplayOrder;
      });

      const groupedByEmployee: Record<string, EmployeeSchedule> = {};

      mappedOrders.forEach(order => {
        order.assignedEmployees?.forEach(assignment => {
          const employee = allEmployees?.find(e => e.id === assignment.employeeId);
          if (employee) {
            const employeeId = employee.id;
            const employeeName = `${employee.first_name} ${employee.last_name}`;
            const employeeAvatarUrl = (employee.profiles as any)?.avatar_url || null;

            if (!groupedByEmployee[employeeId]) {
              groupedByEmployee[employeeId] = {
                employeeName,
                employeeAvatarUrl,
                orders: [],
                totalHours: 0,
              };
            }
            
            const todayDayOfWeek = today.getDay();
            const currentDayKey = dayNames[todayDayOfWeek];
            
            const recurrenceInterval = assignment.assigned_recurrence_interval_weeks || order.object?.recurrence_interval_weeks || 1;
            const startWeekOffset = assignment.assigned_start_week_offset || order.object?.start_week_offset || 0;
            const orderStartDate = order.recurring_start_date ? new Date(order.recurring_start_date) : today;
            const daysPassed = differenceInDays(today, orderStartDate);
            
            if (daysPassed >= 0) {
              const weeksPassed = Math.floor(daysPassed / 7);
              const effectiveWeekIndex = (weeksPassed + startWeekOffset) % recurrenceInterval;
              
              const weekSchedule = assignment.assigned_daily_schedules?.[effectiveWeekIndex];
              const daySchedule = (weekSchedule as any)?.[currentDayKey];
              const dailyHours = daySchedule?.hours || 0;

              if (dailyHours > 0) {
                groupedByEmployee[employeeId].orders.push(order);
                groupedByEmployee[employeeId].totalHours += dailyHours;
              }
            }
          }
        });
      });

      setEmployeeSchedules(groupedByEmployee);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending':
      default: return 'outline';
    }
  };

  const getAssignedTimeForToday = (order: DisplayOrder, employeeId: string): { start: string; end: string } | null => {
    const assignment = order.assignedEmployees?.find(a => a.employeeId === employeeId);
    if (!assignment) return null;

    const today = new Date();
    const todayDayOfWeek = today.getDay();
    const currentDayKey = dayNames[todayDayOfWeek];

    const employeeRecurrenceInterval = assignment.assigned_recurrence_interval_weeks || order.object?.recurrence_interval_weeks || 1;
    const employeeStartWeekOffset = assignment.assigned_start_week_offset || order.object?.start_week_offset || 0;
    const orderStartDateForWeekCalc = order.recurring_start_date ? new Date(order.recurring_start_date) : today;
    
    const daysPassed = differenceInDays(today, orderStartDateForWeekCalc);
    if (daysPassed < 0) return null;

    const weeksPassed = Math.floor(daysPassed / 7);
    const effectiveWeekIndex = (weeksPassed + employeeStartWeekOffset) % employeeRecurrenceInterval;

    const weekSchedule = assignment.assigned_daily_schedules?.[effectiveWeekIndex];
    const daySchedule = (weekSchedule as any)?.[currentDayKey];

    const startTime = daySchedule?.start;
    const endTime = daySchedule?.end;

    if (startTime && endTime) {
      return { start: startTime, end: endTime };
    }
    return null;
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
        ) : Object.keys(employeeSchedules).length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            <p className="text-base font-semibold">Keine Einsätze für heute geplant.</p>
            <p className="text-sm">Zeit für eine Tasse Kaffee!</p>
          </div>
        ) : (
          <Accordion type="multiple" className="w-full space-y-2">
            {Object.entries(employeeSchedules).map(([employeeId, schedule]) => (
              <AccordionItem key={employeeId} value={employeeId} className="border rounded-lg bg-card/50">
                <AccordionTrigger className="p-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={schedule.employeeAvatarUrl || undefined} />
                      <AvatarFallback>{schedule.employeeName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-semibold">{schedule.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{schedule.orders.length} {schedule.orders.length === 1 ? 'Einsatz' : 'Einsätze'} / {schedule.totalHours.toFixed(2)} Std.</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0">
                  <div className="space-y-3">
                    {schedule.orders.map(order => {
                      const assignedTime = getAssignedTimeForToday(order, employeeId);
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
                              <TimeProgressBar startTime={assignedTime.start} endTime={assignedTime.end} />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}