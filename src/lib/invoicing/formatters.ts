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
  // Remove all non-numeric characters except comma and period
  const cleaned = value.replace(/[^\d,.-]/g, '');
  
  // Handle German format (comma as decimal separator): replace last comma with period
  // or handle US format (period as decimal separator)
  const normalized = cleaned.replace(/,/g, '.').replace(/\.(?=.*\.)/g, '');
  
  // Split into integer and decimal parts
  const parts = normalized.split('.');
  let result: number;
  
  if (parts.length === 1) {
    // No decimal part - just multiply by 100
    result = parseInt(parts[0] || '0', 10) * 100;
  } else if (parts.length === 2) {
    // Has decimal part - handle rounding properly
    const intPart = parseInt(parts[0] || '0', 10);
    const decPart = parts[1].slice(0, 2).padEnd(2, '0'); // Take max 2 digits, pad if needed
    result = intPart * 100 + parseInt(decPart, 10);
    // Handle third digit for proper rounding
    if (parts[1].length > 2) {
      const thirdDigit = parseInt(parts[1][2] || '0', 10);
      if (thirdDigit >= 5) {
        result += 1;
      }
    }
  } else {
    // Multiple periods - take first two parts only
    const intPart = parseInt(parts.slice(0, -1).join(''), 10);
    const decPart = parts[parts.length - 1].slice(0, 2).padEnd(2, '0');
    result = intPart * 100 + parseInt(decPart, 10);
  }
  
  return result;
}