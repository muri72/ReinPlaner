"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { redirect, useRouter } from "next/navigation";
import { MobileDashboardLayout } from "@/components/mobile-dashboard-layout";
import { TimeTrackerPanel } from "@/components/time-tracking/time-tracker-panel";
import { DashboardStatCard, DashboardTaskCard, DashboardSection } from "@/components/mobile-dashboard-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TouchButton } from "@/components/ui/touch-button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  CalendarDays,
  TrendingUp,
  CheckCircle,
  ListTodo,
  ChevronRight,
  Bell,
  Settings,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth, isToday, isTomorrow } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DashboardStats {
  todayNetMinutes: number;
  weekNetMinutes: number;
  monthNetMinutes: number;
  activeAssignments: number;
  completedToday: number;
  pendingNotifications: number;
  employeeId: string | null;
  employeeStatus: string | null;
}

interface ShiftAssignment {
  id: string;
  title: string;
  object_name: string | null;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  estimated_hours: number | null;
  status: string;
  service_type: string | null;
  order_id: string | null;
  object_id: string | null;
}

export default function EmployeeDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    todayNetMinutes: 0,
    weekNetMinutes: 0,
    monthNetMinutes: 0,
    activeAssignments: 0,
    completedToday: 0,
    pendingNotifications: 0,
    employeeId: null,
    employeeStatus: null,
  });
  const [todaysShifts, setTodaysShifts] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const fetchDashboardData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
      return;
    }
    setCurrentUser(user);

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, avatar_url, role")
      .eq("id", user.id)
      .single();
    setUserProfile(profile);

    // Fetch employee info
    const { data: employeeData } = await supabase
      .from("employees")
      .select("id, status")
      .eq("user_id", user.id)
      .single();

    const empId = employeeData?.id || null;
    const empStatus = employeeData?.status || null;

    // Date ranges
    const today = startOfDay(new Date());
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const monthStart = startOfMonth(today);
    const todayStr = format(today, "yyyy-MM-dd");

    // Fetch time entries for stats
    const { data: timeEntries } = await supabase
      .from("time_entries")
      .select("start_time, end_time, duration_minutes, break_minutes")
      .eq("employee_id", empId)
      .gte("start_time", monthStart.toISOString())
      .order("start_time", { ascending: true });

    // Calculate stats (net hours = total - breaks)
    const calcNetMinutes = (entries: any[]) =>
      (entries || []).reduce(
        (sum, e) => sum + Math.max(0, (e.duration_minutes || 0) - (e.break_minutes || 0)),
        0
      );

    const todayEntries = (timeEntries || []).filter(
      (e) => new Date(e.start_time) >= today
    );
    const weekEntries = (timeEntries || []).filter(
      (e) => new Date(e.start_time) >= weekStart
    );

    setStats({
      todayNetMinutes: calcNetMinutes(todayEntries),
      weekNetMinutes: calcNetMinutes(weekEntries),
      monthNetMinutes: calcNetMinutes(timeEntries || []),
      activeAssignments: 0,
      completedToday: todayEntries.length,
      pendingNotifications: 0,
      employeeId: empId,
      employeeStatus: empStatus,
    });

    // Fetch today's shifts from planning
    if (empId) {
      const { data: shifts } = await supabase
        .from("shifts")
        .select(`
          id,
          start_time,
          end_time,
          estimated_hours,
          status,
          shift_date,
          order_id,
          object_id,
          orders!inner(title, service_type),
          objects!inner(name)
        `)
        .eq("shift_employees.employee_id", empId)
        .eq("shift_date", todayStr)
        .order("start_time", { ascending: true });

      if (shifts) {
        const mapped: ShiftAssignment[] = (shifts as any[]).map((s) => ({
          id: s.id,
          title: (s.orders as any[])?.map((o: any) => o.title)[0] || "Unbenannter Auftrag",
          object_name: (s.objects as any[])?.map((o: any) => o.name)[0] || null,
          shift_date: s.shift_date,
          start_time: s.start_time,
          end_time: s.end_time,
          estimated_hours: s.estimated_hours,
          status: s.status,
          service_type: (s.orders as any[])?.map((o: any) => o.service_type)[0] || null,
          order_id: s.order_id,
          object_id: s.object_id,
        }));
        setTodaysShifts(mapped);
      }
    }

    // Fetch notification count
    const { count: notifCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setStats((prev) => ({
      ...prev,
      pendingNotifications: notifCount || 0,
    }));

    setLoading(false);
    setRefreshing(false);
  }, [supabase]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleEntryCreated = () => {
    fetchDashboardData();
  };

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const formatHours = (minutes: number) => {
    const h = minutes / 60;
    return h.toFixed(1);
  };

  if (loading) {
    return (
      <MobileDashboardLayout
        onSignOut={async () => {
          await supabase.auth.signOut();
          redirect("/login");
        }}
        notificationCount={0}
      >
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </MobileDashboardLayout>
    );
  }

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Guten Morgen";
    if (hour < 18) return "Guten Tag";
    return "Guten Abend";
  })();

  return (
    <MobileDashboardLayout
      onSignOut={async () => {
        await supabase.auth.signOut();
        redirect("/login");
      }}
      notificationCount={stats.pendingNotifications}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {greeting},{" "}
              <span className="text-primary">
                {userProfile?.first_name || "Mitarbeiter"}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {format(new Date(), "EEEE, dd. MMMM yyyy", { locale: de })}
            </p>
          </div>

          {/* Refresh Button */}
          <TouchButton
            variant="ghost"
            size="md"
            icon={<RefreshCw className={cn("h-5 w-5", refreshing && "animate-spin")} />}
            label="Aktualisieren"
            onClick={handleRefresh}
            className="text-muted-foreground"
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <DashboardStatCard
            title="Heute"
            value={formatHours(stats.todayNetMinutes)}
            subtitle="Stunden"
            icon={Clock}
            iconColor="text-blue-600"
          />
          <DashboardStatCard
            title="Diese Woche"
            value={formatHours(stats.weekNetMinutes)}
            subtitle="Stunden"
            icon={CalendarDays}
            iconColor="text-green-600"
          />
          <DashboardStatCard
            title="Monat"
            value={formatHours(stats.monthNetMinutes)}
            subtitle="Stunden"
            icon={TrendingUp}
            iconColor="text-purple-600"
          />
        </div>

        {/* Time Tracker */}
        <TimeTrackerPanel
          userId={currentUser?.id}
          employeeId={stats.employeeId}
          employeeStatus={stats.employeeStatus}
          onEntryCreated={handleEntryCreated}
        />

        {/* Today's Schedule */}
        <DashboardSection
          title="Heutige Einsätze"
          subtitle={
            todaysShifts.length > 0
              ? `${todaysShifts.length} Aufträg${todaysShifts.length === 1 ? "e" : "e"} geplant`
              : "Keine Einsätze für heute"
          }
          action={
            todaysShifts.length > 0
              ? { label: "Alle anzeigen", onClick: () => router.push("/dashboard/planning") }
              : undefined
          }
        >
          {todaysShifts.length > 0 ? (
            <div className="space-y-3">
              {todaysShifts.slice(0, 3).map((shift) => (
                <DashboardTaskCard
                  key={shift.id}
                  id={shift.id}
                  title={shift.title}
                  objectName={shift.object_name}
                  startTime={shift.start_time?.slice(0, 5)}
                  endTime={shift.end_time?.slice(0, 5)}
                  hours={shift.estimated_hours}
                  status={
                    shift.status === "completed"
                      ? "completed"
                      : shift.status === "in_progress"
                      ? "in_progress"
                      : "scheduled"
                  }
                  serviceType={shift.service_type}
                  onStart={() => {
                    router.push(`/dashboard/planning`);
                  }}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-muted/30">
              <CardContent className="p-6 text-center">
                <ListTodo className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Keine geplanten Einsätze für heute.
                </p>
                <TouchButton
                  label="Zum Kalender"
                  variant="outline"
                  size="sm"
                  icon={<ChevronRight className="h-4 w-4" />}
                  iconPosition="right"
                  onClick={() => router.push("/dashboard/planning")}
                  className="mt-3"
                />
              </CardContent>
            </Card>
          )}
        </DashboardSection>

        {/* Quick Links */}
        <DashboardSection title="Schnellzugriff">
          <div className="grid grid-cols-2 gap-3">
            <QuickLinkCard
              icon={<Clock className="h-6 w-6" />}
              label="Zeiterfassung"
              sublabel="Einträge anzeigen"
              onClick={() => router.push("/dashboard/time-tracking")}
              badge={stats.completedToday > 0 ? `${stats.completedToday} heute` : undefined}
            />
            <QuickLinkCard
              icon={<CalendarDays className="h-6 w-6" />}
              label="Planung"
              sublabel="Einsätze & Kalender"
              onClick={() => router.push("/dashboard/planning")}
            />
            <QuickLinkCard
              icon={<CheckCircle className="h-6 w-6" />}
              label="Aufträge"
              sublabel="Meine Aufträge"
              onClick={() => router.push("/dashboard/orders")}
            />
            <QuickLinkCard
              icon={<Bell className="h-6 w-6" />}
              label="Benachrichtigungen"
              sublabel={
                stats.pendingNotifications > 0
                  ? `${stats.pendingNotifications} neu`
                  : "Keine neuen"
              }
              onClick={() => router.push("/dashboard/notifications")}
              badge={
                stats.pendingNotifications > 0
                  ? `${stats.pendingNotifications}`
                  : undefined
              }
            />
          </div>
        </DashboardSection>
      </div>
    </MobileDashboardLayout>
  );
}

interface QuickLinkCardProps {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick: () => void;
  badge?: string | undefined;
}

function QuickLinkCard({
  icon,
  label,
  sublabel,
  onClick,
  badge,
}: QuickLinkCardProps) {
  return (
    <Card
      className={cn(
        "bg-card cursor-pointer transition-all duration-200",
        "hover:shadow-md active:scale-[0.98]",
        "select-none touch-manipulation"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm truncate">{label}</p>
            {badge && (
              <Badge
                variant="default"
                className="text-xs px-1.5 py-0.5 h-5 bg-primary"
              >
                {badge}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{sublabel}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </CardContent>
    </Card>
  );
}
