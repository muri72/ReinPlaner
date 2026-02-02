"use client";

import * as React from "react";
import { getEmployeeAbsenceKPIs } from "@/app/dashboard/absence-requests/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Activity, GraduationCap, DollarSign, TrendingUp } from "lucide-react";
import { absenceTypeConfig } from "@/lib/absence-type-config";

interface EmployeeAbsenceKPIsProps {
  employeeId: string;
  employeeName: string;
  year?: number;
}

interface KPIData {
  year: number;
  workingDaysPerWeek: number;
  totalVacation: number;
  remainingVacation: number;
  kpis: {
    vacation: { total: number; byMonth: Record<string, number> };
    sick_leave: { total: number; byMonth: Record<string, number>; occurrences: number };
    training: { total: number; byMonth: Record<string, number> };
    unpaid_leave: { total: number; byMonth: Record<string, number> };
  };
}

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"
];

function KPICard({
  title,
  total,
  icon: Icon,
  color,
  details,
  badge
}: {
  title: string;
  total: number;
  icon: React.ElementType;
  color: string;
  details?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <Card className="glassmorphism-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color}`} />
            {title}
          </span>
          {badge}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-bold">{total} Tage</div>
        {details}
      </CardContent>
    </Card>
  );
}

function SickLeaveDetails({ occurrences, byMonth }: { occurrences: number; byMonth: Record<string, number> }) {
  const isFrequent = occurrences > 3;
  const months = Object.entries(byMonth).sort();

  return (
    <div className="space-y-2">
      {months.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {months.map(([monthKey, days]) => {
            const monthNum = parseInt(monthKey.split("-")[1]) - 1;
            return (
              <Badge key={monthKey} variant="outline" className="text-xs">
                {monthNames[monthNum]}: {days}
              </Badge>
            );
          })}
        </div>
      )}
      <div className={`text-xs ${isFrequent ? "text-orange-500 font-medium" : "text-muted-foreground"}`}>
        {occurrences} Krankenstand{occurrences !== 1 ? "e" : ""}
        {isFrequent && " (häufig)"}
      </div>
    </div>
  );
}

function VacationDetails({
  total,
  remaining,
  totalVacation,
  byMonth
}: {
  total: number;
  remaining: number;
  totalVacation: number;
  byMonth: Record<string, number>;
}) {
  const usagePercent = Math.round((total / totalVacation) * 100);
  const months = Object.entries(byMonth).sort();

  return (
    <div className="space-y-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${
            usagePercent >= 90 ? "bg-red-500" : usagePercent >= 75 ? "bg-yellow-500" : "bg-green-500"
          }`}
          style={{ width: `${Math.min(100, usagePercent)}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground flex justify-between">
        <span>{total} verwendet</span>
        <span>{remaining} verbleibend</span>
      </div>
      {months.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {months.map(([monthKey, days]) => {
            const monthNum = parseInt(monthKey.split("-")[1]) - 1;
            return (
              <Badge key={monthKey} variant="outline" className="text-xs">
                {monthNames[monthNum]}: {days}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function EmployeeAbsenceKPIs({ employeeId, employeeName, year }: EmployeeAbsenceKPIsProps) {
  const [data, setData] = React.useState<KPIData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchKPIs = async () => {
      setLoading(true);
      const result = await getEmployeeAbsenceKPIs(employeeId, year);
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.message || "Fehler beim Laden");
      }
      setLoading(false);
    };
    fetchKPIs();
  }, [employeeId, year]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Abwesenheitsübersicht {year || new Date().getFullYear()}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="glassmorphism-card">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { kpis, remainingVacation, totalVacation, year: dataYear } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Abwesenheitsübersicht {dataYear} - {employeeName}
        </h3>
        <Badge variant="outline">{data.workingDaysPerWeek} Tage/Woche</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Urlaub"
          total={kpis.vacation.total}
          icon={Calendar}
          color={absenceTypeConfig.vacation.text}
          badge={
            <Badge variant={remainingVacation <= 5 ? "destructive" : "secondary"}>
              {remainingVacation} übrig
            </Badge>
          }
          details={
            <VacationDetails
              total={kpis.vacation.total}
              remaining={remainingVacation}
              totalVacation={totalVacation}
              byMonth={kpis.vacation.byMonth}
            />
          }
        />

        <KPICard
          title="Krankheit"
          total={kpis.sick_leave.total}
          icon={Activity}
          color={absenceTypeConfig.sick_leave.text}
          badge={
            kpis.sick_leave.occurrences > 3 ? (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200">
                <TrendingUp className="h-3 w-3 mr-1" />
                Häufig
              </Badge>
            ) : undefined
          }
          details={
            <SickLeaveDetails
              occurrences={kpis.sick_leave.occurrences}
              byMonth={kpis.sick_leave.byMonth}
            />
          }
        />

        <KPICard
          title="Weiterbildung"
          total={kpis.training.total}
          icon={GraduationCap}
          color={absenceTypeConfig.training.text}
          details={
            Object.entries(kpis.training.byMonth).length > 0 ? (
              <div className="flex gap-1 flex-wrap">
                {Object.entries(kpis.training.byMonth).map(([monthKey, days]) => {
                  const monthNum = parseInt(monthKey.split("-")[1]) - 1;
                  return (
                    <Badge key={monthKey} variant="outline" className="text-xs">
                      {monthNames[monthNum]}: {days}
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Keine Einträge</div>
            )
          }
        />

        <KPICard
          title="Unbezahlter Urlaub"
          total={kpis.unpaid_leave.total}
          icon={DollarSign}
          color={absenceTypeConfig.unpaid_leave.text}
          details={
            Object.entries(kpis.unpaid_leave.byMonth).length > 0 ? (
              <div className="flex gap-1 flex-wrap">
                {Object.entries(kpis.unpaid_leave.byMonth).map(([monthKey, days]) => {
                  const monthNum = parseInt(monthKey.split("-")[1]) - 1;
                  return (
                    <Badge key={monthKey} variant="outline" className="text-xs">
                      {monthNames[monthNum]}: {days}
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Keine Einträge</div>
            )
          }
        />
      </div>
    </div>
  );
}
