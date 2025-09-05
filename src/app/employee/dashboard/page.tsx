"use client";

import { createClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, getWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { Briefcase, CalendarDays, MapPin, UserRound, Clock, FileText, CheckCircle2, AlertCircle, Wrench, ListChecks, MessageSquare } from "lucide-react";
import { EmployeeTimeTracker } from "@/components/employee-time-tracker";
import { GiveGeneralFeedbackDialog } from "@/components/give-general-feedback-dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TodaysOrdersOverview } from "@/components/todays-orders-overview";
import type { DisplayOrder } from '@/app/dashboard/orders/page';
import { AssignedEmployee } from "@/components/order-form";
import { TicketCreateDialog } from "@/components/ticket-create-dialog";
import { sendNotification } from "@/lib/actions/notifications";
import { v4 as uuidv4 } from 'uuid';
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { LoadingOverlay } from "@/components/loading-overlay";

interface RawEmployeeOrderResponse {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  order_type: string;
  recurring_start_date: string | null;
  recurring_end_date: string | null;
  priority: string;
  total_estimated_hours: number | null;
  notes: string | null;
  service_type: string | null;
  request_status: string;
  objects: { name: string | null; address: string | null; notes: string | null; time_of_day: string | null; access_method: string | null; pin: string | null; is_alarm_secured: boolean | null; alarm_password: string | null; security_code_word: string | null; recurrence_interval_weeks: number; start_week_offset: number; daily_schedules: any[]; }[] | null;
  customers: { name: string | null; }[] | null;
  customer_contacts: { first_name: string | null; last_name: string | null; phone: string | null; }[] | null;
  order_employee_assignments: { 
    employee_id: string; 
    assigned_daily_schedules: any[];
    assigned_recurrence_interval_weeks: number;
    assigned_start_week_offset: number;
    employees: { first_name: string | null; last_name: string | null }[] | null;
  }[] | null;
}

export default function EmployeeDashboardPage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [employeeName, setEmployeeName] = useState('');
  const [todaysAssignedOrders, setTodaysAssignedOrders] = useState<DisplayOrder[]>([]);
  const [todayOrderStatus, setTodayOrderStatus] = useState("Kein Auftrag geplant.");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
      return;
    }
    setUser(user);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, role')
      .eq('id', user.id)
      .single();

    if (profileError) console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || JSON.stringify(profileError));
    if (profile?.role !== 'employee') redirect("/dashboard");

    setEmployeeName(profile?.first_name || user.email || '');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: employeeData, error: employeeDataError } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (employeeDataError && employeeDataError.code !== 'PGRST116') console.error("Fehler beim Laden der Mitarbeiterdaten:", employeeDataError?.message || JSON.stringify(employeeDataError));

    const employeeId = employeeData?.id || null;

    if (employeeId) {
      const { data: allAssignedOrders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id, title, description, status, due_date, order_type, recurring_start_date, recurring_end_date, priority, total_estimated_hours, notes, service_type, request_status,
          objects ( name, address, notes, time_of_day, access_method, pin, is_alarm_secured, alarm_password, security_code_word, recurrence_interval_weeks, start_week_offset, daily_schedules ),
          customers ( name ),
          customer_contacts ( first_name, last_name, phone ),
          order_employee_assignments!inner ( employee_id, assigned_daily_schedules, assigned_recurrence_interval_weeks, assigned_start_week_offset, employees ( first_name, last_name ) )
        `)
        .eq('order_employee_assignments.employee_id', employeeId)
        .eq('request_status', 'approved')
        .or(`due_date.eq.${format(today, 'yyyy-MM-dd')},and(recurring_start_date.lte.${format(today, 'yyyy-MM-dd')},or(recurring_end_date.gte.${format(today, 'yyyy-MM-dd')},recurring_end_date.is.null))`)
        .order('due_date', { ascending: true })
        .order('recurring_start_date', { ascending: true });

      if (ordersError) {
        console.error("Fehler beim Laden der Aufträge für Mitarbeiter:", ordersError?.message || JSON.stringify(ordersError));
      } else {
        const currentWeekNumber = getWeek(today, { weekStartsOn: 1 });
        const mappedAndFilteredOrders = allAssignedOrders.map((order: RawEmployeeOrderResponse) => {
          const customerData = order.customers?.[0];
          const objectData = order.objects?.[0];
          const customerContactData = order.customer_contacts?.[0];
          const mappedAssignments: AssignedEmployee[] = order.order_employee_assignments?.map((a: any) => ({
              employeeId: a.employee_id,
              assigned_daily_schedules: a.assigned_daily_schedules,
              assigned_recurrence_interval_weeks: a.assigned_recurrence_interval_weeks,
              assigned_start_week_offset: a.assigned_start_week_offset,
          })) || [];

          return {
            id: order.id, user_id: user.id, title: order.title, description: order.description, status: order.status, due_date: order.due_date, created_at: null, customer_id: null, object_id: null,
            employee_ids: order.order_employee_assignments?.map(a => a.employee_id) || null,
            employee_first_names: order.order_employee_assignments?.map(a => a.employees?.[0]?.first_name || '') || null,
            employee_last_names: order.order_employee_assignments?.map(a => a.employees?.[0]?.last_name || '') || null,
            assignedEmployees: mappedAssignments, customer_contact_id: null, customer_name: customerData?.name || null, object_name: objectData?.name || null,
            customer_contact_first_name: customerContactData?.first_name || null, customer_contact_last_name: customerContactData?.last_name || null,
            order_type: order.order_type, recurring_start_date: order.recurring_start_date, recurring_end_date: order.recurring_end_date, priority: order.priority,
            total_estimated_hours: order.total_estimated_hours, notes: order.notes, request_status: order.request_status, service_type: order.service_type,
            order_feedback: [], object: objectData ?? null, customer: customerData ?? null, customer_contact: customerContactData ?? null,
          };
        }).filter(order => {
          const assignedRecurrenceIntervalWeeks = order.assignedEmployees?.[0]?.assigned_recurrence_interval_weeks || order.object?.recurrence_interval_weeks || 1;
          const assignedStartWeekOffset = order.assignedEmployees?.[0]?.assigned_start_week_offset || order.object?.start_week_offset || 0;

          if (assignedRecurrenceIntervalWeeks > 1) {
            const orderStartDate = order.recurring_start_date ? new Date(order.recurring_start_date) : (order.due_date ? new Date(order.due_date) : today);
            const startWeekNumber = getWeek(orderStartDate, { weekStartsOn: 1 });
            let weekDifference = currentWeekNumber - startWeekNumber;
            if (weekDifference < 0) { weekDifference += 52; }
            if (weekDifference % assignedRecurrenceIntervalWeeks !== assignedStartWeekOffset) return false;
          }

          if (order.order_type === 'one_time' && order.due_date) {
            const dueDate = new Date(order.due_date);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === today.getTime();
          }
          if (['recurring', 'permanent', 'substitution'].includes(order.order_type) && order.recurring_start_date) {
            const startDate = new Date(order.recurring_start_date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = order.recurring_end_date ? new Date(order.recurring_end_date) : null;
            if (endDate) endDate.setHours(0, 0, 0, 0);
            return startDate <= today && (!endDate || endDate >= today);
          }
          return false;
        });

        setTodaysAssignedOrders(mappedAndFilteredOrders);

        if (mappedAndFilteredOrders.length > 0) {
          const allCompleted = mappedAndFilteredOrders.every(order => order.status === 'completed');
          const anyInProgress = mappedAndFilteredOrders.some(order => order.status === 'in_progress');
          if (allCompleted) setTodayOrderStatus("Ihr Auftrag heute ist abgeschlossen. Vielen Dank!");
          else if (anyInProgress) setTodayOrderStatus("Ihr Auftrag heute ist in Bearbeitung.");
          else setTodayOrderStatus("Ihr Auftrag heute ist geplant.");
        }
      }
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
      case 'pending': default: return 'outline';
    }
  };

  const getAssignedTimeForToday = (order: DisplayOrder | null) => {
    if (!order || !order.assignedEmployees || order.assignedEmployees.length === 0) return 'N/A';
    const today = new Date();
    const todayDayOfWeek = today.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayKey = dayNames[todayDayOfWeek];
    const assignedData = order.assignedEmployees[0];
    const employeeRecurrenceInterval = assignedData.assigned_recurrence_interval_weeks || order.object?.recurrence_interval_weeks || 1;
    const employeeStartWeekOffset = assignedData.assigned_start_week_offset || order.object?.start_week_offset || 0;
    const orderStartDateForWeekCalc = order.recurring_start_date ? new Date(order.recurring_start_date) : (order.due_date ? new Date(order.due_date) : today);
    const startWeekNumber = getWeek(orderStartDateForWeekCalc, { weekStartsOn: 1 });
    const currentWeekNumber = getWeek(today, { weekStartsOn: 1 });
    let weekDifference = currentWeekNumber - startWeekNumber;
    if (weekDifference < 0) { weekDifference += 52; }
    const effectiveWeekIndex = (weekDifference - employeeStartWeekOffset) % employeeRecurrenceInterval;
    if (employeeRecurrenceInterval > 1 && (weekDifference % employeeRecurrenceInterval !== employeeStartWeekOffset)) return 'N/A (Nicht diese Woche)';
    const weekSchedule = assignedData.assigned_daily_schedules?.[effectiveWeekIndex];
    const daySchedule = (weekSchedule as any)?.[currentDayKey];
    const startTime = daySchedule?.start;
    const endTime = daySchedule?.end;
    if (startTime && endTime) return `${startTime} - ${endTime}`;
    return 'N/A';
  };

  if (loading || !user) {
    return <LoadingOverlay isLoading={true} />;
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Hallo, {employeeName}!</h1>
      <p className="text-sm md:text-base text-muted-foreground">
        Ihr Tagesplan für heute, {format(new Date(), 'EEEE, dd. MMMM yyyy', { locale: de })}.
      </p>
      <EmployeeTimeTracker userId={user.id} />
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <CalendarDays className="mr-2 h-5 w-5" /> Ihr Tagesplan
          </CardTitle>
          <CardDescription>Ihre zugewiesenen Aufträge für heute.</CardDescription>
        </CardHeader>
        <CardContent>
          {todaysAssignedOrders.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              <p className="text-base font-semibold">Keine Aufträge für heute zugewiesen.</p>
              <p className="text-sm">Zeit für eine Tasse Kaffee!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todaysAssignedOrders.map((order: DisplayOrder) => (
                <Card key={order.id} className="shadow-elevation-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center justify-between">
                      <span>{order.title}</span>
                      <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {order.object?.name} ({order.customer?.name})
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {order.object?.address && (
                      <div className="flex items-center">
                        <MapPin className="mr-2 h-4 w-4" />
                        <span>{order.object.address}</span>
                        <Button variant="link" size="sm" asChild className="ml-auto">
                          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.object.address!)}`} target="_blank" rel="noopener noreferrer">
                            Route
                          </a>
                        </Button>
                      </div>
                    )}
                    {order.customer_contact?.first_name && (
                      <div className="flex items-center">
                        <UserRound className="mr-2 h-4 w-4" />
                        <span>Ansprechpartner: {order.customer_contact.first_name} {order.customer_contact.last_name}</span>
                        {order.customer_contact.phone && (
                          <Button variant="link" size="sm" asChild className="ml-auto">
                            <a href={`tel:${order.customer_contact.phone}`}>Anrufen</a>
                          </Button>
                        )}
                      </div>
                    )}
                    {order.service_type && (
                      <div className="flex items-center">
                        <Wrench className="mr-2 h-4 w-4" />
                        <span>Dienstleistung: {order.service_type}</span>
                      </div>
                    )}
                    {order.description && (
                      <div className="flex items-start">
                        <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Details: {order.description}</span>
                      </div>
                    )}
                    {order.notes && (
                      <div className="flex items-start">
                        <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Auftrags-Notizen: {order.notes}</span>
                      </div>
                    )}
                    {order.object?.notes && (
                      <div className="flex items-start">
                        <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Objekt-Hinweise: {order.object.notes}</span>
                      </div>
                    )}
                    {(() => {
                      const todayDayOfWeek = new Date().getDay();
                      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                      const currentDayKey = dayNames[todayDayOfWeek];
                      const assignedEmployee = order.assignedEmployees?.[0];
                      if (!assignedEmployee) return null;
                      const employeeRecurrenceInterval = assignedEmployee.assigned_recurrence_interval_weeks || order.object?.recurrence_interval_weeks || 1;
                      const employeeStartWeekOffset = assignedEmployee.assigned_start_week_offset || order.object?.start_week_offset || 0;
                      const orderStartDateForWeekCalc = order.recurring_start_date ? new Date(order.recurring_start_date) : (order.due_date ? new Date(order.due_date) : new Date());
                      const startWeekNumber = getWeek(orderStartDateForWeekCalc, { weekStartsOn: 1 });
                      const currentWeekNumber = getWeek(new Date(), { weekStartsOn: 1 });
                      let weekDifference = currentWeekNumber - startWeekNumber;
                      if (weekDifference < 0) { weekDifference += 52; }
                      const effectiveWeekIndex = (weekDifference - employeeStartWeekOffset) % employeeRecurrenceInterval;
                      if (employeeRecurrenceInterval > 1 && (weekDifference % employeeRecurrenceInterval !== employeeStartWeekOffset)) return null;
                      const weekSchedule = assignedEmployee.assigned_daily_schedules?.[effectiveWeekIndex];
                      const daySchedule = (weekSchedule as any)?.[currentDayKey];
                      const assignedHoursToday = daySchedule?.hours;
                      if (assignedHoursToday !== null && assignedHoursToday > 0) {
                        return (
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4" />
                            <span>Zugewiesene Stunden heute: {assignedHoursToday.toFixed(1)} Std.</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {(() => {
                      const assignedTime = getAssignedTimeForToday(order);
                      if (assignedTime !== 'N/A') {
                        return (
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4" />
                            <span>Zugewiesene Zeit heute: {assignedTime}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {order.assignedEmployees?.[0]?.assigned_recurrence_interval_weeks && order.assignedEmployees[0].assigned_recurrence_interval_weeks > 1 && (
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <CalendarDays className="mr-1 h-3 w-3" />
                        <span>Wiederholung: Alle {order.assignedEmployees[0].assigned_recurrence_interval_weeks} Wochen (Offset: {order.assignedEmployees[0].assigned_start_week_offset})</span>
                      </div>
                    )}
                    <div className="flex items-center text-muted-foreground">
                      <ListChecks className="mr-2 h-4 w-4" />
                      <span>Material & Aufgaben: (Platzhalter)</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" /> Neues Ticket erstellen
          </CardTitle>
          <CardDescription>Melden Sie ein Problem oder stellen Sie eine Anfrage an die Zentrale.</CardDescription>
        </CardHeader>
        <CardContent>
          <TicketCreateDialog
            onTicketCreated={fetchData}
            triggerButtonText="Ticket erstellen"
            triggerButtonClassName="w-full"
          />
        </CardContent>
      </Card>
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" /> Feedback an Zentrale
          </CardTitle>
          <CardDescription>Melden Sie Probleme oder geben Sie allgemeines Feedback.</CardDescription>
        </CardHeader>
        <CardContent>
          <GiveGeneralFeedbackDialog />
        </CardContent>
      </Card>
    </div>
  );
}