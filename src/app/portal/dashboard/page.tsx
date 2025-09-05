"use client";

import { createClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, getWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { Briefcase, CalendarDays, DollarSign, MessageSquare, Star, FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { TodaysOrdersOverview } from "@/components/todays-orders-overview";
import { GiveOrderFeedbackDialog } from "@/components/give-order-feedback-dialog";
import { GiveGeneralFeedbackDialog } from "@/components/give-general-feedback-dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CustomerOrderRequestDialog } from "@/components/customer-order-request-dialog";
import { TicketCreateDialog } from "@/components/ticket-create-dialog";
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

export default function CustomerDashboardPage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerData, setCustomerData] = useState<any>(null);
  const [nextOrder, setNextOrder] = useState<RawEmployeeOrderResponse | null>(null);
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
    if (profile?.role !== 'customer') redirect("/dashboard");

    setCustomerName(profile?.first_name || user.email || '');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('id, name, contact_email, contact_phone, customer_type, contractual_services')
      .eq('user_id', user.id)
      .single();

    if (customerError && customerError.code !== 'PGRST116') console.error("Fehler beim Laden der Kundendaten:", customerError?.message || JSON.stringify(customerError));
    setCustomerData(customerData);
    const customerId = customerData?.id || null;

    if (customerId) {
      const { data: upcomingOrders, error: upcomingOrdersError } = await supabase
        .from('orders')
        .select(`
          id, title, due_date, recurring_start_date, recurring_end_date, status, order_type,
          objects ( name, recurrence_interval_weeks, start_week_offset, daily_schedules ),
          order_employee_assignments ( employee_id, assigned_daily_schedules, assigned_recurrence_interval_weeks, assigned_start_week_offset, employees ( first_name, last_name ) )
        `)
        .eq('customer_id', customerId)
        .eq('request_status', 'approved')
        .order('due_date', { ascending: true })
        .order('recurring_start_date', { ascending: true })
        .limit(5);

      if (upcomingOrdersError) {
        console.error("Fehler beim Laden der kommenden Aufträge:", upcomingOrdersError?.message || JSON.stringify(upcomingOrdersError));
      } else {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const currentWeekNumber = getWeek(now, { weekStartsOn: 1 });

        const relevantOrders = upcomingOrders?.filter(order => {
          const assignedRecurrenceIntervalWeeks = order.order_employee_assignments?.[0]?.assigned_recurrence_interval_weeks || order.objects?.[0]?.recurrence_interval_weeks || 1;
          const assignedStartWeekOffset = order.order_employee_assignments?.[0]?.assigned_start_week_offset || order.objects?.[0]?.start_week_offset || 0;

          if (assignedRecurrenceIntervalWeeks > 1) {
            const orderStartDate = order.recurring_start_date ? new Date(order.recurring_start_date) : (order.due_date ? new Date(order.due_date) : now);
            const startWeekNumber = getWeek(orderStartDate, { weekStartsOn: 1 });
            let weekDifference = currentWeekNumber - startWeekNumber;
            if (weekDifference < 0) { weekDifference += 52; }
            if (weekDifference % assignedRecurrenceIntervalWeeks !== assignedStartWeekOffset) return false;
          }

          if (order.order_type === 'one_time' && order.due_date) {
            const dueDate = new Date(order.due_date);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate >= now;
          }
          if (['recurring', 'permanent', 'substitution'].includes(order.order_type) && order.recurring_start_date) {
            const startDate = new Date(order.recurring_start_date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = order.recurring_end_date ? new Date(order.recurring_end_date) : null;
            if (endDate) endDate.setHours(0, 0, 0, 0);
            return (startDate <= now && (!endDate || endDate >= now)) || startDate > now;
          }
          return false;
        });

        relevantOrders?.sort((a, b) => {
          const dateA = a.due_date ? new Date(a.due_date) : (a.recurring_start_date ? new Date(a.recurring_start_date) : new Date(0));
          const dateB = b.due_date ? new Date(b.due_date) : (b.recurring_start_date ? new Date(b.recurring_start_date) : new Date(0));
          return dateA.getTime() - dateB.getTime();
        });

        setNextOrder((relevantOrders?.[0] as RawEmployeeOrderResponse) || null);

        const todaysOrders = upcomingOrders?.filter(order => {
          const assignedRecurrenceIntervalWeeks = order.order_employee_assignments?.[0]?.assigned_recurrence_interval_weeks || order.objects?.[0]?.recurrence_interval_weeks || 1;
          const assignedStartWeekOffset = order.order_employee_assignments?.[0]?.assigned_start_week_offset || order.objects?.[0]?.start_week_offset || 0;

          if (assignedRecurrenceIntervalWeeks > 1) {
            const orderStartDate = order.recurring_start_date ? new Date(order.recurring_start_date) : (order.due_date ? new Date(order.due_date) : now);
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

        if (todaysOrders && todaysOrders.length > 0) {
          const allCompleted = todaysOrders.every(order => order.status === 'completed');
          const anyInProgress = todaysOrders.some(order => order.status === 'in_progress');
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

  const getAssignedTimeForToday = (order: RawEmployeeOrderResponse | null) => {
    if (!order || !order.order_employee_assignments || order.order_employee_assignments.length === 0) return 'N/A';
    const today = new Date();
    const todayDayOfWeek = today.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayKey = dayNames[todayDayOfWeek];
    const assignedData = order.order_employee_assignments[0];
    const employeeRecurrenceInterval = assignedData.assigned_recurrence_interval_weeks || order.objects?.[0]?.recurrence_interval_weeks || 1;
    const employeeStartWeekOffset = assignedData.assigned_start_week_offset || order.objects?.[0]?.start_week_offset || 0;
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
      <h1 className="text-2xl md:text-3xl font-bold">Willkommen, {customerName}!</h1>
      <p className="text-sm md:text-base text-muted-foreground">
        {todayOrderStatus}
      </p>
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Ihr nächster Termin</CardTitle>
          <CardDescription>Bleiben Sie über Ihre bevorstehenden Buchungen auf dem Laufenden.</CardDescription>
        </CardHeader>
        <CardContent>
          {nextOrder ? (
            <div className="space-y-2">
              <p className="text-base font-semibold">{nextOrder.title} ({Array.isArray(nextOrder.objects) ? nextOrder.objects[0]?.name : 'N/A'})</p>
              <div className="flex items-center text-sm text-muted-foreground">
                <CalendarDays className="mr-2 h-4 w-4" />
                {nextOrder.order_type === "one_time" && nextOrder.due_date && (
                  <span>{format(new Date(nextOrder.due_date), 'dd.MM.yyyy', { locale: de })}</span>
                )}
                {(nextOrder.order_type === "recurring" || nextOrder.order_type === "permanent" || nextOrder.order_type === "substitution") && nextOrder.recurring_start_date && (
                  <span>
                    {format(new Date(nextOrder.recurring_start_date), 'dd.MM.yyyy', { locale: de })}
                    {nextOrder.recurring_end_date && ` - ${format(new Date(nextOrder.recurring_end_date), 'dd.MM.yyyy', { locale: de })}`}
                  </span>
                )}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="mr-2 h-4 w-4" />
                <span>Zugewiesene Zeit: {getAssignedTimeForToday(nextOrder)}</span>
              </div>
              {nextOrder.order_employee_assignments?.[0]?.assigned_recurrence_interval_weeks && nextOrder.order_employee_assignments[0].assigned_recurrence_interval_weeks > 1 && (
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <CalendarDays className="mr-1 h-3 w-3" />
                  <span>Wiederholung: Alle {nextOrder.order_employee_assignments[0].assigned_recurrence_interval_weeks} Wochen (Offset: {nextOrder.order_employee_assignments[0].assigned_start_week_offset})</span>
                </div>
              )}
              <div className="flex items-center text-sm text-muted-foreground">
                <Briefcase className="mr-2 h-4 w-4" />
                <span>Status: <Badge variant={getStatusBadgeVariant(nextOrder.status)}>{nextOrder.status}</Badge></span>
              </div>
              <Button asChild className="mt-4">
                <Link href="/portal/dashboard/bookings">Alle Buchungen ansehen</Link>
              </Button>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              <p>Keine zukünftigen Termine gefunden.</p>
              <CustomerOrderRequestDialog customerId={customerData?.id} />
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" /> Neues Ticket erstellen
          </CardTitle>
          <CardDescription>Melden Sie ein Problem oder stellen Sie eine Anfrage.</CardDescription>
        </CardHeader>
        <CardContent>
          {customerData?.id ? (
            <TicketCreateDialog
              onTicketCreated={fetchData}
              triggerButtonText="Ticket erstellen"
              triggerButtonClassName="w-full"
              initialData={{ customerId: customerData.id }}
            />
          ) : (
            <p className="text-muted-foreground text-sm text-center">
              Ihre Kunden-ID konnte nicht geladen werden. Bitte kontaktieren Sie den Support.
            </p>
          )}
        </CardContent>
      </Card>
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Rechnungen & Zahlungen</CardTitle>
          <CardDescription>Verwalten Sie Ihre Rechnungen und Zahlungen.</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-4">
          <DollarSign className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-base font-semibold">Keine Rechnungen verfügbar</p>
          <p className="text-sm">Diese Funktion wird in Kürze verfügbar sein.</p>
        </CardContent>
      </Card>
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Feedback & Support</CardTitle>
          <CardDescription>Teilen Sie uns Ihre Meinung mit oder erhalten Sie Unterstützung.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GiveOrderFeedbackDialog />
          <GiveGeneralFeedbackDialog />
          <Button variant="outline" className="w-full md:col-span-2">
            <MessageSquare className="mr-2 h-4 w-4" /> Support kontaktieren (Platzhalter)
          </Button>
        </CardContent>
      </Card>
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Ihre Vertragsdetails</CardTitle>
          <CardDescription>Wichtige Informationen zu Ihren gebuchten Leistungen.</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          {customerData?.contractual_services ? (
            <p className="text-sm whitespace-pre-wrap">{customerData.contractual_services}</p>
          ) : (
            <p className="text-center text-sm py-4">Keine spezifischen Vertragsdetails hinterlegt.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}