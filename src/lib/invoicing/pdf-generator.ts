// Shim — real implementation uses Supabase which is not available
export async function generateInvoicePdf(_invoiceId: string) {
  console.warn('PDF generation not available in Drizzle mode');
  return { success: false, message: 'PDF generation not implemented' };
}