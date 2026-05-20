// Shim — real implementation uses Supabase which is not available
export async function generateInvoicePDF(_invoice: any): Promise<{ success: boolean; message?: string; data: Buffer | null; filename: string | null }> {
  console.warn('PDF generation not available in Drizzle mode');
  return { success: false, message: 'PDF generation not implemented', data: null, filename: null };
}

export async function generateInvoicePdf(_invoice: any) {
  return generateInvoicePDF(_invoice);
}