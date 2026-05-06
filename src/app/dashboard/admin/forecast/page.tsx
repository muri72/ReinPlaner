import { getRevenueForecast, getMonthlyRevenueHistory } from '@/lib/actions/platform-admin';
import { redirect } from 'next/navigation';
import { getCurrentUserRole } from '@/lib/services-rbac';
import { ForecastPageClient } from './_components/forecast-page-client';

export default async function ForecastPage() {
  const role = await getCurrentUserRole();
  if (role !== 'platform_admin') redirect('/dashboard');
  
  const [historyResult, forecastResult] = await Promise.all([
    getMonthlyRevenueHistory(12),
    getRevenueForecast(6),
  ]);

  return (
    <ForecastPageClient
      history={historyResult.data}
      forecast={forecastResult.data}
    />
  );
}
