import { getAllTenants, getPlatformStats, activateTenant, suspendTenant, deleteTenant } from '@/lib/actions/tenant-admin';
import { TenantManagementClient } from './_components/tenant-management-client';

// Server Component - fetches initial data
export default async function AdminTenantsPage() {
  const [tenantsResult, statsResult] = await Promise.all([
    getAllTenants(),
    getPlatformStats(),
  ]);

  return (
    <TenantManagementClient
      initialTenants={tenantsResult.data}
      initialStats={statsResult.data}
      error={tenantsResult.error || statsResult.error}
    />
  );
}
