import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Briefcase, CalendarDays, DollarSign, MessageSquare, Star, FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { TodaysOrdersOverview } from "@/components/todays-orders-overview";
import { GiveOrderFeedbackDialog } from "@/components/give-order-feedback-dialog";
import { GiveGeneralFeedbackDialog } from "@/components/give-general-feedback-dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CustomerOrderRequestDialog } from "@/components/customer-order-request-dialog";

// Define an interface for the raw data returned by Supabase select query for employee dashboard
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
  objects: { name: string | null; address: string | null; notes: string | null; time_of_day: string | null; access_method: string | null; pin: string | null; is_alarm_secured: boolean | null; alarm_password: string | null; security_code_word: string | null; total_weekly_hours: number | null; }[] | null;
  customers: { name: string | null; }[] | null;
  customer_contacts: { first_name: string | null; last_name: string | null; phone: string | null; }[] | null;
  order_employee_assignments: { 
    employee_id: string; 
    assigned_daily_hours: number | null;
    assigned_monday_hours: number | null;
    assigned_tuesday_hours: number | null;
    assigned_wednesday_hours: number | null;
    assigned_thursday_hours: number | null;
    assigned_friday_hours: number | null;
    assigned_saturday_hours: number | null;
    assigned_sunday_hours: number | null;
    // New time fields
    assigned_monday_start_time: string | null;
    assigned_monday_end_time: string | null;
    assigned_tuesday_start_time: string | null;
    assigned_tuesday_end_time: string | null;
    assigned_wednesday_start_time: string | null;
    assigned_wednesday_end_time: string | null;
    assigned_thursday_start_time: string | null;
    assigned_thursday_end_time: string | null;
    assigned_friday_start_time: string | null;
    assigned_friday_end_time: string | null;
    assigned_saturday_start_time: string | null;
    assigned_saturday_end_time: string | null;
    assigned_sunday_start_time: string | null;
    assigned_sunday_end_time: string | null;
    employees: { first_name: string | null; last_name: string | null }[] | null; // Correctly typed as array
  }[] | null;
}

export default async function CustomerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, last_name, role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || JSON.stringify(profileError));
  }

  if (profile?.role !== 'customer') {
    redirect("/dashboard");
  }

  const customerName = profile?.first_name || user.email;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: customerData, error: customerError } = await supabase
    .from('customers')
    .select('id, name, contact_email, contact_phone, customer_type, contractual_services')
    .eq('user_id', user.id)
    .single();

  if (customerError && customerError.code !== 'PGRST116') {
    console.error("Fehler beim Laden der Kundendaten:", customerError?.message || JSON.stringify(customerError));
  }

  const customerId = customerData?.id || null;

  let nextOrder = null;
  let todayOrderStatus = "Kein Auftrag geplant.";

  if (customerId) {
    const { data: upcomingOrders, error: upcomingOrdersError } = await supabase
      .from('orders')
      .select(`
        id,
        title,
        due_date,
        recurring_start_date,
        recurring_end_date,
        status,
        order_type,
        objects ( name ),
        order_employee_assignments ( 
          employee_id, 
          assigned_monday_hours, assigned_tuesday_hours, assigned_wednesday_hours,
          assigned_thursday_hours, assigned_friday_hours, assigned_saturday_hours,
          assigned_sunday_hours,
          assigned_monday_start_time, assigned_monday_end_time,
          assigned_tuesday_start_time, assigned_tuesday_end_time,
          assigned_wednesday_start_time, assigned_wednesday_end_time,
          assigned_thursday_start_time, assigned_thursday_end_time,
          assigned_friday_start_time, assigned_friday_end_time,
          assigned_saturday_start_time, assigned_saturday_end_time,
          assigned_sunday_start_time, assigned_sunday_end_time,
          employees ( first_name, last_name ) 
        )
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

      const relevantOrders = upcomingOrders?.filter(order => {
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

      nextOrder = relevantOrders?.[0] || null;

      const todaysOrders = upcomingOrders?.filter(order => {
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
        if (allCompleted) {
          todayOrderStatus = "Ihr Auftrag heute ist abgeschlossen. Vielen Dank!";
        } else if (anyInProgress) {
          todayOrderStatus = "Ihr Auftrag heute ist in Bearbeitung.";
        } else {
          todayOrderStatus = "Ihr Auftrag heute ist geplant.";
        }
      }
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending':
      default: return 'outline';
    }
  };

  const getRequestStatusBadgeVariant = (requestStatus: string) => {
    switch (requestStatus) {
      case 'approved': return 'default';
      case 'pending': return 'warning';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getAssignedTimeForToday = (order: typeof nextOrder) => {
    if (!order || !order.order_employee_assignments || order.order_employee_assignments.length === 0) return 'N/A';

    const todayDayOfWeek = today.getDay(); // 0=So, 1=Mo, ..., 6=Sa
    const assignedData = order.order_employee_assignments[0]; // Assuming one assignment for simplicity

    const dayMap: { [key: number]: { start: string, end: string } } = {
      0: { start: 'assigned_sunday_start_time', end: 'assigned_sunday_end_time' },
      1: { start: 'assigned_monday_start_time', end: 'assigned_monday_end_time' },
      2: { start: 'assigned_tuesday_start_time', end: 'assigned_tuesday_end_time' },
      3: { start: 'assigned_wednesday_start_time', end: 'assigned_wednesday_end_time' },
      4: { start: 'assigned_thursday_start_time', end: 'assigned_thursday_end_time' },
      5: { start: 'assigned_friday_start_time', end: 'assigned_friday_end_time' },
      6: { start: 'assigned_saturday_start_time', end: 'assigned_saturday_end_time' },
    };
    const startKey = dayMap[todayDayOfWeek]?.start;
    const endKey = dayMap[todayDayOfWeek]?.end;

    const startTime = startKey ? (assignedData as any)[startKey] : null;
    const endTime = endKey ? (assignedData as any)[endKey] : null;

    if (startTime && endTime) {
      return `${startTime} - ${endTime}`;
    }
    return 'N/A';
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Willkommen, {customerName}!</h1>
      <p className="text-sm md:text-base text-muted-foreground">
        {todayOrderStatus}
      </p>

      {/* Willkommensbereich & Nächster Termin */}
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
              <CustomerOrderRequestDialog customerId={customerId} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rechnungen & Zahlungen (Platzhalter) */}
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

      {/* Feedback & Support */}
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

      {/* Kundenspezifische Infos */}
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