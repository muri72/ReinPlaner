import { Invoice } from './types';

// Shim — real implementation uses Supabase which is not available
export async function getInvoicePdfUrl(_invoiceId: string): Promise<{ success: true; data: { url: string } } | { success: false; message: string }> {
  console.warn('Invoice service not available in Drizzle mode');
  return { success: false, message: 'Invoice service not implemented' };
}

export async function sendInvoiceEmail(_invoiceId: string): Promise<{ success: true; data: { sent: boolean } } | { success: false; message: string }> {
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
): Promise<{ success: true; data: Invoice } | { success: false; message: string; data: null }> {
  console.warn('Invoice service not available in Drizzle mode');
  return { success: false, message: 'Invoice service not implemented', data: null };
}

export function formatCurrency(_amount: number, _currency?: string): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: _currency || 'EUR' }).format(_amount / 100);
}