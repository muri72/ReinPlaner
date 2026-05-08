'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MonthlyRevenue, RevenueForecast } from '@/lib/actions/platform-admin';

interface ForecastPageClientProps {
  history: MonthlyRevenue[];
  forecast: RevenueForecast[];
}

const colorMap = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
};

interface TrendLineChartProps {
  history: MonthlyRevenue[];
  forecast: RevenueForecast[];
  height?: number;
}

function TrendLineChart({ history, forecast, height = 300 }: TrendLineChartProps) {
  const allData = useMemo(() => {
    const historyPoints = history.map(h => ({ month: h.month, revenue: h.revenue, isForecast: false }));
    const forecastPoints = forecast.map(f => ({ month: f.month, revenue: f.predicted_revenue, isForecast: true }));
    return [...historyPoints, ...forecastPoints];
  }, [history, forecast]);

  if (allData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
        No data available
      </div>
    );
  }

  const allRevenues = allData.map(d => d.revenue);
  const maxRevenue = Math.max(...allRevenues);
  const minRevenue = Math.min(...allRevenues);
  const range = maxRevenue - minRevenue || 1;

  const chartWidth = 100;
  const chartHeight = height;
  const paddingLeft = 12;
  const paddingRight = 5;
  const paddingTop = 10;
  const paddingBottom = 20;

  const usableWidth = chartWidth - paddingLeft - paddingRight;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

  const points = allData.map((item, index) => {
    const x = paddingLeft + (index / (allData.length - 1)) * usableWidth;
    const y = paddingTop + usableHeight - ((item.revenue - minRevenue) / range) * usableHeight;
    return { x, y, ...item };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      className="w-full"
      style={{ height: `${height}px` }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Y-axis labels */}
      <text x={paddingLeft - 2} y={paddingTop + 5} className="text-[8px] fill-slate-500 dark:fill-slate-400" textAnchor="end">
        €{maxRevenue.toLocaleString('de-DE')}
      </text>
      <text x={paddingLeft - 2} y={chartHeight - 4} className="text-[8px] fill-slate-500 dark:fill-slate-400" textAnchor="end">
        €{minRevenue.toLocaleString('de-DE')}
      </text>

      {/* Grid lines */}
      <line x1={paddingLeft} y1={paddingTop} x2={chartWidth - paddingRight} y2={paddingTop} stroke="currentColor" strokeOpacity="0.1" className="dark:stroke-slate-600" />
      <line x1={paddingLeft} y1={paddingTop + usableHeight / 2} x2={chartWidth - paddingRight} y2={paddingTop + usableHeight / 2} stroke="currentColor" strokeOpacity="0.1" className="dark:stroke-slate-600" />
      <line x1={paddingLeft} y1={paddingTop + usableHeight} x2={chartWidth - paddingRight} y2={paddingTop + usableHeight} stroke="currentColor" strokeOpacity="0.1" className="dark:stroke-slate-600" />

      {/* Historical line (solid) */}
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        className="text-blue-500 dark:text-blue-400"
        strokeWidth="0.4"
        strokeLinejoin="round"
      />

      {/* Forecast line (dashed) */}
      {points.filter(p => p.isForecast).map((point, i, arr) => {
        if (i === 0 && arr.length > 1) {
          const prevIndex = points.findIndex(p => !p.isForecast);
          const prevPoint = points[prevIndex];
          return (
            <line
              key={`forecast-${i}`}
              x1={prevPoint.x}
              y1={prevPoint.y}
              x2={point.x}
              y2={point.y}
              stroke="currentColor"
              className="text-amber-500 dark:text-amber-400"
              strokeWidth="0.3"
              strokeDasharray="1,1"
            />
          );
        }
        if (i > 0) {
          const prev = arr[i - 1];
          return (
            <line
              key={`forecast-${i}`}
              x1={prev.x}
              y1={prev.y}
              x2={point.x}
              y2={point.y}
              stroke="currentColor"
              className="text-amber-500 dark:text-amber-400"
              strokeWidth="0.3"
              strokeDasharray="1,1"
            />
          );
        }
        return null;
      })}

      {/* Data points */}
      {points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r="1"
          fill={point.isForecast ? 'currentColor' : 'currentColor'}
          className={point.isForecast ? 'text-amber-500 dark:text-amber-400' : 'text-blue-500 dark:text-blue-400'}
        />
      ))}

      {/* X-axis labels */}
      {points.filter((_, i) => i % Math.ceil(points.length / 8) === 0 || i === points.length - 1).map((point, index) => (
        <text
          key={index}
          x={point.x}
          y={chartHeight - 2}
          className="text-[7px] fill-slate-500 dark:fill-slate-400"
          textAnchor="middle"
        >
          {point.month}
        </text>
      ))}
    </svg>
  );
}

