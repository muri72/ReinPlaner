import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building, UsersRound, Briefcase, Clock, DollarSign, AlertTriangle, MessageSquare, CheckCircle2 } from "lucide-react";
import { OrderStatusChart } from "@/components/order-status-chart";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from "next/link"; // Import Link for clickable cards
import { FinancialTrendChart } from "@/components/financial-trend-chart"; // Import new chart
import { EmployeeWorkloadChart } from "@/components/employee-workload-chart"; // Import new chart
import { KpiCard } from "@/components/kpi-card"; // Import the new KpiCard

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
    console.error("Fehler beim Laden des Profils:", profileError);
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
      status
    `)
    .or(`due_date.eq.${format(today, 'yyyy-MM-dd')},and(recurring_start_date.lte.${format(today, 'yyyy-MM-dd')},or(recurring_end_date.gte.${format(today, 'yyyy-MM-dd')},recurring_end_date.is.null))`)
    .in('order_type', ['one_time', 'recurring', 'permanent', 'substitution']);

  const totalScheduledToday = scheduledOrdersToday?.length || 0;
  const completedScheduledToday = scheduledOrdersToday?.filter(order => order.status === 'completed').length || 0;

  if (scheduledOrdersError) console.error("Fehler beim Laden der geplanten Einsätze:", scheduledOrdersError);

  // 2. Offene Kundenanfragen (request_status = 'pending')
  const { count: pendingCustomerRequests, error: pendingRequestsError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('request_status', 'pending');

  if (pendingRequestsError) console.error("Fehler beim Laden der offenen Kundenanfragen:", pendingRequestsError);

  // 3. Aktive Mitarbeiter im Einsatz (time_entries mit end_time IS NULL)
  const { count: activeEmployeesCount, error: activeEmployeesError } = await supabase
    .from('time_entries')
    .select('employee_id', { count: 'exact', head: true })
    .is('end_time', null)
    .gte('start_time', today.toISOString()) // Only count entries started today
    .lte('start_time', tomorrow.toISOString()); // And not started tomorrow

  if (activeEmployeesError) console.error("Fehler beim Laden der aktiven Mitarbeiter:", activeEmployeesError);

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

  if (generalFeedbackError) console.error("Fehler beim Laden des allgemeinen Feedbacks:", generalFeedbackError);
  if (orderFeedbackError) console.error("Fehler beim Laden des Auftrags-Feedbacks:", orderFeedbackError);

  // 5. Offene Rechnungen (€) - Placeholder, da keine Rechnungsdatenbank vorhanden
  const openInvoicesAmount = 0; // Placeholder

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

  if (customerCountError) console.error("Fehler beim Laden der Kundenzahl:", customerCountError);
  if (objectCountError) console.error("Fehler beim Laden der Objektzahl:", objectCountError);
  if (employeeCountError) console.error("Fehler beim Laden der Mitarbeiterzahl:", employeeCountError);
  if (ordersStatusError) console.error("Fehler beim Laden der Auftragsstatusdaten:", ordersStatusError);

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
          icon={Briefcase}
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
          icon={AlertTriangle}
          linkHref="/dashboard/orders?requestStatus=pending"
          valueColorClass="text-warning"
        />
        <KpiCard
          title="Aktive Mitarbeiter"
          value={activeEmployeesCount ?? 0}
          description="Mitarbeiter aktuell im Einsatz"
          icon={UsersRound}
          linkHref="/dashboard/time-tracking"
          valueColorClass="text-success"
        />
        <KpiCard
          title="Offene Rechnungen"
          value={`${openInvoicesAmount.toFixed(2)} €`}
          description="Gesamtbetrag ausstehender Zahlungen"
          icon={DollarSign}
          // linkHref="/dashboard/finances" // Link to finances page
          valueColorClass="text-destructive"
        />
        <KpiCard
          title="Reklamationen heute"
          value={totalNewComplaintsToday}
          description="Neue Beschwerden eingegangen"
          icon={MessageSquare}
          linkHref="/dashboard/feedback"
          valueColorClass={totalNewComplaintsToday > 0 ? "text-destructive" : "text-success"}
        />
      </div>

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

      {/* New Section for Charts */}
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