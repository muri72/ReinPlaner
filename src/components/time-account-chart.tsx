"use client";

import * as React from "react";
import { getTimeAccountYearSummary } from "@/app/dashboard/time-accounts/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { formatHours, isCurrentMonth, calculateProRatedTargetHours } from "@/lib/time-account-config";

interface TimeAccountChartProps {
  employeeId: string;
  employeeName: string;
  year?: number;
  contractHoursPerWeek?: number | null;
}

const monthNames = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"
];

const fullMonthNames = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

interface ChartData {
  month: string;
  fullMonth: string;
  soll: number;
  ist: number;
  delta: number;
  saldo: number;
  effectiveSoll: number;  // Pro-rated target for current month
  effectiveDelta: number;  // Pro-rated delta for current month
  effectiveSaldo: number; // Effective balance for current month
  balanceBefore: number;
  isCurrentMonth: boolean;
}

export function TimeAccountChart({
  employeeId,
  employeeName,
  year: initialYear,
  contractHoursPerWeek,
}: TimeAccountChartProps) {
  const [data, setData] = React.useState<ChartData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedYear, setSelectedYear] = React.useState(initialYear ?? new Date().getFullYear());

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await getTimeAccountYearSummary(employeeId, selectedYear);
      if (result.success && result.data) {
        const chartData: ChartData[] = result.data.monthly_data.map((m) => {
          const isCurrent = isCurrentMonth(selectedYear, m.month);
          const targetHours = Number(m.target_hours);
          const actualHours = Number(m.actual_hours);
          const monthlyDelta = Number(m.monthly_delta);
          const balanceAfter = Number(m.balance_after);
          const balanceBefore = Number(m.balance_before);

          // Calculate effective values for current month (pro-rated)
          let effectiveSoll = targetHours;
          let effectiveDelta = monthlyDelta;
          let effectiveSaldo = balanceAfter;

          if (isCurrent) {
            const proRatedTarget = calculateProRatedTargetHours(contractHoursPerWeek ?? null, selectedYear, m.month);
            effectiveSoll = proRatedTarget.targetSoFar;
            effectiveDelta = actualHours - effectiveSoll;
            effectiveSaldo = balanceBefore + effectiveDelta;
          }

          return {
            month: monthNames[m.month - 1],
            fullMonth: fullMonthNames[m.month - 1],
            soll: targetHours,
            ist: actualHours,
            delta: monthlyDelta,
            saldo: balanceAfter,
            effectiveSoll,
            effectiveDelta,
            effectiveSaldo,
            balanceBefore,
            isCurrentMonth: isCurrent,
          };
        });
        setData(chartData);
      }
      setLoading(false);
    };

    fetchData();
  }, [employeeId, selectedYear, contractHoursPerWeek]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="glassmorphism-card">
          <CardHeader>
            <Skeleton className="h-5 w-60" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.length === 0) {
    return null;
  }

  const lastMonthData = data[data.length - 1];
  const closingBalance = lastMonthData?.saldo ?? 0;
  const openingBalance = data[0]?.balanceBefore ?? 0;
  const totalPositive = data.filter(d => d.delta > 0).reduce((sum, d) => sum + d.delta, 0);
  const totalNegative = Math.abs(data.filter(d => d.delta < 0).reduce((sum, d) => sum + d.delta, 0));

  // Calculate effective closing balance for current year (uses pro-rated delta for current month)
  const isViewingCurrentYear = selectedYear === new Date().getFullYear();
  const lastMonthIsCurrent = lastMonthData?.isCurrentMonth ?? false;

  let effectiveClosingBalance = closingBalance;
  let effectiveTotalNegative = totalNegative;

  if (isViewingCurrentYear && lastMonthIsCurrent && lastMonthData) {
    // Find the actual month number (1-12)
    const monthIndex = data.indexOf(lastMonthData);
    const actualMonth = monthIndex + 1;

    const proRatedTarget = calculateProRatedTargetHours(contractHoursPerWeek ?? null, selectedYear, actualMonth);
    const proRatedDelta = lastMonthData.ist - proRatedTarget.targetSoFar;
    effectiveClosingBalance = lastMonthData.balanceBefore + proRatedDelta;

    // Adjust total negative to use pro-rated delta instead of full monthly delta
    if (lastMonthData.delta < 0) {
      effectiveTotalNegative = totalNegative - Math.abs(lastMonthData.delta) + Math.abs(proRatedDelta);
    }
  }

  // Custom tooltip to show additional context
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const showEffective = data.isCurrentMonth;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-md">
          <p className="font-semibold text-sm">{data.fullMonth} {selectedYear}</p>
          {data.isCurrentMonth && (
            <p className="text-xs text-muted-foreground">(Aktueller Monat - Tagesaktuell)</p>
          )}
          <div className="mt-2 space-y-1 text-xs">
            <p>Soll: <span className="font-medium">{formatHours(showEffective ? data.effectiveSoll : data.soll)}</span></p>
            <p>Ist: <span className="font-medium">{formatHours(data.ist)}</span></p>
            <p className={(showEffective ? data.effectiveDelta : data.delta) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              Delta: {(showEffective ? data.effectiveDelta : data.delta) >= 0 ? '+' : ''}{formatHours(showEffective ? data.effectiveDelta : data.delta)}
            </p>
            <p className={(showEffective ? data.effectiveSaldo : data.saldo) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              Saldo: {(showEffective ? data.effectiveSaldo : data.saldo) >= 0 ? '+' : ''}{formatHours(showEffective ? data.effectiveSaldo : data.saldo)}
            </p>
            {data.balanceBefore !== 0 && (
              <p className="text-muted-foreground">
                Vormonat: {data.balanceBefore >= 0 ? '+' : ''}{formatHours(data.balanceBefore)}
              </p>
            )}
            {data.isCurrentMonth && data.effectiveDelta !== data.delta && (
              <p className="text-muted-foreground text-xs pt-1 border-t">
                Projiziert am Monatsende: {data.delta >= 0 ? '+' : ''}{formatHours(data.delta)}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Zeitkonto-Verlauf {selectedYear} - {employeeName}
        </h3>
      </div>

      {/* Year Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="glassmorphism-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Jahresanfang-Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-2 ${openingBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {openingBalance >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-xl font-bold">{openingBalance >= 0 ? '+' : ''}{formatHours(openingBalance)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphism-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Gesamt Überstunden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-xl font-bold text-emerald-600">{formatHours(totalPositive)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphism-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Gesamt Minusstunden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-rose-600" />
              <span className="text-xl font-bold text-rose-600">{formatHours(effectiveTotalNegative)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphism-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Jahresend-Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-2 ${effectiveClosingBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {effectiveClosingBalance >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-xl font-bold">{effectiveClosingBalance >= 0 ? '+' : ''}{formatHours(effectiveClosingBalance)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Target vs Actual Bar Chart - uses effectiveSoll for current month */}
        <Card className="glassmorphism-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Soll vs. Ist (Stunden)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  label={{ value: 'Stunden', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="effectiveSoll" fill="hsl(var(--muted))" name="Soll" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ist" fill="hsl(var(--primary))" name="Ist" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Balance Trend Line Chart - uses effectiveSaldo for current month */}
        <Card className="glassmorphism-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Saldo-Verlauf</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  label={{ value: 'Stunden', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <ReferenceLine y={0} stroke="hsl(var(--muted))" strokeDasharray="3 3" />
                <ReferenceLine
                  y={openingBalance}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="5 5"
                  label={{ value: 'Jahresanfang', position: 'left', fill: 'hsl(var(--primary))', fontSize: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey="effectiveSaldo"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Saldo"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Delta Summary - uses effectiveDelta for current month */}
      <Card className="glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Monatliche Überschüsse / Defizite</CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                label={{ value: 'Stunden', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="hsl(var(--muted))" strokeDasharray="3 3" />
              <Bar
                dataKey="effectiveDelta"
                fill="hsl(var(--primary))"
                name="Delta"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
