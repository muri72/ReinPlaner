"use client";

import * as React from "react";
import { getTimeAccountForMonth } from "@/app/dashboard/time-accounts/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, AlertCircle, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import {
  getBalanceWarningLevel,
  formatHours,
  timeAccountStatusConfig,
  timeAccountConfig,
  calculateProRatedTargetHours,
  isCurrentMonth,
  getMonthName
} from "@/lib/time-account-config";

interface TimeAccountSummaryProps {
  employeeId: string;
  employeeName: string;
  year?: number;
  month?: number;
  contractHoursPerWeek?: number | null;
}

interface TimeAccountData {
  balance: number;
  balanceBefore: number;
  targetHours: number;
  actualHours: number;
  monthlyDelta: number;
  year: number;
  month: number;
}

export function TimeAccountSummary({
  employeeId,
  employeeName,
  year: initialYear,
  month: initialMonth,
  contractHoursPerWeek,
}: TimeAccountSummaryProps) {
  const [data, setData] = React.useState<TimeAccountData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedYear, setSelectedYear] = React.useState(initialYear ?? new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = React.useState(initialMonth ?? new Date().getMonth() + 1);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Check if currently selected month is the current month
  const isCurrentMonthSelected = isCurrentMonth(selectedYear, selectedMonth);

  // Calculate pro-rated target hours for current month
  const proRatedTarget = React.useMemo(() => {
    return calculateProRatedTargetHours(contractHoursPerWeek ?? null, selectedYear, selectedMonth);
  }, [contractHoursPerWeek, selectedYear, selectedMonth]);

  // Calculate the "day-to-date" delta (using pro-rated target)
  const proRatedDelta = data ? data.actualHours - proRatedTarget.targetSoFar : 0;

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const result = await getTimeAccountForMonth(employeeId, selectedYear, selectedMonth);
      if (result.success && result.data) {
        setData({
          balance: result.data.balance_after,
          balanceBefore: result.data.balance_before,
          targetHours: result.data.target_hours,
          actualHours: result.data.actual_hours,
          monthlyDelta: result.data.monthly_delta,
          year: result.data.year,
          month: result.data.month,
        });
      } else {
        setError(result.error ?? "Fehler beim Laden");
      }
      setLoading(false);
    };

    fetchData();
  }, [employeeId, selectedYear, selectedMonth]);

  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleToday = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
  };

  // Can't go past current month
  const isCurrentOrFuture = selectedYear > currentYear || (selectedYear === currentYear && selectedMonth >= currentMonth);

  if (loading) {
    return (
      <Card className="glassmorphism-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-2 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Zeitkonto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error ?? "Keine Daten verfügbar"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const warningLevel = getBalanceWarningLevel(data.balance);
  const isPositive = data.balance >= 0;
  const isNeutral = Math.abs(data.balance) < 0.1;
  const statusConfig = isNeutral
    ? timeAccountStatusConfig.neutral
    : isPositive
    ? timeAccountStatusConfig.positive
    : timeAccountStatusConfig.negative;

  const progressPercent = (isCurrentMonthSelected ? proRatedTarget.targetSoFar : data.targetHours) > 0
    ? Math.min(100, (data.actualHours / (isCurrentMonthSelected ? proRatedTarget.targetSoFar : data.targetHours)) * 100)
    : 0;

  // Calculate effective balance for current month (uses pro-rated delta instead of full monthly delta)
  // For completed months, this equals the stored balance_after
  // For current month, this equals balanceBefore + proRatedDelta (day-to-date accurate)
  const effectiveBalance = isCurrentMonthSelected
    ? data.balanceBefore + proRatedDelta
    : data.balance;

  const effectiveWarningLevel = getBalanceWarningLevel(effectiveBalance);
  const effectiveIsPositive = effectiveBalance >= 0;
  const effectiveIsNeutral = Math.abs(effectiveBalance) < 0.1;
  const effectiveStatusConfig = effectiveIsNeutral
    ? timeAccountStatusConfig.neutral
    : effectiveIsPositive
    ? timeAccountStatusConfig.positive
    : timeAccountStatusConfig.negative;

  // Previous month info
  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevMonthYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;

  return (
    <Card className="glassmorphism-card">
      <CardHeader className="pb-3">
        {/* Improved Navigation */}
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Zeitkonto
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3"
              onClick={handlePreviousMonth}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Vorheriger
            </Button>
            <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-lg min-w-[140px] justify-center">
              <span className="text-sm font-semibold">
                {getMonthName(selectedMonth)} {selectedYear}
              </span>
              {isCurrentMonthSelected && (
                <Badge variant="secondary" className="text-xs">Aktuell</Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3"
              onClick={handleNextMonth}
              disabled={isCurrentOrFuture}
            >
              Nächster
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
        {/* Today button - only show when not on current month */}
        {!isCurrentMonthSelected && (
          <div className="flex justify-center mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={handleToday}
            >
              <Calendar className="h-3 w-3 mr-1" />
              Heute
            </Button>
          </div>
        )}
        {contractHoursPerWeek && (
          <Badge variant="outline" className="w-fit mt-1">
            {contractHoursPerWeek}h/Woche
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Previous Month Context - NEW */}
        {data.balanceBefore !== 0 && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <span>Saldo aus {getMonthName(prevMonth)} {prevMonthYear}:</span>
            <span className={data.balanceBefore >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {data.balanceBefore >= 0 ? '+' : ''}{formatHours(data.balanceBefore)}
            </span>
          </div>
        )}

        {/* Main Balance Display */}
        <div className="space-y-2">
          <div className={`text-3xl font-bold ${effectiveStatusConfig.text}`}>
            {effectiveBalance >= 0 ? '+' : ''}{formatHours(Math.abs(effectiveBalance))}
          </div>
          <div className="flex items-center gap-2">
            {effectiveWarningLevel === 'critical' && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {!effectiveIsNeutral && (effectiveIsPositive ? 'Hoher Saldo' : 'Kritisch')}
                {effectiveIsNeutral && 'Ausgeglichen'}
              </Badge>
            )}
            {effectiveWarningLevel === 'warning' && (
              <Badge variant="outline" className={`gap-1 ${effectiveIsPositive ? 'bg-amber-500/10 text-amber-600 border-amber-200' : 'bg-orange-500/10 text-orange-600 border-orange-200'}`}>
                <AlertCircle className="h-3 w-3" />
                Achtung
              </Badge>
            )}
            {effectiveWarningLevel === 'none' && (
              <Badge variant="outline" className={effectiveStatusConfig.border + ' ' + effectiveStatusConfig.text}>
                {effectiveStatusConfig.label}
              </Badge>
            )}
          </div>
        </div>

        {/* Day-to-Date Info for Current Month - NEW */}
        {isCurrentMonthSelected && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 space-y-2 border border-blue-100 dark:border-blue-800">
            <div className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Tagesaktuell ({proRatedTarget.workingDaysSoFar} von {proRatedTarget.totalWorkingDays} Arbeitstagen)
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Soll bisher:</span>
              <span className="font-medium">{formatHours(proRatedTarget.targetSoFar)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Ist:</span>
              <span className="font-medium">{formatHours(data.actualHours)}</span>
            </div>
            <div className={`text-xs font-medium ${proRatedDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              Bisheriges Delta: {proRatedDelta >= 0 ? '+' : ''}{formatHours(proRatedDelta)}
            </div>
          </div>
        )}

        {/* Progress Bar: Target vs Actual */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Soll: {formatHours(isCurrentMonthSelected ? proRatedTarget.targetSoFar : data.targetHours)}</span>
            <span>Ist: {formatHours(data.actualHours)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                progressPercent >= 100
                  ? 'bg-emerald-500'
                  : progressPercent >= 90
                  ? 'bg-blue-500'
                  : progressPercent >= 75
                  ? 'bg-yellow-500'
                  : 'bg-orange-500'
              }`}
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className={(isCurrentMonthSelected ? proRatedDelta : data.monthlyDelta) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {(isCurrentMonthSelected ? proRatedDelta : data.monthlyDelta) >= 0 ? '+' : ''}{formatHours(isCurrentMonthSelected ? proRatedDelta : data.monthlyDelta)} diesen Monat
            </span>
            {(isCurrentMonthSelected ? proRatedDelta : data.monthlyDelta) >= 0 ? (
              <TrendingUp className="h-3 w-3 text-emerald-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-rose-600" />
            )}
          </div>
        </div>

        {/* Info Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            {effectiveIsNeutral
              ? 'Ihr Zeitkonto ist ausgeglichen.'
              : effectiveIsPositive
              ? `Sie haben ${formatHours(effectiveBalance)} Überstunden verfügbar.`
              : `Sie haben ${formatHours(Math.abs(effectiveBalance))} Minusstunden aufgebaut.`
            }
          </p>
          {effectiveWarningLevel !== 'none' && !effectiveIsNeutral && (
            <p className={effectiveIsPositive ? 'text-amber-600' : 'text-rose-600'}>
              {effectiveIsPositive
                ? `Achtung: Max ${formatHours(timeAccountConfig.maxCarryOverHours)} können ins nächste Jahr übertragen werden.`
                : 'Minusstunden sollten so bald wie möglich ausgeglichen werden.'
              }
            </p>
          )}
          {/* Additional neutral info for current month */}
          {isCurrentMonthSelected && Math.abs(proRatedDelta) < 1 && (
            <p className="text-blue-600">
              Der Monat läuft noch. Die Anzeige basiert auf den bisherigen Arbeitstagen.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
