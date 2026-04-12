// ============================================
// Invoice Formatting Utilities (Pure - no server imports)
// ============================================

import { format, parseISO } from 'date-fns';

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf',
  sent: 'Versendet',
  paid: 'Bezahlt',
  overdue: 'Überfällig',
  cancelled: 'Storniert',
  partially_paid: 'Teilweise bezahlt',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Überweisung',
  cash: 'Bar',
  credit_card: 'Kreditkarte',
  direct_debit: 'Lastschrift',
  check: 'Scheck',
  other: 'Sonstige',
};

export function formatCurrency(cents: number | null | undefined, currency = 'EUR'): string {
  if (cents == null) return '0,00 €';
  const euros = cents / 100;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency,
  }).format(euros);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd.MM.yyyy');
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd.MM.yyyy HH:mm');
  } catch {
    return dateStr;
  }
}

export function getStatusLabel(status: string): string {
  return INVOICE_STATUS_LABELS[status] || status;
}

export function formatInvoiceNumber(invoiceNumber: string): string {
  return invoiceNumber;
}

export function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return '—';
  return formatDate(dueDate);
}

export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  return Math.round(parseFloat(cleaned) * 100);
}