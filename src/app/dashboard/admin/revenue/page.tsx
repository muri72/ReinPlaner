import { getMonthlyRevenueHistory, getRevenueForecast, getPlatformKPIs } from '@/lib/actions/platform-admin';
import { redirect } from 'next/navigation';
import { getCurrentUserRole } from '@/lib/services-rbac';
import { RevenuePageClient } from './_components/revenue-page-client';

export default async function RevenuePage() {
  const role = await getCurrentUserRole();
  if (role !== 'platform_admin') redirect('/dashboard');
  
  const [historyResult, forecastResult, kpisResult] = await Promise.all([
    getMonthlyRevenueHistory(12),
    getRevenueForecast(3),
    getPlatformKPIs(),
  ]);

  return (
    <RevenuePageClient
      history={historyResult.data}
      forecast={forecastResult.data}
      kpis={kpisResult.data}
    />
  );
}
