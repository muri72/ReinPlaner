// Shim — real implementation uses Supabase which is not available
export async function exportZUGFeRD(_invoiceId: string) {
  console.warn('ZUGFeRD export not available in Drizzle mode');
  return { success: false, message: 'ZUGFeRD export not implemented' };
}

export async function exportToZugferd(_invoiceId: string) {
  return exportZUGFeRD(_invoiceId);
}