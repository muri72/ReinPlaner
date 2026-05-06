import { getPlatformKPIs, getPlatformRevenueStats, getAllTenants } from '@/lib/actions/platform-admin';
import { redirect } from 'next/navigation';
import { getCurrentUserRole } from '@/lib/services-rbac';
import { AdminOverviewClient } from './_components/admin-overview-client';

export default async function AdminOverviewPage() {
  const role = await getCurrentUserRole();
  if (role !== 'platform_admin') redirect('/dashboard');

  const [kpisResult, statsResult, tenantsResult] = await Promise.all([
    getPlatformKPIs(),
    getPlatformRevenueStats(),
    getAllTenants(),
  ]);

  return (
    <AdminOverviewClient
      kpis={kpisResult.data}
      revenueStats={statsResult.data}
      tenants={tenantsResult.data}
      error={kpisResult.error}
    />
  );
}
