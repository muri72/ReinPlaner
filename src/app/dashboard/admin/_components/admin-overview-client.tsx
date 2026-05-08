'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PlatformKPI, PlatformRevenueStats, TenantListItem } from '@/lib/actions/platform-admin';

interface AdminOverviewClientProps {
  kpis: PlatformKPI | null;
  revenueStats: PlatformRevenueStats | null;
  tenants: TenantListItem[];
  error: string | null;
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

function ShoppingCartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

interface KPICardProps {
  label: string;
  value: string | number;
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
              <span className="text-xs text-emerald-600 dark:text-emerald-400">{trend}</span>
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

interface MiniBarChartProps {
  data: { month: string; revenue: number }[];
  height?: number;
}

function MiniBarChart({ data, height = 200 }: MiniBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
        No data available
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue));
  const barWidth = 100 / data.length;

  return (
    <svg 
      viewBox={`0 0 100 ${height}`} 
      className="w-full" 
      style={{ height: `${height}px` }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Y-axis labels */}
      <text x="-2" y="10" className="text-[8px] fill-slate-500 dark:fill-slate-400" textAnchor="end">
        {maxRevenue.toLocaleString('de-DE')}
      </text>
      <text x="-2" y={height / 2} className="text-[8px] fill-slate-500 dark:fill-slate-400" textAnchor="end">
        {(maxRevenue / 2).toLocaleString('de-DE')}
      </text>
      <text x="-2" y={height - 5} className="text-[8px] fill-slate-500 dark:fill-slate-400" textAnchor="end">
        0
      </text>

      {/* Grid lines */}
      <line x1="0" y1="10" x2="100" y2="10" stroke="currentColor" strokeOpacity="0.1" className="dark:stroke-slate-600" />
      <line x1="0" y1={height / 2} x2="100" y2={height / 2} stroke="currentColor" strokeOpacity="0.1" className="dark:stroke-slate-600" />
      <line x1="0" y1={height - 10} x2="100" y2={height - 10} stroke="currentColor" strokeOpacity="0.1" className="dark:stroke-slate-600" />

      {/* Bars */}
      {data.map((item, index) => {
        const barHeight = (item.revenue / maxRevenue) * (height - 30);
        const x = index * barWidth + barWidth * 0.15;
        const barW = barWidth * 0.7;
        const y = height - 15 - barHeight;

        return (
          <g key={item.month}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barHeight}
              fill="currentColor"
              className="text-blue-500 dark:text-blue-400"
              rx="2"
            />
            <text
              x={x + barW / 2}
              y={height - 2}
              className="text-[7px] fill-slate-500 dark:fill-slate-400"
              textAnchor="middle"
            >
              {item.month}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface TenantsTableProps {
  tenants: TenantListItem[];
}

function TenantsTable({ tenants }: TenantsTableProps) {
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const handleImpersonate = async (tenantId: string) => {
    setImpersonating(tenantId);
    // Impersonation logic would go here
    setTimeout(() => setImpersonating(null), 1000);
  };

  const getStatusBadge = (status: TenantListItem['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">Active</Badge>;
      case 'suspended':
        return <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400">Suspended</Badge>;
      case 'pending':
        return <Badge variant="warning" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: TenantListItem['plan']) => {
    switch (plan) {
      case 'starter':
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">Starter</Badge>;
      case 'professional':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">Professional</Badge>;
      case 'enterprise':
        return <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-400">Enterprise</Badge>;
      default:
        return <Badge variant="outline">{plan}</Badge>;
    }
  };

  return (
    <Card className="bg-white dark:bg-slate-800 border dark:border-slate-700">
      <CardHeader>
        <CardTitle className="text-lg">Tenants</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Name</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Plan</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Status</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">MRR</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Orders</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{tenant.slug}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">{getPlanBadge(tenant.plan)}</td>
                  <td className="py-3 px-4">{getStatusBadge(tenant.status)}</td>
                  <td className="py-3 px-4">
                    {tenant.settings?.mrr 
                      ? `€${Number(tenant.settings.mrr).toLocaleString('de-DE')}`
                      : '€0'
                    }
                  </td>
                  <td className="py-3 px-4">-</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleImpersonate(tenant.id)}
                      disabled={impersonating === tenant.id}
                      className="text-sm px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-md transition-colors disabled:opacity-50"
                    >
                      {impersonating === tenant.id ? '...' : 'Impersonieren'}
                    </button>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No tenants found
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

export function AdminOverviewClient({ kpis, revenueStats, tenants, error }: AdminOverviewClientProps) {
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400 font-medium">Error loading dashboard</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const mrr = kpis?.mrr ?? 0;
  const activeTenants = kpis?.active_tenants ?? 0;
  const totalOrders = kpis?.total_orders ?? 0;
  const totalEmployees = kpis?.total_users ?? 0;

  // Mock monthly revenue data for the chart (last 6 months)
  const monthlyRevenueData = [
    { month: 'Jan', revenue: mrr * 0.85 },
    { month: 'Feb', revenue: mrr * 0.9 },
    { month: 'Mar', revenue: mrr * 0.92 },
    { month: 'Apr', revenue: mrr * 0.95 },
    { month: 'May', revenue: mrr * 0.98 },
    { month: 'Jun', revenue: mrr },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Monthly Revenue"
          value={`€${mrr.toLocaleString('de-DE')}`}
          icon={<EuroIcon className="w-6 h-6" />}
          color="blue"
          trend={revenueStats?.growth_rate ? `+${revenueStats.growth_rate.toFixed(1)}%` : undefined}
        />
        <KPICard
          label="Active Tenants"
          value={activeTenants.toLocaleString('de-DE')}
          icon={<BuildingIcon className="w-6 h-6" />}
          color="emerald"
        />
        <KPICard
          label="Total Orders"
          value={totalOrders.toLocaleString('de-DE')}
          icon={<ShoppingCartIcon className="w-6 h-6" />}
          color="violet"
        />
        <KPICard
          label="Total Employees"
          value={totalEmployees.toLocaleString('de-DE')}
          icon={<UsersIcon className="w-6 h-6" />}
          color="amber"
        />
      </div>

      {/* Revenue Chart */}
      <Card className="bg-white dark:bg-slate-800 border dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg">Monthly MRR</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <MiniBarChart data={monthlyRevenueData} height={220} />
          </div>
        </CardContent>
      </Card>

      {/* Tenants Table */}
      <TenantsTable tenants={tenants} />
    </div>
  );
}
