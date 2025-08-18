import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Briefcase, CalendarDays, DollarSign, MessageSquare, Star, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { TodaysOrdersOverview } from "@/components/todays-orders-overview"; // Reuse for today's orders
import { GiveOrderFeedbackDialog } from "@/components/give-order-feedback-dialog";
import { GiveGeneralFeedbackDialog } from "@/components/give-general-feedback-dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CustomerOrderRequestDialog } from "@/components/customer-order-request-dialog"; // Import the new dialog

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

  if (profileError) { // Added error logging for profile fetching
    console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || JSON.stringify(profileError));
  }

  if (profile?.role !== 'customer') {
    redirect("/dashboard"); // Ensure only customers access this page
  }

  const customerName = profile?.first_name || user.email;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch customer's associated customer_id
  const { data: customerData, error: customerError } = await supabase
    .from('customers')
    .select('id, name, contact_email, contact_phone, customer_type, contractual_services') // Added contractual_services
    .eq('user_id', user.id)
    .single();

  if (customerError && customerError.code !== 'PGRST116') {
    console.error("Fehler beim Laden der Kundendaten:", customerError?.message || JSON.stringify(customerError));
  }

  const customerId = customerData?.id || null;

  // Fetch next upcoming order
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
        order_employee_assignments!inner(employee_id)
      `)
      .eq('customer_id', customerId)
      .eq('request_status', 'approved')
      .order('due_date', { ascending: true })
      .order('recurring_start_date', { ascending: true })
      .limit(5); // Fetch a few to find the next one

    if (upcomingOrdersError) {
      console.error("Fehler beim Laden der kommenden Aufträge:", upcomingOrdersError?.message || JSON.stringify(upcomingOrdersError));
    } else {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // Filter for orders that are active today or in the future
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

      // Sort to find the very next one
      relevantOrders?.sort((a, b) => {
        const dateA = a.due_date ? new Date(a.due_date) : (a.recurring_start_date ? new Date(a.recurring_start_date) : new Date(0));
        const dateB = b.due_date ? new Date(b.due_date) : (b.recurring_start_date ? new Date(b.recurring_start_date) : new Date(0));
        return dateA.getTime() - dateB.getTime();
      });

      nextOrder = relevantOrders?.[0] || null;

      // Check status for today's orders
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

  // Fetch all orders for booking overview
  const { data: allCustomerOrders, error: allOrdersError } = await supabase
    .from('orders')
    .select(`
      id,
      title,
      description,
      status,
      due_date,
      order_type,
      recurring_start_date,
      recurring_end_date,
      priority,
      total_estimated_hours,
      notes,
      request_status,
      service_type,
      objects ( name )
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (allOrdersError) console.error("Fehler beim Laden aller Kundenaufträge:", allOrdersError?.message || JSON.stringify(allOrdersError));

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
              <CustomerOrderRequestDialog customerId={customerId} /> {/* New booking request button */}
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
          {/* Hier könnten später Links zu Rechnungen oder Zahlungsoptionen stehen */}
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