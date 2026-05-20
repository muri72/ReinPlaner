// Shim — real implementation uses Supabase which is not available
export async function exportToDatev(_invoiceId: string) {
  console.warn('DATEV export not available in Drizzle mode');
  return { success: false, message: 'DATEV export not implemented' };
}