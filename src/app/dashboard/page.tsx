import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building, UsersRound, Briefcase, Clock, DollarSign, AlertTriangle, MessageSquare, CheckCircle2, TrendingUp, ListOrdered } from "lucide-react";
import { OrderStatusChart } from "@/components/order-status-chart";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from "next/link"; // Import Link for clickable cards
import { FinancialTrendChart } from "@/components/financial-trend-chart"; // Import new chart
import { EmployeeWorkloadChart } from "@/components/employee-workload-chart"; // Import new chart
import { KpiCard } from "@/components/kpi-card"; // Import the new KpiCard
import { TodaysOrdersOverview } from "@/components/todays-orders-overview"; // Import the new component
import { FeedbackCard } from "@/components/feedback-card"; // Import FeedbackCard
import { getRevenueLast7Days, getMostBookedServices } from "@/lib/actions/finances"; // Import new finance actions
import { Badge } from "@/components/ui/badge"; // Hinzugefügt: Import der Badge-Komponente

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Profildaten abrufen
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, last_name, avatar_url, role') // Also fetch role for conditional display
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error("Fehler beim Laden des Profils:", profileError?.message || JSON.stringify(profileError));
  }

  const currentUserRole = profile?.role || 'employee';
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of today for comparison
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // --- KPI Data Fetching ---
  // 1. Geplante Einsätze heute
  const { data: scheduledOrdersToday, error: scheduledOrdersError } = await supabase
    .from('orders')
    .select(`
      id,
      order_type,
      due_date,
      recurring_start_date,
      recurring_end_date,
      status,
      total_estimated_hours
    `)
    .or(`due_date.eq.${format(today, 'yyyy-MM-dd')},and(recurring_start_date.lte.${format(today, 'yyyy-MM-dd')},or(recurring_end_date.gte.${format(today, 'yyyy-MM-dd')},recurring_end_date.is.null))`)
    .in('order_type', ['one_time', 'recurring', 'permanent', 'substitution']);

  const totalScheduledToday = scheduledOrdersToday?.length || 0;
  const completedScheduledToday = scheduledOrdersToday?.filter(order => order.status === 'completed').length || 0;

  if (scheduledOrdersError) console.error("Fehler beim Laden der geplanten Einsätze:", scheduledOrdersError?.message || scheduledOrdersError);

  // 2. Offene Kundenanfragen (request_status = 'pending')
  const { count: pendingCustomerRequests, error: pendingRequestsError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('request_status', 'pending');

  if (pendingRequestsError) console.error("Fehler beim Laden der offenen Kundenanfragen:", pendingRequestsError?.message || pendingRequestsError);

  // 3. Aktive Mitarbeiter im Einsatz (time_entries mit end_time IS NULL)
  const { count: activeEmployeesCount, error: activeEmployeesError } = await supabase
    .from('time_entries')
    .select('employee_id', { count: 'exact', head: true })
    .is('end_time', null)
    .gte('start_time', today.toISOString()) // Only count entries started today
    .lte('start_time', tomorrow.toISOString()); // And not started tomorrow

  if (activeEmployeesError) console.error("Fehler beim Laden der aktiven Mitarbeiter:", activeEmployeesError?.message || activeEmployeesError);

  // 4. Offene Reklamationen heute (general_feedback & order_feedback, created_at = today, is_resolved = false)
  const { data: newGeneralFeedback, error: generalFeedbackError } = await supabase
    .from('general_feedback')
    .select('id')
    .eq('is_resolved', false)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString());

  const { data: newOrderFeedback, error: orderFeedbackError } = await supabase
    .from('order_feedback')
    .select('id')
    .eq('is_resolved', false) // Use the new field
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString());

  const totalNewComplaintsToday = (newGeneralFeedback?.length || 0) + (newOrderFeedback?.length || 0);

  if (generalFeedbackError) console.error("Fehler beim Laden des allgemeinen Feedbacks:", generalFeedbackError?.message || generalFeedbackError);
  if (orderFeedbackError) console.error("Fehler beim Laden des Auftrags-Feedbacks:", orderFeedbackError?.message || orderFeedbackError);

  // 5. Umsatz der letzten 7 Tage
  const revenueResult = await getRevenueLast7Days();
  const revenueLast7Days = revenueResult.success ? revenueResult.data : 0;
  if (!revenueResult.success) console.error("Fehler beim Laden des Umsatzes der letzten 7 Tage:", revenueResult.message);

  // 6. Meistgebuchte Leistungen
  const servicesResult = await getMostBookedServices();
  const mostBookedServices = servicesResult.success ? servicesResult.data : [];
  if (!servicesResult.success) console.error("Fehler beim Laden der meistgebuchten Leistungen:", servicesResult.message);


  // --- Existing Dashboard Data ---
  const { count: customerCount, error: customerCountError } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true });

  const { count: objectCount, error: objectCountError } = await supabase
    .from('objects')
    .select('*', { count: 'exact', head: true });

  const { count: employeeCount, error: employeeCountError } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true });

  // Daten für die Auftragsstatus-Grafik abrufen
  const { data: ordersData, error: ordersStatusError } = await supabase
    .from('orders')
    .select('status');

  if (customerCountError) console.error("Fehler beim Laden der Kundenzahl:", customerCountError?.message || customerCountError);
  if (objectCountError) console.error("Fehler beim Laden der Objektzahl:", objectCountError?.message || objectCountError);
  if (employeeCountError) console.error("Fehler beim Laden der Mitarbeiterzahl:", employeeCountError?.message || employeeCountError);
  if (ordersStatusError) console.error("Fehler beim Laden der Auftragsstatusdaten:", ordersStatusError?.message || ordersStatusError);

  // Auftragsstatus-Zählungen für die Grafik aufbereiten
  const statusCounts = ordersData?.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const chartData = [
    { name: 'Ausstehend', value: statusCounts['pending'] || 0 },
    { name: 'In Bearbeitung', value: statusCounts['in_progress'] || 0 },
    { name: 'Abgeschlossen', value: statusCounts['completed'] || 0 },
  ];

  const formattedDate = format(today, 'EEEE, dd. MMMM yyyy', { locale: de });

  // Fetch unresolved feedback for the dashboard
  const { data: unresolvedOrderFeedback, error: unresolvedOrderFeedbackError } = await supabase
    .from('order_feedback')
    .select(`
      *,
      orders (
        title,
        customers ( name ),
        employees ( first_name, last_name )
      ),
      profiles ( first_name, last_name )
    `)
    .eq('is_resolved', false)
    .order('created_at', { ascending: false })
    .limit(3); // Limit to show only a few on dashboard

  const { data: unresolvedGeneralFeedback, error: unresolvedGeneralFeedbackError } = await supabase
    .from('general_feedback')
    .select(`
      *,
      profiles ( first_name, last_name )
    `)
    .eq('is_resolved', false)
    .order('created_at', { ascending: false })
    .limit(3); // Limit to show only a few on dashboard

  if (unresolvedOrderFeedbackError) console.error("Fehler beim Laden des ungelösten Auftrags-Feedbacks:", unresolvedOrderFeedbackError?.message || unresolvedOrderFeedbackError);
  if (unresolvedGeneralFeedbackError) console.error("Fehler beim Laden des ungelösten allgemeinen Feedbacks:", unresolvedGeneralFeedbackError?.message || unresolvedGeneralFeedbackError);

  const mappedUnresolvedOrderFeedback = unresolvedOrderFeedback?.map(f => ({
    ...f,
    order: {
      title: f.orders?.[0]?.title || 'Unbekannter Auftrag',
      customer_name: f.orders?.[0]?.customers?.[0]?.name || 'N/A',
      employee_name: `${f.orders?.[0]?.employees?.[0]?.first_name || ''} ${f.orders?.[0]?.employees?.[0]?.last_name || ''}`.trim() || 'N/A',
    },
    replied_by_name: `${f.profiles?.first_name || ''} ${f.profiles?.last_name || ''}`.trim() || 'Admin',
  })) || [];

  const mappedUnresolvedGeneralFeedback = unresolvedGeneralFeedback?.map(f => ({
    ...f,
    replied_by_name: `${f.profiles?.first_name || ''} ${f.profiles?.last_name || ''}`.trim() || 'Admin',
  })) || [];

  const allUnresolvedFeedback = [...mappedUnresolvedOrderFeedback, ...mappedUnresolvedGeneralFeedback].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());


  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">
        Willkommen im Dashboard, {profile?.first_name || user.email}!
      </h1>
      <p className="text-sm md:text-base text-muted-foreground">
        Heute ist der {formattedDate}.
      </p>

      {/* Obere KPI-Leiste */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          title="Geplante Einsätze heute"
          value={totalScheduledToday}
          description="Aufträge für heute geplant"
          icon="Briefcase"
          linkHref="/dashboard/orders"
          progress={{
            current: completedScheduledToday,
            total: totalScheduledToday,
            label: `${completedScheduledToday} von ${totalScheduledToday} abgeschlossen`
          }}
        />
        <KpiCard
          title="Offene Anfragen"
          value={pendingCustomerRequests ?? 0}
          description="Kundenanfragen zur Bearbeitung"
          icon="AlertTriangle"
          linkHref="/dashboard/orders?requestStatus=pending"
          valueColorClass="text-warning"
        />
        <KpiCard
          title="Aktive Mitarbeiter"
          value={activeEmployeesCount ?? 0}
          description="Mitarbeiter aktuell im Einsatz"
          icon="UsersRound"
          linkHref="/dashboard/time-tracking"
          valueColorClass="text-success"
        />
        <KpiCard
          title="Umsatz letzte 7 Tage"
          value={`${(revenueLast7Days ?? 0).toFixed(2)} €`}
          description="Geschätzter Umsatz der letzten 7 Tage"
          icon="TrendingUp"
          linkHref="/dashboard/finances"
          valueColorClass="text-primary"
        />
        <KpiCard
          title="Reklamationen heute"
          value={totalNewComplaintsToday}
          description="Neue Beschwerden eingegangen"
          icon="MessageSquare"
          linkHref="/dashboard/feedback"
          valueColorClass={totalNewComplaintsToday > 0 ? "text-destructive" : "text-success"}
        />
      </div>

      {/* Einsatzübersicht (Tagesliste) */}
      <TodaysOrdersOverview />

      {/* Qualität & Reklamationen (Kartenansicht) */}
      <div className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold flex items-center">
          <MessageSquare className="mr-2 h-5 w-5 md:h-6 md:w-6 text-warning" />
          Offene Reklamationen ({allUnresolvedFeedback.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {allUnresolvedFeedback.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
              <CheckCircle2 className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
              <p className="text-base md:text-lg font-semibold">Keine offenen Reklamationen</p>
              <p className="text-sm">Alle Feedbacks wurden bearbeitet. Gut gemacht!</p>
            </div>
          ) : (
            allUnresolvedFeedback.map((feedback: any) => (
              <FeedbackCard
                key={feedback.id}
                feedback={feedback}
                feedbackType={feedback.rating ? 'order' : 'general'} // Determine type based on 'rating' field
                currentUserId={user.id}
                currentUserRole={currentUserRole}
              />
            ))
          )}
        </div>
      </div>

      {/* Meistgebuchte Leistungen */}
      {(currentUserRole === 'admin' || currentUserRole === 'manager') && mostBookedServices && mostBookedServices.length > 0 && (
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <ListOrdered className="mr-2 h-5 w-5" /> Meistgebuchte Leistungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {mostBookedServices.map((service, index) => (
                <li key={service.service} className="flex justify-between items-center text-sm">
                  <span>{index + 1}. {service.service}</span>
                  <Badge variant="secondary">{service.count} Aufträge</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Existing Dashboard Cards (Gesamtkunden, Objekte, Mitarbeiter) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/customers" className="block">
          <Card className="shadow-neumorphic glassmorphism-card hover:scale-[1.02] transition-transform duration-200 ease-in-out cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm md:text-base font-semibold">Gesamtkunden</CardTitle>
              <Users className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{customerCount ?? 0}</div>
              <p className="text-xs text-muted-foreground">Kunden in Ihrem System</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/objects" className="block">
          <Card className="shadow-neumorphic glassmorphism-card hover:scale-[1.02] transition-transform duration-200 ease-in-out cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm md:text-base font-semibold">Gesamtobjekte</CardTitle>
              <Building className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{objectCount ?? 0}</div>
              <p className="text-xs text-muted-foreground">Objekte, die Sie verwalten</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/employees" className="block">
          <Card className="shadow-neumorphic glassmorphism-card hover:scale-[1.02] transition-transform duration-200 ease-in-out cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm md:text-base font-semibold">Gesamte Mitarbeiter</CardTitle>
              <UsersRound className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{employeeCount ?? 0}</div>
              <p className="text-xs text-muted-foreground">Mitarbeiter in Ihrem Team</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/orders?status=pending" className="block">
          <Card className="shadow-neumorphic glassmorphism-card hover:scale-[1.02] transition-transform duration-200 ease-in-out cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm md:text-base font-semibold">Ausstehende Aufträge</CardTitle>
              <Briefcase className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{pendingCustomerRequests ?? 0}</div>
              <p className="text-xs text-muted-foreground">Aufträge, die noch bearbeitet werden müssen</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mt-8">
        <OrderStatusChart data={chartData} />
        {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
          <FinancialTrendChart />
        )}
        {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
          <EmployeeWorkloadChart />
        )}
      </div>
    </div>
  );
}