"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUserProfile } from "@/components/user-profile-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSuperOptimizedDashboardData } from "@/lib/super-optimized-dashboard";
import { TodaysOrdersOverview } from "@/components/todays-orders-overview";
import { OpenInvoicesWidget } from "@/components/open-invoices-widget";
import { captureError } from "@/lib/sentry";
import { AnimatedNumber } from "@/components/ui/animated-number";
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
  Sparkles,
  Target,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const { userProfile, currentUserRole, displayName, loading, authenticated, refresh } = useUserProfile();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dashboardData, setDashboardData] = useState<any>(null);
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
      recentActivities: (dashboardData.recentActivities || [])?.slice(0, 5),
      upcomingTasks: (dashboardData.upcomingTasks || [])?.slice(0, 5),
    };
  }, [dashboardData]);

  const stats = useMemo(() => {
    if (!processedDashboardData) {
      return [
        { title: "Aktive Aufträge", value: 0, change: "+12%", changeType: "increase" as const, icon: Activity, color: "blue", description: "Daten werden geladen..." },
        { title: "Abgeschlossene Aufträge", value: 0, change: "+8%", changeType: "increase" as const, icon: CheckCircle, color: "emerald", description: "Daten werden geladen..." },
        { title: "Mitarbeiter aktiv", value: 0, change: "+5%", changeType: "increase" as const, icon: Users, color: "violet", description: "Daten werden geladen..." },
        { title: "Ausstehende Anfragen", value: 0, change: "-3", changeType: "decrease" as const, icon: Clock, color: "amber", description: "Daten werden geladen..." },
        { title: "Neue Beschwerden", value: 0, change: "-2", changeType: "decrease" as const, icon: AlertCircle, color: "rose", description: "heute" },
      ];
    }

    const statusCounts = processedDashboardData.statusCounts as Record<string, number> || {};
    const activeEmployeesCount = processedDashboardData.activeEmployeesCount as number || 0;
    const pendingRequestsCount = processedDashboardData.pendingRequestsCount as number || 0;
    const totalNewComplaintsToday = processedDashboardData.totalNewComplaintsToday as number || 0;

    return [
      { title: "Aktive Aufträge", value: statusCounts?.pending || 0, change: "+12%", changeType: "increase" as const, icon: Activity, color: "blue", description: "vs. letzter Monat" },
      { title: "Abgeschlossene Aufträge", value: statusCounts?.completed || 0, change: "+8%", changeType: "increase" as const, icon: CheckCircle, color: "emerald", description: "vs. letzter Monat" },
      { title: "Mitarbeiter aktiv", value: activeEmployeesCount, change: "+5%", changeType: "increase" as const, icon: Users, color: "violet", description: "vs. letzter Monat" },
      { title: "Ausstehende Anfragen", value: pendingRequestsCount, change: "-3", changeType: "decrease" as const, icon: Clock, color: "amber", description: "vs. letzter Monat" },
      { title: "Neue Beschwerden", value: totalNewComplaintsToday, change: "-2", changeType: "decrease" as const, icon: AlertCircle, color: "rose", description: "heute" },
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

  const colorMap: Record<string, { bg: string; text: string; glow: string }> = {
    blue: { bg: "bg-blue-500/20", text: "text-blue-400", glow: "shadow-blue-500/20" },
    emerald: { bg: "bg-emerald-500/20", text: "text-emerald-400", glow: "shadow-emerald-500/20" },
    violet: { bg: "bg-violet-500/20", text: "text-violet-400", glow: "shadow-violet-500/20" },
    amber: { bg: "bg-amber-500/20", text: "text-amber-400", glow: "shadow-amber-500/20" },
    rose: { bg: "bg-rose-500/20", text: "text-rose-400", glow: "shadow-rose-500/20" },
    cyan: { bg: "bg-cyan-500/20", text: "text-cyan-400", glow: "shadow-cyan-500/20" },
  };

  if (!loading && !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-8 text-center max-w-md border border-amber-500/20">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-400" />
          </div>
          <p className="text-lg font-bold text-white mb-2">Nicht authentifiziert</p>
          <p className="text-sm text-slate-400">Sie werden zum Login weitergeleitet...</p>
        </div>
      </div>
    );
  }

  if (authenticated && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-8 text-center max-w-md border border-rose-500/20">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-rose-400" />
          </div>
          <p className="text-lg font-bold text-white mb-2">Fehler beim Laden des Profils</p>
          <p className="text-sm text-slate-400 mb-4">Ihr Profil konnte nicht geladen werden.</p>
          <Button onClick={() => refresh()} className="bg-blue-600 hover:bg-blue-700 text-white">
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#05080F] via-[#0A0E1A] to-[#0F1524] p-4 md:p-6 lg:p-8">
      {/* Page Header */}
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
                {formattedDate}
              </p>
            </div>
            <Button variant="outline" size="icon" className="border-white/10 bg-white/5 hover:bg-white/10 text-slate-300">
              <Bell className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button onClick={() => router.push("/dashboard/orders/new")} className="h-11 px-5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/25 transition-all">
          <Plus className="w-4 h-4 mr-2" />
          Neuer Auftrag
        </Button>
        <Button onClick={() => router.push("/dashboard/employees/new")} variant="outline" className="h-11 px-5 text-sm font-medium border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl transition-all">
          <UserPlus className="w-4 h-4 mr-2" />
          Mitarbeiter
        </Button>
        <Button onClick={() => router.push("/dashboard/reports")} variant="outline" className="h-11 px-5 text-sm font-medium border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl transition-all">
          <BarChart3 className="w-4 h-4 mr-2" />
          Berichte
        </Button>
        <Button onClick={() => router.push("/dashboard/settings")} variant="outline" className="h-11 px-5 text-sm font-medium border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl transition-all">
          <Settings className="w-4 h-4 mr-2" />
          Einstellungen
        </Button>
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
          {stats.map((stat, index) => {
            const colors = colorMap[stat.color] || colorMap.blue;
            return (
              <Card key={stat.title} className="glass-card group hover:border-white/12 transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">
                    {stat.title}
                  </CardTitle>
                  <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <stat.icon className={`h-5 w-5 ${colors.text}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white mb-1">
                    <AnimatedNumber value={stat.value} />
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className={`font-semibold ${
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
            );
          })}
        </div>
      )}

      {/* Heutige Einsätze Section */}
      <div className="mb-8">
        <TodaysOrdersOverview />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mb-8">
        {/* Recent Activity */}
        <Card className="col-span-4 glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Aktuelle Aktivitäten
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Die neuesten Aktivitäten im Unternehmen
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                Alle
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {dataLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="rounded-xl bg-white/5 p-2.5 h-12 w-12 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : processedDashboardData?.recentActivities?.length > 0 ? (
              (processedDashboardData?.recentActivities as Array<{ description?: string; created_at?: string }>)?.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 leading-tight truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {activity.created_at ? format(new Date(activity.created_at), 'dd.MM.yyyy HH:mm', { locale: de }) : ''}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-600 shrink-0" />
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-slate-600" />
                </div>
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
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-violet-400" />
                  Anstehende Aufgaben
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Aufgaben für die nächsten 7 Tage
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                Alle
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {dataLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="rounded-xl bg-white/5 p-2.5 h-12 w-12 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-24" />
                  </div>
                </div>
              ))
            ) : processedDashboardData?.upcomingTasks?.length > 0 ? (
              (processedDashboardData?.upcomingTasks as Array<{ title?: string; due_date?: string; priority?: string }>)?.slice(0, 5).map((task, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 leading-tight truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-slate-500">
                        {task.due_date ? format(new Date(task.due_date), 'dd.MM.yyyy', { locale: de }) : ''}
                      </p>
                      {task.priority && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
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
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-slate-600" />
                </div>
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
          <Card className="glass-card group hover:border-white/12 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Geplante Aufträge
              </CardTitle>
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="h-5 w-5 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">
                <AnimatedNumber value={(processedDashboardData?.totalScheduledToday as number) || 0} />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {(processedDashboardData?.completedScheduledToday as number) || 0} heute abgeschlossen
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card group hover:border-white/12 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Mitarbeiter
              </CardTitle>
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5 text-violet-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">
                <AnimatedNumber value={(processedDashboardData?.employeeCount as number) || 0} />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {(processedDashboardData?.activeEmployeesCount as number) || 0} heute aktiv
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card group hover:border-white/12 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Kunden
              </CardTitle>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">
                <AnimatedNumber value={(processedDashboardData?.customerCount as number) || 0} />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {(processedDashboardData?.objectCount as number) || 0} Objekte betreut
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card group hover:border-white/12 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Beschwerden
              </CardTitle>
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertCircle className="h-5 w-5 text-rose-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">
                <AnimatedNumber value={(processedDashboardData?.totalNewComplaintsToday as number) || 0} />
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

      {/* Error Display */}
      {error && (
        <Card className="border border-rose-500/30 bg-rose-500/10 mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
