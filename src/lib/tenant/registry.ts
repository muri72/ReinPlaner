// Shim — real implementation uses Supabase which is not available
export async function getTenantRegistry() {
  return { success: false, message: 'Tenant registry not implemented' };
}

export async function getTenantBySlug(_slug: string) {
  console.warn('Tenant registry not available in Drizzle mode');
  // Return null to allow access (no tenant enforcement in dev)
  return null as unknown as { id: string; slug: string; name: string } | null;
}

export async function getTenantByDomain(_domain: string) {
  console.warn('Tenant registry not available in Drizzle mode');
  return null as unknown as { id: string; slug: string; name: string } | null;
}

export async function getTenantById(_id: string) {
  console.warn('Tenant registry not available in Drizzle mode');
  return null as unknown as { id: string; slug: string; name: string } | null;
}

export async function createTenant(_data: any) {
  console.warn('Tenant registry not available in Drizzle mode');
  return { success: false, message: 'Tenant registry not implemented' };
}

export async function updateTenant(_id: string, _data: any) {
  console.warn('Tenant registry not available in Drizzle mode');
  return { success: false, message: 'Tenant registry not implemented' };
}

export async function clearTenantCache(_tenantId: string) {
  console.warn('Tenant registry not available in Drizzle mode');
  return { success: false, message: 'Tenant registry not implemented' };
}