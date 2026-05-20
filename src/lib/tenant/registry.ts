// Shim — real implementation uses Supabase which is not available
export async function getTenantRegistry() {
  return { success: false, message: 'Tenant registry not implemented' };
}