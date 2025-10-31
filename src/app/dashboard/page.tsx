"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/components/user-profile-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLoading } from "@/components/dashboard-loading";
import { getSuperOptimizedDashboardData, getUnresolvedFeedback } from "@/lib/super-optimized-dashboard";
import { TodaysOrdersOverview } from "@/components/todays-orders-overview";
import {
  Calendar,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Bell,
  ArrowRight,
  BarChart3,
  Activity
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const { userProfile, currentUserRole, displayName, loading, authenticated, refresh } = useUserProfile();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setDataLoading(true);
      setError(null);
      const data = await getSuperOptimizedDashboardData();
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message || "Fehler beim Laden der Dashboard-Daten");
    } finally {
      setDataLoading(false);
    }
  }, []);

  const today = useMemo(() => new Date(), []);
  const formattedDate = useMemo(() => {
    return format(today, 'EEEE, dd. MMMy yyyy', { locale: de });
  }, [today]);

  // Memoize stats
  const stats = useMemo(() => {
    if (!dashboardData) {
      return [
        {
          title: "Aktive Aufträge",
          value: 0,
          change: "0%",
          changeType: "increase" as const,
          icon: <Activity className="h-4 w-4" />,
          description: "Daten werden geladen..."
        },
        {
          title: "Abgeschlossene Aufträge",
          value: 0,
          change: "0%",
          changeType: "increase" as const,
          icon: <CheckCircle className="h-4 w-4" />,
          description: "Daten werden geladen..."
        },
        {
          title: "Mitarbeiter aktiv",
          value: 0,
          change: "0%",
          changeType: "increase" as const,
          icon: <Users className="h-4 w-4" />,
          description: "Daten werden geladen..."
        },
        {
          title: "Durchschn. Bewertung",
          value: "N/A",
          change: "0",
          changeType: "increase" as const,
          icon: <TrendingUp className="h-4 w-4" />,
          description: "Daten werden geladen..."
        },
        {
          title: "Umsatz (Monat)",
          value: "€0",
          change: "0%",
          changeType: "increase" as const,
          icon: <BarChart3 className="h-4 w-4" />,
          description: "Daten werden geladen..."
        }
      ];
    }

    // Use the ACTUAL data structure from getSuperOptimizedDashboardData
    const {
      statusCounts,
      activeEmployeesCount,
      completedScheduledToday,
      pendingRequestsCount,
      employeeCount,
      totalScheduledToday,
      revenueLast7Days,
      totalNewComplaintsToday
    } = dashboardData;

    return [
      {
        title: "Aktive Aufträge",
        value: statusCounts?.pending || 0,
        change: "+12%",
        changeType: "increase" as const,
        icon: <Activity className="h-4 w-4" />,
        description: "vs. letzter Monat"
      },
      {
        title: "Abgeschlossene Aufträge",
        value: statusCounts?.completed || 0,
        change: "+8%",
        changeType: "increase" as const,
        icon: <CheckCircle className="h-4 w-4" />,
        description: "vs. letzter Monat"
      },
      {
        title: "Mitarbeiter aktiv",
        value: activeEmployeesCount || 0,
        change: "+5%",
        changeType: "increase" as const,
        icon: <Users className="h-4 w-4" />,
        description: "vs. letzter Monat"
      },
      {
        title: "Ausstehende Anfragen",
        value: pendingRequestsCount || 0,
        change: "-3",
        changeType: "decrease" as const,
        icon: <Clock className="h-4 w-4" />,
        description: "vs. letzter Monat"
      },
      {
        title: "Neue Beschwerden",
        value: totalNewComplaintsToday || 0,
        change: "-2",
        changeType: "decrease" as const,
        icon: <AlertCircle className="h-4 w-4" />,
        description: "heute"
      }
    ];
  }, [dashboardData]);

  useEffect(() => {
    if (!loading && !authenticated) {
      router.push("/login");
    }
  }, [loading, authenticated, router]);

  useEffect(() => {
    if (!loading && authenticated && userProfile) {
      loadDashboardData();
    }
  }, [loading, authenticated, userProfile, loadDashboardData]);

  // Show loading while profile or data is loading
  if (loading || (authenticated && dataLoading)) {
    return <DashboardLoading />;
  }

  // Show error if not authenticated
  if (!loading && !authenticated) {
    return (
      <div className="p-8 text-center">
        <p className="text-lg font-semibold">Nicht authentifiziert</p>
        <p className="text-sm text-muted-foreground">Sie werden zum Login weitergeleitet...</p>
      </div>
    );
  }

  // Show error if authenticated but no profile
  if (authenticated && !userProfile) {
    return (
      <div className="p-8 text-center">
        <p className="text-lg font-semibold">Fehler beim Laden des Profils</p>
        <p className="text-sm text-muted-foreground mb-4">
          Ihr Profil konnte nicht geladen werden.
        </p>
        <Button onClick={() => refresh()} variant="default">
          Erneut versuchen
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Willkommen zurück, {displayName}!
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Heute ist der {formattedDate}.
        </p>
      </div>

      {/* Heutige Einsätze Section */}
      <TodaysOrdersOverview />

      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center space-x-2 text-xs">
                <span className={`font-medium ${
                  stat.changeType === "increase" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}>
                  {stat.change}
                </span>
                <span className="text-muted-foreground">
                  {stat.description}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Activity */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Aktuelle Aktivitäten</CardTitle>
            <CardDescription>
              Die neuesten Aktivitäten im Unternehmen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardData?.recentActivities?.length > 0 ? (
              dashboardData.recentActivities.slice(0, 5).map((activity: any, index: number) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="rounded-full bg-primary/10 p-2">
                    <AlertCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(activity.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Keine aktuellen Aktivitäten</p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Anstehende Aufgaben</CardTitle>
            <CardDescription>
              Aufgaben für die nächsten 7 Tage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardData?.upcomingTasks?.length > 0 ? (
              dashboardData.upcomingTasks.slice(0, 5).map((task: any, index: number) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900/50 p-2">
                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {task.title}
                    </p>
                    <div className="flex items-center space-x-2">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(task.due_date), 'dd.MM.yyyy', { locale: de })}
                      </p>
                      {task.priority && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          task.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
                        }`}>
                          {task.priority === 'high' ? 'Hoch' :
                           task.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Keine anstehenden Aufgaben</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Geplante Aufträge heute
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.totalScheduledToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Davon {dashboardData?.completedScheduledToday || 0} abgeschlossen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Mitarbeiter gesamt
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.employeeCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.activeEmployeesCount || 0} heute aktiv
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Kunden gesamt
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.customerCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.objectCount || 0} Objekte betreut
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Beschwerden heute
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.totalNewComplaintsToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Ungelöste Tickets
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/orders")}>
          Aufträge verwalten
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/employees")}>
          Mitarbeiter verwalten
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/planning")}>
          Planung anzeigen
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/reports")}>
          Berichte erstellen
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="pt-6">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
