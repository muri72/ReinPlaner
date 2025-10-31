"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building, UsersRound, Briefcase, AlertTriangle, MessageSquare, CheckCircle2, TrendingUp } from "lucide-react";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from "next/link";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUserProfile } from "@/components/user-profile-provider";
import { DashboardLoading } from "@/components/dashboard-loading";
import { getSuperOptimizedDashboardData, getUnresolvedFeedback } from "@/lib/super-optimized-dashboard";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const { userProfile, currentUserRole, displayName, loading, refresh } = useUserProfile();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        console.log("[DASHBOARD] Not authenticated, redirecting to login");
        router.push("/login");
      }
    });
  }, [router, supabase]);

  // Load dashboard data
  useEffect(() => {
    const loadData = async () => {
      setDataLoading(true);
      setError(null);
      try {
        console.log("[DASHBOARD] Loading dashboard data...");
        const data = await getSuperOptimizedDashboardData();
        console.log("[DASHBOARD] Loaded data:", data);
        setDashboardData(data);
      } catch (err: any) {
        console.error("[DASHBOARD] Error loading data:", err);
        setError(err.message || "Fehler beim Laden der Dashboard-Daten");
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, []);

  // Show loading while profile or data is loading
  if (loading || dataLoading) {
    console.log("[DASHBOARD] Loading:", { loading, dataLoading });
    return <DashboardLoading />;
  }

  // Show error if no profile
  if (!userProfile) {
    console.log("[DASHBOARD] No user profile");
    return (
      <div className="p-8 text-center">
        <p className="text-lg font-semibold">Fehler beim Laden des Profils</p>
        <button
          onClick={() => refresh()}
          className="mt-4 px-4 py-2 bg-primary text-white rounded"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  console.log("[DASHBOARD] Rendering dashboard:", {
    userProfile,
    currentUserRole,
    displayName,
    dashboardData
  });

  const today = new Date();
  const formattedDate = format(today, 'EEEE, dd. MMMM yyyy', { locale: de });

  // Prepare chart data
  const chartData = [
    { name: 'Ausstehend', value: dashboardData?.statusCounts?.['pending'] || 0 },
    { name: 'In Bearbeitung', value: dashboardData?.statusCounts?.['in_progress'] || 0 },
    { name: 'Abgeschlossen', value: dashboardData?.statusCounts?.['completed'] || 0 },
  ];

  const getRequestStatusBadgeVariant = (requestStatus: string) => {
    switch (requestStatus) {
      case 'approved': return 'default';
      case 'pending': return 'warning';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-lg font-semibold text-red-600">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setDataLoading(true);
            refresh();
          }}
          className="mt-4 px-4 py-2 bg-primary text-white rounded"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">
          Willkommen, {displayName}!
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Heute ist der {formattedDate}.
        </p>
        <p className="text-xs text-blue-600 font-medium">
          Rolle: {currentUserRole}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          title="Geplante Einsätze heute"
          value={dashboardData?.totalScheduledToday || 0}
          description="Aufträge für heute geplant"
          icon="Briefcase"
          linkHref="/dashboard/orders"
          progress={{
            current: dashboardData?.completedScheduledToday || 0,
            total: dashboardData?.totalScheduledToday || 0,
            label: `${dashboardData?.completedScheduledToday || 0} von ${dashboardData?.totalScheduledToday || 0} abgeschlossen`
          }}
        />
        <KpiCard
          title="Offene Anfragen"
          value={dashboardData?.pendingRequestsCount ?? 0}
          description="Kundenanfragen zur Bearbeitung"
          icon="AlertTriangle"
          linkHref="/dashboard/orders?requestStatus=pending"
          valueColorClass="text-warning"
        />
        <KpiCard
          title="Aktive Mitarbeiter"
          value={dashboardData?.activeEmployeesCount ?? 0}
          description="Mitarbeiter aktuell im Einsatz"
          icon="UsersRound"
          linkHref="/dashboard/time-tracking"
          valueColorClass="text-success"
        />
        <KpiCard
          title="Umsatz letzte 7 Tage"
          value={`${(dashboardData?.revenueLast7Days ?? 0).toFixed(2)} €`}
          description="Geschätzter Umsatz"
          icon="TrendingUp"
          linkHref="/dashboard/finances"
          valueColorClass="text-primary"
        />
        <KpiCard
          title="Reklamationen heute"
          value={dashboardData?.totalNewComplaintsToday || 0}
          description="Neue Beschwerden"
          icon="MessageSquare"
          linkHref="/dashboard/feedback"
          valueColorClass={(dashboardData?.totalNewComplaintsToday || 0) > 0 ? "text-destructive" : "text-success"}
        />
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/customers" className="block">
          <Card className="hover:scale-[1.02] transition-transform cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">Gesamtkunden</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.customerCount ?? 0}</div>
              <p className="text-xs text-muted-foreground">Kunden</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/objects" className="block">
          <Card className="hover:scale-[1.02] transition-transform cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">Gesamtobjekte</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.objectCount ?? 0}</div>
              <p className="text-xs text-muted-foreground">Objekte</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/employees" className="block">
          <Card className="hover:scale-[1.02] transition-transform cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">Mitarbeiter</CardTitle>
              <UsersRound className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.employeeCount ?? 0}</div>
              <p className="text-xs text-muted-foreground">Team</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/orders?status=pending" className="block">
          <Card className="hover:scale-[1.02] transition-transform cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">Ausstehende Aufträge</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.pendingRequestsCount ?? 0}</div>
              <p className="text-xs text-muted-foreground">Zu bearbeiten</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Pending Requests Section */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5 text-warning" />
          Offene Anfragen ({dashboardData?.mappedPendingRequests?.length || 0})
        </h2>
        {!dashboardData?.mappedPendingRequests || dashboardData.mappedPendingRequests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">Keine offenen Auftragsanfragen</p>
              <p className="text-sm text-muted-foreground">Alle Anfragen wurden bearbeitet.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Auftrag</TableHead>
                      <TableHead className="min-w-[100px]">Dienstleistung</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.mappedPendingRequests.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium text-sm">{order.title}</TableCell>
                        <TableCell className="text-sm">{order.service_type || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={getRequestStatusBadgeVariant(order.request_status)}>
                            {order.request_status}
                          </Badge>
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

      {/* Feedback Section - Loaded Separately */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold flex items-center">
          <MessageSquare className="mr-2 h-5 w-5 text-warning" />
          Offene Reklamationen
        </h2>
        {/* FeedbackSection component */}
      </div>
    </div>
  );
}
