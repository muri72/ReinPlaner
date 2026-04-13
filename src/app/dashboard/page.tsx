"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/components/user-profile-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSuperOptimizedDashboardData, type DashboardData } from "@/lib/super-optimized-dashboard";
import { TodaysOrdersOverview } from "@/components/todays-orders-overview";
import { OpenInvoicesWidget } from "@/components/open-invoices-widget";
import { captureError } from "@/lib/sentry";
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
  Activity,
  Plus,
  Settings,
  FileText,
  UserPlus,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const { userProfile, currentUserRole, displayName, loading, authenticated, refresh } = useUserProfile();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setDataLoading(true);
      setError(null);
      const data = await getSuperOptimizedDashboardData();
      setDashboardData(data);
    } catch (err: unknown) {
      console.error('Error loading dashboard data:', err);
      const errorMessage = err instanceof Error ? err.message : "Fehler beim Laden der Dashboard-Daten";
      setError(errorMessage);
      if (err instanceof Error) {
        captureError(err, {
          tags: {
            component: 'DashboardPage',
            function: 'loadDashboardData',
          },
        });
      }
    } finally {
      setDataLoading(false);
    }
  }, []);

  const today = useMemo(() => new Date(), []);
  const formattedDate = useMemo(() => {
    return format(today, 'EEEE, dd. MMMM yyyy', { locale: de });
  }, [today]);

  const processedDashboardData = useMemo(() => {
    if (!dashboardData) return null;
    return {
      ...dashboardData,
      recentActivities: dashboardData.recentActivities?.slice(0, 5) || [],
      upcomingTasks: dashboardData.upcomingTasks?.slice(0, 5) || [],
    };
  }, [dashboardData]);

  const stats = useMemo(() => {
    if (!processedDashboardData) {
      return [
        { title: "Aktive Aufträge", value: 0, change: "+12%", changeType: "increase" as const, icon: Activity, description: "Daten werden geladen..." },
        { title: "Abgeschlossene Aufträge", value: 0, change: "+8%", changeType: "increase" as const, icon: CheckCircle, description: "Daten werden geladen..." },
        { title: "Mitarbeiter aktiv", value: 0, change: "+5%", changeType: "increase" as const, icon: Users, description: "Daten werden geladen..." },
        { title: "Ausstehende Anfragen", value: 0, change: "-3", changeType: "decrease" as const, icon: Clock, description: "Daten werden geladen..." },
        { title: "Neue Beschwerden", value: 0, change: "-2", changeType: "decrease" as const, icon: AlertCircle, description: "heute" },
      ];
    }

    const statusCounts = processedDashboardData.statusCounts as Record<string, number> || {};
    const activeEmployeesCount = processedDashboardData.activeEmployeesCount as number || 0;
    const pendingRequestsCount = processedDashboardData.pendingRequestsCount as number || 0;
    const totalNewComplaintsToday = processedDashboardData.totalNewComplaintsToday as number || 0;

    return [
      { title: "Aktive Aufträge", value: statusCounts?.pending || 0, change: "+12%", changeType: "increase" as const, icon: Activity, description: "vs. letzter Monat" },
      { title: "Abgeschlossene Aufträge", value: statusCounts?.completed || 0, change: "+8%", changeType: "increase" as const, icon: CheckCircle, description: "vs. letzter Monat" },
      { title: "Mitarbeiter aktiv", value: activeEmployeesCount, change: "+5%", changeType: "increase" as const, icon: Users, description: "vs. letzter Monat" },
      { title: "Ausstehende Anfragen", value: pendingRequestsCount, change: "-3", changeType: "decrease" as const, icon: Clock, description: "vs. letzter Monat" },
      { title: "Neue Beschwerden", value: totalNewComplaintsToday, change: "-2", changeType: "decrease" as const, icon: AlertCircle, description: "heute" },
    ];
  }, [processedDashboardData]);

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

  const loadingStats = [
    { title: "Aktive Aufträge", icon: Activity },
    { title: "Abgeschlossene Aufträge", icon: CheckCircle },
    { title: "Mitarbeiter aktiv", icon: Users },
    { title: "Durchschn. Bewertung", icon: TrendingUp },
    { title: "Umsatz (Monat)", icon: BarChart3 },
  ];

  if (!loading && !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-lg font-semibold text-white mb-2">Nicht authentifiziert</p>
          <p className="text-sm text-slate-400">Sie werden zum Login weitergeleitet...</p>
        </div>
      </div>
    );
  }

  if (authenticated && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-lg font-semibold text-white mb-2">Fehler beim Laden des Profils</p>
          <p className="text-sm text-slate-400 mb-4">Ihr Profil konnte nicht geladen werden.</p>
          <Button onClick={() => refresh()} className="btn-primary">
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen section-dark p-4 md:p-8">
      {/* Welcome Header */}
      <div className="mb-8">
        {loading || !displayName ? (
          <div className="space-y-2">
            <div className="h-10 bg-white/5 rounded w-1/3 animate-pulse" />
            <div className="h-4 bg-white/5 rounded w-1/2 animate-pulse" />
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Willkommen zurück, {displayName}!
              </h1>
              <p className="text-sm md:text-base text-slate-400 mt-1">
                Heute ist der {formattedDate}.
              </p>
            </div>
            <Button variant="outline" size="icon" className="glass-btn hidden md:flex">
              <Bell className="w-5 h-5 text-slate-400" />
            </Button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button onClick={() => router.push("/dashboard/orders/new")} className="btn-primary h-10 px-4 text-sm font-medium">
          <Plus className="w-4 h-4 mr-2" />
          Neuer Auftrag
        </Button>
        <Button onClick={() => router.push("/dashboard/employees/new")} variant="outline" className="glass-btn h-10 px-4 text-sm font-medium">
          <UserPlus className="w-4 h-4 mr-2" />
          Mitarbeiter hinzufügen
        </Button>
        <Button onClick={() => router.push("/dashboard/reports")} variant="outline" className="glass-btn h-10 px-4 text-sm font-medium">
          <BarChart3 className="w-4 h-4 mr-2" />
          Berichte
        </Button>
        <Button onClick={() => router.push("/dashboard/settings")} variant="outline" className="glass-btn h-10 px-4 text-sm font-medium">
          <Settings className="w-4 h-4 mr-2" />
          Einstellungen
        </Button>
      </div>

      {/* Heutige Einsätze Section */}
      <div className="mb-8">
        <TodaysOrdersOverview />
      </div>

      {/* Stats Grid */}
      {dataLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
          {loadingStats.map((stat, index) => (
            <Card key={index} className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-white/5 rounded w-24 animate-pulse" />
                <div className="h-4 w-4 bg-white/5 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-white/5 rounded w-16 mb-2 animate-pulse" />
                <div className="h-3 bg-white/5 rounded w-32 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
          {stats.map((stat) => (
            <Card key={stat.title} className="glass-card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="flex items-center space-x-2 text-xs mt-1">
                  <span className={`font-medium ${
                    stat.changeType === "increase" ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-slate-500">
                    {stat.description}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mb-8">
        {/* Recent Activity */}
        <Card className="col-span-4 glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Aktuelle Aktivitäten</CardTitle>
                <CardDescription className="text-slate-500">
                  Die neuesten Aktivitäten im Unternehmen
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                Alle anzeigen
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {dataLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="rounded-full bg-white/5 p-2 h-10 w-10 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : processedDashboardData?.recentActivities?.length > 0 ? (
              (dashboardData?.recentActivities as Array<{ description?: string; created_at?: string }>)?.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="rounded-full bg-blue-500/20 p-2">
                    <AlertCircle className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-slate-200 leading-none">
                      {activity.description}
                    </p>
                    <p className="text-xs text-slate-500">
                      {activity.created_at ? format(new Date(activity.created_at), 'dd.MM.yyyy HH:mm', { locale: de }) : ''}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-600" />
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Keine aktuellen Aktivitäten</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card className="col-span-3 glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Anstehende Aufgaben</CardTitle>
                <CardDescription className="text-slate-500">
                  Aufgaben für die nächsten 7 Tage
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                Alle anzeigen
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {dataLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="rounded-full bg-white/5 p-2 h-10 w-10 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-24" />
                  </div>
                </div>
              ))
            ) : processedDashboardData?.upcomingTasks?.length > 0 ? (
              (dashboardData?.upcomingTasks as Array<{ title?: string; due_date?: string; priority?: string }>)?.slice(0, 5).map((task, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="rounded-full bg-blue-500/20 p-2">
                    <Clock className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-slate-200 leading-none">
                      {task.title}
                    </p>
                    <div className="flex items-center space-x-2">
                      <p className="text-xs text-slate-500">
                        {task.due_date ? format(new Date(task.due_date), 'dd.MM.yyyy', { locale: de }) : ''}
                      </p>
                      {task.priority && (
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          task.priority === 'high' ? 'bg-rose-500/20 text-rose-400' :
                          task.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-slate-500/20 text-slate-400'
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
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Keine anstehenden Aufgaben</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      {dataLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-white/5 rounded w-32 animate-pulse" />
                <div className="h-4 w-4 bg-white/5 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-white/5 rounded w-16 mb-2 animate-pulse" />
                <div className="h-3 bg-white/5 rounded w-40 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="glass-card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Geplante Aufträge heute
              </CardTitle>
              <Calendar className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {(processedDashboardData?.totalScheduledToday as number) || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Davon {(processedDashboardData?.completedScheduledToday as number) || 0} abgeschlossen
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Mitarbeiter gesamt
              </CardTitle>
              <Users className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {(processedDashboardData?.employeeCount as number) || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {(processedDashboardData?.activeEmployeesCount as number) || 0} heute aktiv
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Kunden gesamt
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {(processedDashboardData?.customerCount as number) || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {(processedDashboardData?.objectCount as number) || 0} Objekte betreut
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Beschwerden heute
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {(processedDashboardData?.totalNewComplaintsToday as number) || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Ungelöste Tickets
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Open Invoices Widget */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <OpenInvoicesWidget />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/orders")} className="glass-btn text-slate-300">
          <FileText className="w-4 h-4 mr-2" />
          Aufträge verwalten
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/employees")} className="glass-btn text-slate-300">
          <Users className="w-4 h-4 mr-2" />
          Mitarbeiter verwalten
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/planning")} className="glass-btn text-slate-300">
          <Calendar className="w-4 h-4 mr-2" />
          Planung anzeigen
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/reports")} className="glass-btn text-slate-300">
          <BarChart3 className="w-4 h-4 mr-2" />
          Berichte erstellen
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="mt-8 border-rose-500/30 bg-rose-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400" />
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
