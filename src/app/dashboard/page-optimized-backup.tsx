import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building, UsersRound, Briefcase, Clock, DollarSign, AlertTriangle, MessageSquare, CheckCircle2, TrendingUp, ListOrdered, CalendarDays } from "lucide-react";
import { OrderStatusChart } from "@/components/order-status-chart";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from "next/link";
import { FinancialTrendChart } from "@/components/financial-trend-chart";
import { EmployeeWorkloadChart } from "@/components/employee-workload-chart";
import { KpiCard } from "@/components/kpi-card";
import { TodaysOrdersOverview } from "@/components/todays-orders-overview";
import { FeedbackCard } from "@/components/feedback-card";
import { Badge } from "@/components/ui/badge";
import { RecordDetailsDialog } from "@/components/record-details-dialog";
import { OrderPlanningDialog } from "@/components/order-planning-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getOptimizedDashboardData } from "@/lib/optimized-dashboard-queries";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, last_name, avatar_url, role')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error("Fehler beim Laden des Profils:", profileError?.message || JSON.stringify(profileError));
  }

  const currentUserRole = profile?.role || 'employee';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const formattedDate = format(today, 'EEEE, dd. MMMM yyyy', { locale: de });

  // Fetch all dashboard data in one optimized call
  let dashboardData;
  try {
    dashboardData = await getOptimizedDashboardData();
  } catch (error: any) {
    console.error("Fehler beim Laden der Dashboard-Daten:", error);
    // Return default values if data loading fails
    dashboardData = {
      customerCount: 0,
      objectCount: 0,
      employeeCount: 0,
      pendingRequestsCount: 0,
      activeEmployeesCount: 0,
      totalScheduledToday: 0,
      completedScheduledToday: 0,
      totalNewComplaintsToday: 0,
      revenueLast7Days: 0,
      scheduledOrdersToday: [],
      mappedPendingRequests: [],
      allUnresolvedFeedback: [],
      statusCounts: { pending: 0, in_progress: 0, completed: 0 },
    };
  }

  // Prepare chart data
  const chartData = [
    { name: 'Ausstehend', value: dashboardData.statusCounts['pending'] || 0 },
    { name: 'In Bearbeitung', value: dashboardData.statusCounts['in_progress'] || 0 },
    { name: 'Abgeschlossen', value: dashboardData.statusCounts['completed'] || 0 },
  ];

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
          value={dashboardData.totalScheduledToday}
          description="Aufträge für heute geplant"
          icon="Briefcase"
          linkHref="/dashboard/orders"
          progress={{
            current: dashboardData.completedScheduledToday,
            total: dashboardData.totalScheduledToday,
            label: `${dashboardData.completedScheduledToday} von ${dashboardData.totalScheduledToday} abgeschlossen`
          }}
        />
        <KpiCard
          title="Offene Anfragen"
          value={dashboardData.pendingRequestsCount ?? 0}
          description="Kundenanfragen zur Bearbeitung"
          icon="AlertTriangle"
          linkHref="/dashboard/orders?requestStatus=pending"
          valueColorClass="text-warning"
        />
        <KpiCard
          title="Aktive Mitarbeiter"
          value={dashboardData.activeEmployeesCount ?? 0}
          description="Mitarbeiter aktuell im Einsatz"
          icon="UsersRound"
          linkHref="/dashboard/time-tracking"
          valueColorClass="text-success"
        />
        <KpiCard
          title="Umsatz letzte 7 Tage"
          value={`${(dashboardData.revenueLast7Days ?? 0).toFixed(2)} €`}
          description="Geschätzter Umsatz der letzten 7 Tage"
          icon="TrendingUp"
          linkHref="/dashboard/finances"
          valueColorClass="text-primary"
        />
        <KpiCard
          title="Reklamationen heute"
          value={dashboardData.totalNewComplaintsToday}
          description="Neue Beschwerden eingegangen"
          icon="MessageSquare"
          linkHref="/dashboard/feedback"
          valueColorClass={dashboardData.totalNewComplaintsToday > 0 ? "text-destructive" : "text-success"}
        />
      </div>

      {/* Einsatzübersicht (Tagesliste) */}
      <TodaysOrdersOverview />

      {/* Qualität & Reklamationen (Kartenansicht) */}
      <div className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold flex items-center">
          <MessageSquare className="mr-2 h-5 w-5 md:h-6 md:w-6 text-warning" />
          Offene Reklamationen ({dashboardData.allUnresolvedFeedback.length})
        </h2>
        {dashboardData.allUnresolvedFeedback.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
            <CheckCircle2 className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
            <p className="text-base md:text-lg font-semibold">Keine offenen Reklamationen</p>
            <p className="text-sm">Alle Feedbacks wurden bearbeitet. Gut gemacht!</p>
          </div>
        ) : (
          <Card className="shadow-neumorphic glassmorphism-card">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 p-4">
                {dashboardData.allUnresolvedFeedback.map((feedback: any) => (
                  <FeedbackCard
                    key={feedback.id}
                    feedback={feedback}
                    feedbackType={feedback.rating ? 'order' : 'general'}
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
          Offene Anfragen ({dashboardData.mappedPendingRequests.length})
        </h2>
        {dashboardData.mappedPendingRequests.length === 0 ? (
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
                      <TableHead className="min-w-[150px]">Auftrag</TableHead>
                      <TableHead className="min-w-[120px]">Kunde</TableHead>
                      <TableHead className="min-w-[120px]">Objekt</TableHead>
                      <TableHead className="min-w-[100px]">Dienstleistung</TableHead>
                      <TableHead className="min-w-[100px]">Anfrage Status</TableHead>
                      <TableHead className="min-w-[120px]">Zeitraum</TableHead>
                      <TableHead className="text-right min-w-[120px]">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.mappedPendingRequests.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium text-sm">{order.title}</TableCell>
                        <TableCell className="text-sm">{order.customer_name || 'N/A'}</TableCell>
                        <TableCell className="text-sm">{order.object_name || 'N/A'}</TableCell>
                        <TableCell className="text-sm">{order.service_type || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={getRequestStatusBadgeVariant(order.request_status)}>
                            {order.request_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
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
                        </TableCell>
                        <TableCell className="text-right">
                          <RecordDetailsDialog record={order} title={`Details zu Auftrag: ${order.title}`} />
                          <OrderPlanningDialog order={order} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
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
              <div className="text-xl md:text-2xl font-bold">{dashboardData.customerCount ?? 0}</div>
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
              <div className="text-xl md:text-2xl font-bold">{dashboardData.objectCount ?? 0}</div>
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
              <div className="text-xl md:text-2xl font-bold">{dashboardData.employeeCount ?? 0}</div>
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
              <div className="text-xl md:text-2xl font-bold">{dashboardData.pendingRequestsCount ?? 0}</div>
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
