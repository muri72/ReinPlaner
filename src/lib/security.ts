// ============================================
// Security Utilities - Input Sanitization & Validation
// ============================================

import DOMPurify from 'dompurify';

// ============================================
// HTML Escaping (XSS Prevention)
// ============================================

/**
 * Escape HTML special characters to prevent XSS attacks.
 * Use this when rendering user-provided content in the DOM.
 */
export function escapeHtml(text: string | null | undefined): string {
  if (text == null) return '';
  const str = String(text);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize HTML content using DOMPurify.
 * Use this for rich text fields where some HTML is allowed.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (dirty == null) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'br', 'p'],
    ALLOWED_ATTR: [],
  });
}

// ============================================
// Financial Field Upper Bounds
// ============================================

export const MAX_AMOUNT_CENTS = 999_999_99; // ~999,999.99 EUR
export const MAX_QUANTITY = 1_000_000;
export const MAX_TAX_RATE = 100;
export const MAX_LINE_ITEMS = 500;

/**
 * Validate amount in cents against upper bound.
 */
export function validateAmountCents(amount: number): { valid: boolean; message?: string } {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { valid: false, message: 'Betrag muss eine Zahl sein.' };
  }
  if (amount < 0) {
    return { valid: false, message: 'Betrag darf nicht negativ sein.' };
  }
  if (amount > MAX_AMOUNT_CENTS) {
    return { valid: false, message: `Betrag überschreitet Maximum von ${(MAX_AMOUNT_CENTS / 100).toFixed(2)} €.` };
  }
  return { valid: true };
}

/**
 * Validate quantity against upper bound.
 */
export function validateQuantity(qty: number): { valid: boolean; message?: string } {
  if (typeof qty !== 'number' || isNaN(qty)) {
    return { valid: false, message: 'Menge muss eine Zahl sein.' };
  }
  if (qty <= 0) {
    return { valid: false, message: 'Menge muss größer als 0 sein.' };
  }
  if (qty > MAX_QUANTITY) {
    return { valid: false, message: `Menge überschreitet Maximum von ${MAX_QUANTITY}.` };
  }
  return { valid: true };
}

/**
 * Validate tax rate (0-100).
 */
export function validateTaxRate(rate: number): { valid: boolean; message?: string } {
  if (typeof rate !== 'number' || isNaN(rate)) {
    return { valid: false, message: 'MwSt-Satz muss eine Zahl sein.' };
  }
  if (rate < 0 || rate > MAX_TAX_RATE) {
    return { valid: false, message: 'MwSt-Satz muss zwischen 0 und 100 % liegen.' };
  }
  return { valid: true };
}

// ============================================
// Invoice Number Validation
// ============================================

const INVOICE_NUMBER_REGEX = /^[A-Z0-9\/\-]{3,20}$/;

/**
 * Validate invoice number format.
 * System-generated numbers only - no user-provided invoice numbers allowed.
 */
export function validateInvoiceNumberFormat(invoiceNumber: string): boolean {
  return INVOICE_NUMBER_REGEX.test(invoiceNumber);
}

// ============================================
// Rate Limiting Keys (for Supabase/Redis)
// ============================================

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export const EMAIL_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowSeconds: 60, // 10 emails per minute per tenant
};

export const REMINDER_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 2,
  windowSeconds: 86400, // 2 reminders per day per invoice
};