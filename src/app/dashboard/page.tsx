import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building, UsersRound, Briefcase, Clock, DollarSign, AlertTriangle, MessageSquare, CheckCircle2, TrendingUp, ListOrdered, CalendarDays } from "lucide-react";
import { OrderStatusChart }
from "@/components/order-status-chart";
import { format, getWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from "next/link"; // Import Link for clickable cards
import { FinancialTrendChart } from "@/components/financial-trend-chart"; // Import new chart
import { EmployeeWorkloadChart } from "@/components/employee-workload-chart"; // Import new chart
import { KpiCard } from "@/components/kpi-card"; // Import the new KpiCard
import { TodaysOrdersOverview } from "@/components/todays-orders-overview"; // Import the new component
import { FeedbackCard } from "@/components/feedback-card"; // Import FeedbackCard
import { getRevenueLast7Days, getMostBookedServices } from "@/lib/actions/finances"; // Import new finance actions
import { Badge } from "@/components/ui/badge"; // Hinzugefügt: Import der Badge-Komponente
import { DisplayOrder } from '@/app/dashboard/orders/page'; // Import DisplayOrder type
import { OrderPlanningDialog } from "@/components/order-planning-dialog"; // Import OrderPlanningDialog
import { RecordDetailsDialog } from "@/components/record-details-dialog"; // Import RecordDetailsDialog
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Import Table components

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
  const { data: pendingCustomerRequestsList, error: pendingRequestsError } = await supabase
    .from('orders')
    .select(`
      id,
      user_id,
      title,
      description,
      status,
      due_date,
      created_at,
      customer_id,
      object_id,
      customer_contact_id,
      order_type,
      recurring_start_date,
      recurring_end_date,
      priority,
      total_estimated_hours,
      notes,
      request_status,
      service_type,
      customers ( name ),
      objects ( name, address, notes, recurrence_interval_weeks, start_week_offset, daily_schedules ),
      customer_contacts ( first_name, last_name, phone ),
      order_feedback ( id, rating, comment, image_urls, created_at ),
      order_employee_assignments ( 
        employee_id, 
        assigned_daily_schedules,
        assigned_recurrence_interval_weeks, assigned_start_week_offset,
        employees ( first_name, last_name ) 
      )
    `)
    .eq('request_status', 'pending')
    .order('created_at', { ascending: true });

  const pendingRequestsCount = pendingCustomerRequestsList?.length || 0;

  if (pendingRequestsError) console.error("Fehler beim Laden der offenen Kundenanfragen:", pendingRequestsError?.message || pendingRequestsError);

  // Map pending requests to DisplayOrder type
  const mappedPendingRequests: DisplayOrder[] = pendingCustomerRequestsList?.map(order => {
    const customerData = Array.isArray(order.customers) ? order.customers[0] : order.customers;
    const objectData = Array.isArray(order.objects) ? order.objects[0] : order.objects;
    const customerContactData = Array.isArray(order.customer_contacts) ? order.customer_contacts[0] : order.customer_contacts;

    const mappedAssignments = order.order_employee_assignments?.map((a: any) => ({
        employeeId: a.employee_id,
        assigned_daily_schedules: a.assigned_daily_schedules,
        assigned_recurrence_interval_weeks: a.assigned_recurrence_interval_weeks,
        assigned_start_week_offset: a.assigned_start_week_offset,
    })) || [];
    
    return {
      id: order.id,
      user_id: order.user_id,
      title: order.title,
      description: order.description,
      status: order.status,
      due_date: order.due_date,
      created_at: order.created_at,
      customer_id: order.customer_id,
      object_id: order.object_id,
      customer_contact_id: order.customer_contact_id,
      order_type: order.order_type,
      recurring_start_date: order.recurring_start_date,
      recurring_end_date: order.recurring_end_date,
      priority: order.priority,
      total_estimated_hours: order.total_estimated_hours,
      notes: order.notes,
      request_status: order.request_status,
      service_type: order.service_type,
      order_feedback: order.order_feedback,
      customer_name: customerData?.name || null,
      object_name: objectData?.name || null,
      customer_contact_first_name: customerContactData?.first_name || null,
      customer_contact_last_name: customerContactData?.last_name || null,
      employee_ids: order.order_employee_assignments?.map((a: any) => a.employee_id) || null,
      employee_first_names: order.order_employee_assignments?.map((a: any) => a.employees?.[0]?.first_name || '') || null,
      employee_last_names: order.order_employee_assignments?.map((a: any) => a.employees?.[0]?.last_name || '') || null,
      assignedEmployees: mappedAssignments,
      object: objectData,
      customer: customerData,
      customer_contact: customerContactData,
    };
  }) || [];


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
        order_employee_assignments ( employees ( first_name, last_name ) )
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

  const mappedUnresolvedOrderFeedback = unresolvedOrderFeedback?.map(f => {
    const employeeAssignment = f.orders?.order_employee_assignments?.[0];
    const employee = employeeAssignment?.employees;
    const employeeName = (employee?.first_name || employee?.last_name) ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim() : 'N/A';

    return {
      ...f,
      order: {
        title: f.orders?.title || 'Unbekannter Auftrag',
        customer_name: f.orders?.customers?.[0]?.name || 'N/A',
        employee_name: employeeName,
      },
      replied_by_name: `${f.profiles?.first_name || ''} ${f.profiles?.last_name || ''}`.trim() || 'Admin',
    };
  }) || [];

  const mappedUnresolvedGeneralFeedback = unresolvedGeneralFeedback?.map(f => ({
    ...f,
    replied_by_name: `${f.profiles?.first_name || ''} ${f.profiles?.last_name || ''}`.trim() || 'Admin',
  })) || [];

  const allUnresolvedFeedback = [...mappedUnresolvedOrderFeedback, ...mappedUnresolvedGeneralFeedback].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getRequestStatusBadgeVariant = (requestStatus: string) => {
    switch (requestStatus) {
      case 'approved': return 'default';
      case 'pending': return 'warning';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };


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
          value={pendingRequestsCount ?? 0}
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
        {allUnresolvedFeedback.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
            <CheckCircle2 className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
            <p className="text-base md:text-lg font-semibold">Keine offenen Reklamationen</p>
            <p className="text-sm">Alle Feedbacks wurden bearbeitet. Gut gemacht!</p>
          </div>
        ) : (
          <Card className="shadow-neumorphic glassmorphism-card">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 p-4">
                {allUnresolvedFeedback.map((feedback: any) => (
                  <FeedbackCard
                    key={feedback.id}
                    feedback={feedback}
                    feedbackType={feedback.rating ? 'order' : 'general'} // Determine type based on 'rating' field
                    currentUserId={user.id}
                    currentUserRole={currentUserRole}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Offene Anfragen Section */}
      <div className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5 md:h-6 md:w-6 text-warning" />
          Offene Anfragen ({mappedPendingRequests.length})
        </h2>
        {mappedPendingRequests.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
            <Briefcase className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
            <p className="text-base md:text-lg font-semibold">Keine offenen Auftragsanfragen</p>
            <p className="text-sm">Alle Anfragen wurden bearbeitet oder es gibt keine neuen.</p>
          </div>
        ) : (
          <Card className="shadow-neumorphic glassmorphism-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Auftrag</TableHead><TableHead className="min-w-[120px]">Kunde</TableHead><TableHead className="min-w-[120px]">Objekt</TableHead><TableHead className="min-w-[100px]">Dienstleistung</TableHead><TableHead className="min-w-[100px]">Anfrage Status</TableHead><TableHead className="min-w-[120px]">Zeitraum</TableHead><TableHead className="text-right min-w-[120px]">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappedPendingRequests.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium text-sm">{order.title}</TableCell><TableCell className="text-sm">{order.customer_name || 'N/A'}</TableCell><TableCell className="text-sm">{order.object_name || 'N/A'}</TableCell><TableCell className="text-sm">{order.service_type || 'N/A'}</TableCell><TableCell>
                          <Badge variant={getRequestStatusBadgeVariant(order.request_status)}>{order.request_status}</Badge>
                        </TableCell><TableCell className="text-sm">
                          {order.order_type === "one_time" && order.due_date && (
                            <div className="flex items-center">
                              <CalendarDays className="mr-1 h-3 w-3" />
                              {format(new Date(order.due_date), 'dd.MM.yyyy', { locale: de })}
                            </div>
                          )}
                          {(order.order_type === "recurring" || order.order_type === "permanent" || order.order_type === "substitution") && order.recurring_start_date && (
                            <div className="flex items-center">
                              <CalendarDays className="mr-1 h-3 w-3" />
                              {format(new Date(order.recurring_start_date), 'dd.MM.yyyy', { locale: de })}
                              {order.recurring_end_date && ` - ${format(new Date(order.recurring_end_date), 'dd.MM.yyyy', { locale: de })}`}
                            </div>
                          )}
                        </TableCell><TableCell className="text-right">
                          <RecordDetailsDialog record={order} title={`Details zu Auftrag: ${order.title}`} />
                          <OrderPlanningDialog order={order} />
                        </TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
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
              <div className="text-xl md:text-2xl font-bold">{pendingRequestsCount ?? 0}</div>
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