// Shim — real implementation uses Supabase which is not available
export async function exportDATEV(_dateFrom: string, _dateTo: string, _tenantId: string): Promise<{
  success: false;
  message: string;
  data: null;
  filename: null;
}> {
  console.warn('DATEV export not available in Drizzle mode');
  return { success: false, message: 'DATEV export not implemented', data: null, filename: null };
}

export async function exportToDatev(_dateFrom: string, _dateTo: string, _tenantId: string) {
  return exportDATEV(_dateFrom, _dateTo, _tenantId);
}