interface ForecastTableProps {
  forecast: RevenueForecast[];
  history: MonthlyRevenue[];
}

function ForecastTable({ forecast, history }: ForecastTableProps) {
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
        <CardTitle className="text-lg">Forecast Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Type</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Month</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">MRR</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {/* Historical data for comparison */}
              {history.map((item) => (
                <tr key={`hist-${item.month}`} className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
                  <td className="py-3 px-4">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">Historical</Badge>
                  </td>
                  <td className="py-3 px-4 font-medium">{item.month}</td>
                  <td className="py-3 px-4">€{item.revenue.toLocaleString('de-DE')}</td>
                  <td className="py-3 px-4">-</td>
                </tr>
              ))}
              {/* Forecast data */}
              {forecast.map((item) => (
                <tr key={`fc-${item.month}`} className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="py-3 px-4">
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">Forecast</Badge>
                  </td>
                  <td className="py-3 px-4 font-medium">{item.month}</td>
                  <td className="py-3 px-4">€{item.predicted_revenue.toLocaleString('de-DE')}</td>
                  <td className="py-3 px-4">{getConfidenceBadge(item.confidence)}</td>
                </tr>
              ))}
              {forecast.length === 0 && history.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No data available
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

interface GrowthInsightsProps {
  history: MonthlyRevenue[];
  forecast: RevenueForecast[];
}

function GrowthInsights({ history, forecast }: GrowthInsightsProps) {
  const insights = useMemo(() => {
    if (history.length < 2) {
      return {
        avgGrowth: 0,
        bestMonth: null,
        projectedAnnual: 0,
      };
    }

    // Calculate monthly growth rates from history
    const growthRates: number[] = [];
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1].revenue;
      const curr = history[i].revenue;
      if (prev > 0) {
        growthRates.push((curr - prev) / prev);
      }
    }

    const avgGrowth = growthRates.length > 0
      ? growthRates.reduce((sum, g) => sum + g, 0) / growthRates.length * 100
      : 0;

    // Find best month
    let bestMonth = history[0];
    for (const month of history) {
      if (month.revenue > bestMonth.revenue) {
        bestMonth = month;
      }
    }

    // Project annual revenue based on last month MRR * 12
    const lastMRR = history.length > 0 ? history[history.length - 1].revenue : 0;
    const projectedAnnual = lastMRR * 12;

    return {
      avgGrowth,
      bestMonth,
      projectedAnnual,
    };
  }, [history, forecast]);

  const TrendUpIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );

  const StarIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );

  const CalendarIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );

  return (
    <Card className="bg-white dark:bg-slate-800 border dark:border-slate-700">
      <CardHeader>
        <CardTitle className="text-lg">Growth Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Average Monthly Growth */}
          <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <TrendUpIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">Avg Monthly Growth</span>
            </div>
            <span className={`text-2xl font-bold ${insights.avgGrowth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {insights.avgGrowth >= 0 ? '+' : ''}{insights.avgGrowth.toFixed(1)}%
            </span>
          </div>

          {/* Best Month */}
          <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <StarIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">Best Month</span>
            </div>
            <span className="text-xl font-bold">
              {insights.bestMonth ? insights.bestMonth.month : '-'}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {insights.bestMonth ? `€${insights.bestMonth.revenue.toLocaleString('de-DE')}` : ''}
            </span>
          </div>

          {/* Projected Annual Revenue */}
          <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">Projected Annual</span>
            </div>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              €{insights.projectedAnnual.toLocaleString('de-DE')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ForecastPageClient({ history, forecast }: ForecastPageClientProps) {
  return (
    <div className="space-y-6">
      {/* Trend Line Chart */}
      <Card className="bg-white dark:bg-slate-800 border dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg">Revenue Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <TrendLineChart history={history} forecast={forecast} height={280} />
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-500 dark:bg-blue-400" />
              <span className="text-slate-500 dark:text-slate-400">Historical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-amber-500 dark:bg-amber-400" style={{ borderStyle: 'dashed', borderWidth: '1px', background: 'none', borderColor: 'currentColor' }} />
              <span className="text-slate-500 dark:text-slate-400">Forecast</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Growth Insights */}
      <GrowthInsights history={history} forecast={forecast} />

      {/* Forecast Table */}
      <ForecastTable forecast={forecast} history={history} />
    </div>
  );
}
