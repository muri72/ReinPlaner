// Shim — real implementation uses Supabase which is not available
export async function getInvoicePdfUrl(_invoiceId: string) {
  console.warn('Invoice service not available in Drizzle mode');
  return { success: false, message: 'Invoice service not implemented' };
}

export async function sendInvoiceEmail(_invoiceId: string) {
  console.warn('Invoice service not available in Drizzle mode');
  return { success: false, message: 'Invoice service not implemented' };
}

export async function createInvoiceFromOrder(
  _orderId: string,
  _userId: string,
  _tenantId: string,
  _options: {
    issue_date?: string;
    due_days?: number;
    tax_rate?: number;
    notes?: string;
  } = {}
) {
  console.warn('Invoice service not available in Drizzle mode');
  return { success: false, message: 'Invoice service not implemented' };
}

export function formatCurrency(_amount: number, _currency?: string): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: _currency || 'EUR' }).format(_amount / 100);
}