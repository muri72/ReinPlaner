// Shim — real implementation uses Supabase which is not available
export async function exportXRechnung(_invoiceId: string): Promise<{
  success: false;
  message: string;
  data: null;
  filename: null;
}> {
  console.warn('XRechnung export not available in Drizzle mode');
  return { success: false, message: 'XRechnung export not implemented', data: null, filename: null };
}

export async function exportToXRechnung(_invoiceId: string) {
  return exportXRechnung(_invoiceId);
}
