// Shim — real implementation uses Supabase which is not available
export async function exportToXRechnung(_invoiceId: string) {
  console.warn('XRechnung export not available in Drizzle mode');
  return { success: false, message: 'XRechnung export not implemented' };
}
