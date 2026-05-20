// Shim — real implementation uses Supabase which is not available
export async function exportZUGFeRD(_invoiceId: string): Promise<{
  success: false;
  message: string;
  data: null;
}> {
  console.warn('ZUGFeRD export not available in Drizzle mode');
  return { success: false, message: 'ZUGFeRD export not implemented', data: null };
}

export async function exportToZugferd(_invoiceId: string) {
  return exportZUGFeRD(_invoiceId);
}