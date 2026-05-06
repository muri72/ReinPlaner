'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PlatformKPI, MonthlyRevenue, RevenueForecast } from '@/lib/actions/platform-admin';

interface RevenuePageClientProps {
  history: MonthlyRevenue[];
  forecast: RevenueForecast[];
  kpis: PlatformKPI | null;
}

const colorMap = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
};

function EuroIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22V12h6v10M9 6h.01M15 6h.01M9 10h.01M15 10h.01" />
    </svg>
  );
}

function TrendUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

interface KPICardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: keyof typeof colorMap;
  trend?: string;
}

function KPICard({ label, value, icon, color, trend }: KPICardProps) {
  const colors = colorMap[color];

  return (
    <Card className="bg-white dark:bg-slate-800 border dark:border-slate-700">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
            <span className="text-2xl font-bold">{value}</span>
            {trend && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <TrendUpIcon className="w-3 h-3" />
                {trend}
              </span>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colors.bg}`}>
            <div className={colors.text}>
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface RevenueBarChartProps {
  data: MonthlyRevenue[];
  height?: number;
}

function RevenueBarChart({ data, height = 280 }: RevenueBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
        No revenue data available
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue));
  const chartWidth = 100;
  const chartHeight = height;
  const barWidth = chartWidth / data.length;
  const paddingLeft = 12;
  const paddingBottom = 15;
  const paddingTop = 10;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${chartWidth + paddingLeft} ${chartHeight}`}
        className="w-full"
        style={{ height: `${height}px` }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Y-axis labels */}
        <text x={paddingLeft - 2} y={paddingTop + 5} className="text-[8px] fill-slate-500 dark:fill-slate-400" textAnchor="end">
          €{maxRevenue.toLocaleString('de-DE')}
        </text>
        <text x={paddingLeft - 2} y={chartHeight / 2 + paddingTop / 2} className="text-[8px] fill-slate-500 dark:fill-slate-400" textAnchor="end">
          €{(maxRevenue / 2).toLocaleString('de-DE')}
        </text>
        <text x={paddingLeft - 2} y={chartHeight - 3} className="text-[8px] fill-slate-500 dark:fill-slate-400" textAnchor="end">
          €0
        </text>

        {/* Grid lines */}
        <line x1={paddingLeft} y1={paddingTop} x2={chartWidth} y2={paddingTop} stroke="currentColor" strokeOpacity="0.1" className="dark:stroke-slate-600" />
        <line x1={paddingLeft} y1={chartHeight / 2 + paddingTop / 2} x2={chartWidth} y2={chartHeight / 2 + paddingTop / 2} stroke="currentColor" strokeOpacity="0.1" className="dark:stroke-slate-600" />
        <line x1={paddingLeft} y1={chartHeight - paddingBottom} x2={chartWidth} y2={chartHeight - paddingBottom} stroke="currentColor" strokeOpacity="0.1" className="dark:stroke-slate-600" />

        {/* Bars */}
        {data.map((item, index) => {
          const usableHeight = chartHeight - paddingTop - paddingBottom;
          const barHeight = maxRevenue > 0 ? (item.revenue / maxRevenue) * usableHeight : 0;
          const x = paddingLeft + index * barWidth + barWidth * 0.15;
          const barW = barWidth * 0.7;
          const y = chartHeight - paddingBottom - barHeight;

          return (
            <g
              key={item.month}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <rect
                x={x}
                y={y}
                width={barW}
                height={barHeight}
                fill={hoveredIndex === index ? 'currentColor' : 'currentColor'}
                className={`transition-colors ${hoveredIndex === index ? 'text-blue-400 dark:text-blue-300' : 'text-blue-500 dark:text-blue-400'}`}
                rx="2"
              />
              <text
                x={x + barW / 2}
                y={chartHeight - 2}
                className="text-[7px] fill-slate-500 dark:fill-slate-400"
                textAnchor="middle"
              >
                {item.month}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <div
          className="absolute top-2 right-2 bg-slate-900 dark:bg-slate-700 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none"
          style={{ transform: 'translateX(-50%)' }}
        >
          {data[hoveredIndex].month}: €{data[hoveredIndex].revenue.toLocaleString('de-DE')}
        </div>
      )}
    </div>
  );
}

interface ForecastSectionProps {
  forecast: RevenueForecast[];
}

function ForecastSection({ forecast }: ForecastSectionProps) {
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge variant="success" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">High</Badge>;
    } else if (confidence >= 0.5) {
      return <Badge variant="warning" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400">Medium</Badge>;
    }
    return <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">Low</Badge>;
  };

  return (
    <Card className="bg-white dark:bg-slate-800 border dark:border-slate-700">
      <CardHeader>
        <CardTitle className="text-lg">Revenue Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Month</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Predicted MRR</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((item) => (
                <tr key={item.month} className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-3 px-4 font-medium">{item.month}</td>
                  <td className="py-3 px-4">€{item.predicted_revenue.toLocaleString('de-DE')}</td>
                  <td className="py-3 px-4">{getConfidenceBadge(item.confidence)}</td>
                </tr>
              ))}
              {forecast.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No forecast data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

interface RevenueByPlanProps {
  history: MonthlyRevenue[];
}

function RevenueByPlan({ history }: RevenueByPlanProps) {
  // Mock breakdown - in reality this would come from the backend
  const planBreakdown = [
    { plan: 'Starter', revenue: history.reduce((sum, m) => sum + m.revenue * 0.2, 0), color: 'bg-slate-400 dark:bg-slate-500' },
    { plan: 'Professional', revenue: history.reduce((sum, m) => sum + m.revenue * 0.45, 0), color: 'bg-blue-500 dark:bg-blue-400' },
    { plan: 'Enterprise', revenue: history.reduce((sum, m) => sum + m.revenue * 0.35, 0), color: 'bg-violet-500 dark:bg-violet-400' },
  ];

  const total = planBreakdown.reduce((sum, p) => sum + p.revenue, 0);

  return (
    <Card className="bg-white dark:bg-slate-800 border dark:border-slate-700">
      <CardHeader>
        <CardTitle className="text-lg">Revenue by Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {planBreakdown.map((item) => {
            const percentage = total > 0 ? (item.revenue / total) * 100 : 0;
            return (
              <div key={item.plan} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{item.plan}</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    €{item.revenue.toLocaleString('de-DE')} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function RevenuePageClient({ history, forecast, kpis }: RevenuePageClientProps) {
  // Calculate totals
  const totalRevenue = history.reduce((sum, m) => sum + m.revenue, 0);
  const mrr = kpis?.mrr ?? 0;
  
  // Calculate growth rate vs last month
  const lastMonth = history.length > 1 ? history[history.length - 2].revenue : 0;
  const currentMonth = history.length > 0 ? history[history.length - 1].revenue : 0;
  const growthRate = lastMonth > 0 ? ((currentMonth - lastMonth) / lastMonth) * 100 : 0;
  const growthRateStr = growthRate >= 0 ? `+${growthRate.toFixed(1)}%` : `${growthRate.toFixed(1)}%`;

  const activeTenants = kpis?.active_tenants ?? 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Revenue (All Time)"
          value={`€${totalRevenue.toLocaleString('de-DE')}`}
          icon={<EuroIcon className="w-6 h-6" />}
          color="blue"
        />
        <KPICard
          label="Monthly Recurring Revenue"
          value={`€${mrr.toLocaleString('de-DE')}`}
          icon={<ChartIcon className="w-6 h-6" />}
          color="emerald"
        />
        <KPICard
          label="Growth vs Last Month"
          value={growthRateStr}
          icon={<TrendUpIcon className="w-6 h-6" />}
          color={growthRate >= 0 ? 'emerald' : 'amber'}
        />
        <KPICard
          label="Active Tenants"
          value={activeTenants.toLocaleString('de-DE')}
          icon={<BuildingIcon className="w-6 h-6" />}
          color="violet"
        />
      </div>

      {/* Revenue History Chart */}
      <Card className="bg-white dark:bg-slate-800 border dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg">Monthly MRR History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <RevenueBarChart data={history} height={260} />
          </div>
        </CardContent>
      </Card>

      {/* Two column layout for Forecast and Plan breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ForecastSection forecast={forecast} />
        <RevenueByPlan history={history} />
      </div>
    </div>
  );
}
