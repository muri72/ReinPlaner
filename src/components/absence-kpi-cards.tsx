"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Users, Clock, CheckCircle, Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";
import { absenceTypeConfig } from "@/lib/absence-type-config";

interface AbsenceKpiData {
  todayAbsent: {
    total: number;
    vacation: number;
    sick: number;
    training: number;
    unpaidLeave: number;
  };
  pendingRequests: number;
  approvedThisMonth: number;
  sickDaysThisMonth: number;
}

const INITIAL_KPIS: AbsenceKpiData = {
  todayAbsent: { total: 0, vacation: 0, sick: 0, training: 0, unpaidLeave: 0 },
  pendingRequests: 0,
  approvedThisMonth: 0,
  sickDaysThisMonth: 0,
};

export function AbsenceKpiCards() {
  const supabase = createClient();
  const [kpis, setKpis] = React.useState<AbsenceKpiData>(INITIAL_KPIS);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchKpis = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

        // Fetch today's absences
        const { data: todayAbsences } = await supabase
          .from('absence_requests')
          .select('id, type')
          .eq('status', 'approved')
          .lte('start_date', today)
          .gte('end_date', today);

        // Fetch pending requests
        const { count: pendingCount } = await supabase
          .from('absence_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Fetch approved this month
        const { count: approvedCount } = await supabase
          .from('absence_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved')
          .gte('start_date', monthStart)
          .lte('start_date', monthEnd);

        // Fetch sick days this month (counting each day of approved sick leave)
        const { data: sickDaysData } = await supabase
          .from('absence_requests')
          .select('start_date, end_date')
          .eq('status', 'approved')
          .eq('type', 'sick_leave')
          .gte('end_date', monthStart)
          .lte('start_date', monthEnd);

        // Calculate sick days
        let sickDaysThisMonth = 0;
        if (sickDaysData) {
          sickDaysData.forEach(request => {
            const start = new Date(request.start_date);
            const end = new Date(request.end_date);
            const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            sickDaysThisMonth += daysDiff;
          });
        }

        // Process today's absences by type
        const todayAbsent: AbsenceKpiData['todayAbsent'] = {
          total: 0,
          vacation: 0,
          sick: 0,
          training: 0,
          unpaidLeave: 0,
        };

        if (todayAbsences) {
          todayAbsent.total = todayAbsences.length;
          todayAbsences.forEach(absence => {
            switch (absence.type) {
              case 'vacation':
                todayAbsent.vacation++;
                break;
              case 'sick_leave':
                todayAbsent.sick++;
                break;
              case 'training':
                todayAbsent.training++;
                break;
              case 'unpaid_leave':
                todayAbsent.unpaidLeave++;
                break;
            }
          });
        }

        setKpis({
          todayAbsent,
          pendingRequests: pendingCount || 0,
          approvedThisMonth: approvedCount || 0,
          sickDaysThisMonth,
        });
      } catch (error) {
        console.error('Error fetching KPIs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchKpis();
  }, [supabase]);

  if (loading) {
    return (
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Abwesenheits-KPIs
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`kpi-skeleton-${index}`} className="glassmorphism-card">
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Abwesenheits-KPIs
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Today Absent */}
        <Card className="glassmorphism-card hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Heute Abwesend</CardTitle>
            <div className="rounded-full bg-primary/10 p-1.5">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">{kpis.todayAbsent.total}</div>
            <div className="flex flex-wrap gap-1">
              {kpis.todayAbsent.vacation > 0 && (
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 border", absenceTypeConfig.vacation.bg, absenceTypeConfig.vacation.border, absenceTypeConfig.vacation.text)}>
                  Urlaub: {kpis.todayAbsent.vacation}
                </Badge>
              )}
              {kpis.todayAbsent.sick > 0 && (
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 border", absenceTypeConfig.sick_leave.bg, absenceTypeConfig.sick_leave.border, absenceTypeConfig.sick_leave.text)}>
                  Krank: {kpis.todayAbsent.sick}
                </Badge>
              )}
              {kpis.todayAbsent.training > 0 && (
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 border", absenceTypeConfig.training.bg, absenceTypeConfig.training.border, absenceTypeConfig.training.text)}>
                  Weiterb.: {kpis.todayAbsent.training}
                </Badge>
              )}
              {kpis.todayAbsent.unpaidLeave > 0 && (
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 border", absenceTypeConfig.unpaid_leave.bg, absenceTypeConfig.unpaid_leave.border, absenceTypeConfig.unpaid_leave.text)}>
                  Unbez. Urlaub: {kpis.todayAbsent.unpaidLeave}
                </Badge>
              )}
              {kpis.todayAbsent.total === 0 && (
                <span className="text-xs text-muted-foreground">Alle anwesend</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Pending Requests */}
        <Card className="glassmorphism-card hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Offene Anträge</CardTitle>
            <div className="rounded-full bg-amber-100 dark:bg-amber-900/50 p-1.5">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">{kpis.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">
              Wartende Genehmigungen
            </p>
            {kpis.pendingRequests > 0 && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-2 py-0 h-5",
                  kpis.pendingRequests > 10
                    ? "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300"
                    : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                )}
              >
                {kpis.pendingRequests > 10 ? "Dringend bearbeiten" : "Ausstehende Aktion"}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Approved This Month */}
        <Card className="glassmorphism-card hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Genehmigt (Monat)</CardTitle>
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 p-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">{kpis.approvedThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              Anträge diesen Monat genehmigt
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Sick Days This Month */}
        <Card className="glassmorphism-card hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Krankheitstage</CardTitle>
            <div className="rounded-full bg-rose-100 dark:bg-rose-900/50 p-1.5">
              <Thermometer className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">{kpis.sickDaysThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              Krankheitstage diesen Monat
            </p>
            {kpis.sickDaysThisMonth > 0 && (
              <Badge variant="outline" className={cn("text-[10px] px-2 py-0 h-5 border", absenceTypeConfig.sick_leave.bg, absenceTypeConfig.sick_leave.border, absenceTypeConfig.sick_leave.text)}>
                {kpis.sickDaysThisMonth} {kpis.sickDaysThisMonth === 1 ? "Tag" : "Tage"}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
