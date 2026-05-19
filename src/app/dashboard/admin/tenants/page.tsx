import { getAllTenants, getPlatformStats, activateTenant, suspendTenant, deleteTenant } from '@/lib/actions/tenant-admin';
import { TenantManagementClient } from './_components/tenant-management-client';
import type { TenantListItem } from '@/lib/actions/tenant-admin';
type PlatformStats = {
  totalTenants: number;
  activeTenants: number;
  pendingTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  monthlyRevenue: number;
};

// Server Component - fetches initial data
export default async function AdminTenantsPage() {
  const [tenantsResult, statsResult] = await Promise.all([
    getAllTenants(),
    getPlatformStats(),
  ]);

  return (
    <TenantManagementClient
      initialTenants={tenantsResult.data as TenantListItem[]}
      initialStats={statsResult.data as PlatformStats | null}
      error={tenantsResult.error || statsResult.error}
    />
  );
}
