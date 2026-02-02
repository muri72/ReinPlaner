"use client";

import * as React from "react";
import { getVacationBalance } from "@/app/dashboard/absence-requests/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface VacationBalanceData {
  employeeName: string;
  totalDays: number;
  daysUsed: number;
  remainingDays: number;
  contractHoursPerWeek: number;
  workingDaysPerWeek: number;
}

interface VacationBalanceSummaryProps {
  employeeId: string;
}

export function VacationBalanceSummary({ employeeId }: VacationBalanceSummaryProps) {
  const [data, setData] = React.useState<VacationBalanceData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchBalance = async () => {
      setLoading(true);
      const result = await getVacationBalance(employeeId);
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.message || "Fehler beim Laden");
      }
      setLoading(false);
    };
    fetchBalance();
  }, [employeeId]);

  if (loading) {
    return (
      <Card className="glassmorphism-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Urlaubssaldo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  const usagePercent = (data.daysUsed / data.totalDays) * 100;
  const isLowBalance = data.remainingDays <= 5;

  return (
    <Card className="glassmorphism-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className={cn(
            "rounded-full p-1.5",
            isLowBalance ? "bg-amber-100 dark:bg-amber-900/50" : "bg-emerald-100 dark:bg-emerald-900/50"
          )}>
            <Calendar className={cn(
              "h-4 w-4",
              isLowBalance ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
            )} />
          </div>
          <span>Urlaubssaldo - {data.employeeName}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">{data.remainingDays} Tage</div>
          <Badge variant={isLowBalance ? "warning" : "secondary"}>
            {isLowBalance ? "Niedrig" : "Ausreichend"}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {data.daysUsed} von {data.totalDays} Tagen verwendet ({Math.round(usagePercent)}%)
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${
              usagePercent >= 90
                ? "bg-red-500"
                : usagePercent >= 75
                  ? "bg-amber-500"
                  : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(100, usagePercent)}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground pt-2 border-t border-border/50 flex justify-between">
          <span>Vertrag: {data.contractHoursPerWeek}h / Woche</span>
          <span>{data.workingDaysPerWeek} Tage/Woche</span>
        </div>
      </CardContent>
    </Card>
  );
}
