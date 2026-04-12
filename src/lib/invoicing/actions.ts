// ============================================
// Invoice Server Actions
// ============================================

"use server";

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Invoice, InvoiceItem, InvoiceFilters, CreateInvoiceData, UpdateInvoiceData, InvoiceStatus } from './types';
import {
  getInvoices as svcGetInvoices,
  getInvoiceById as svcGetInvoiceById,
  createInvoice as svcCreateInvoice,
  createInvoiceFromOrder as svcCreateInvoiceFromOrder,
  updateInvoice as svcUpdateInvoice,
  updateInvoiceStatus as svcUpdateInvoiceStatus,
  deleteInvoice as svcDeleteInvoice,
  addInvoiceItem as svcAddInvoiceItem,
  updateInvoiceItem as svcUpdateInvoiceItem,
  deleteInvoiceItem as svcDeleteInvoiceItem,
  recordPayment as svcRecordPayment,
  getPaymentsForInvoice as svcGetPaymentsForInvoice,
  getDebtors as svcGetDebtors,
  getDebtorById as svcGetDebtorById,
  getInvoiceStats as svcGetInvoiceStats,
  formatCurrency,
  parseCurrencyInput,
} from './invoice-service';
import { generateInvoicePDF } from './pdf-generator';
import { exportDATEV } from './datev-export';
import { exportZUGFeRD } from './zugferd-export';
import { sendInvoiceEmail } from './email-service';
import { logDataChange } from '@/lib/audit-log';

// ============================================
// Invoice CRUD Actions
// ============================================

export async function getInvoicesAction(filters: InvoiceFilters) {
  return svcGetInvoices(filters);
}

export async function getInvoiceByIdAction(id: string) {
  return svcGetInvoiceById(id);
}

export async function createInvoiceAction(data: CreateInvoiceData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Nicht authentifiziert.' };
  }

  // Get tenant_id from user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  const result = await svcCreateInvoice(data, user.id, profile?.tenant_id || null);

  if (result.success) {
    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard/invoices/new');
    await logDataChange(user.id, 'INSERT', 'invoices', result.data!.id, null, {
      invoice_number: result.data!.invoice_number,
      total: result.data!.total_amount_cents,
    });
  }

  return result;
}

export async function createInvoiceFromOrderAction(
  orderId: string,
  options: {
    issue_date?: string;
    due_days?: number;
    tax_rate?: number;
    notes?: string;
  } = {}
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Nicht authentifiziert.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  const result = await svcCreateInvoiceFromOrder(orderId, user.id, profile?.tenant_id || null, options);

  if (result.success) {
    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard/orders');
    await logDataChange(user.id, 'INSERT', 'invoices', result.data!.id, null, {
      invoice_number: result.data!.invoice_number,
      order_id: orderId,
      total: result.data!.total_amount_cents,
    });
  }

  return result;
}

export async function updateInvoiceAction(invoiceId: string, data: UpdateInvoiceData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Nicht authentifiziert.' };
  }

  const result = await svcUpdateInvoice(invoiceId, data);

  if (result.success) {
    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${invoiceId}`);
  }

  return result;
}

export async function updateInvoiceStatusAction(invoiceId: string, status: InvoiceStatus) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Nicht authentifiziert.' };
  }

  const result = await svcUpdateInvoiceStatus(invoiceId, status);

  if (result.success) {
    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${invoiceId}`);
  }

  return result;
}

export async function deleteInvoiceAction(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Nicht authentifiziert.' };
  }

  const result = await svcDeleteInvoice(invoiceId);

  if (result.success) {
    revalidatePath('/dashboard/invoices');
  }

  return result;
}

// ============================================
// Invoice Items Actions
// ============================================

export async function addInvoiceItemAction(
  invoiceId: string,
  item: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at' | 'line_number' | 'net_amount_cents' | 'tax_amount_cents'>
) {
  const result = await svcAddInvoiceItem(invoiceId, item);

  if (result.success) {
    revalidatePath(`/dashboard/invoices/${invoiceId}`);
  }

  return result;
}

export async function updateInvoiceItemAction(itemId: string, updates: Partial<InvoiceItem>) {
  const result = await svcUpdateInvoiceItem(itemId, updates);

  // Find invoice_id to revalidate
  if (result.success && result.data) {
    const supabase = createAdminClient();
    const { data: item } = await supabase
      .from('invoice_items')
      .select('invoice_id')
      .eq('id', itemId)
      .single();

    if (item) {
      revalidatePath(`/dashboard/invoices/${item.invoice_id}`);
    }
  }

  return result;
}

export async function deleteInvoiceItemAction(itemId: string) {
  const supabase = createAdminClient();

  // Get invoice_id before deletion
  const { data: item } = await supabase
    .from('invoice_items')
    .select('invoice_id')
    .eq('id', itemId)
    .single();

  const result = await svcDeleteInvoiceItem(itemId);

  if (result.success && item) {
    revalidatePath(`/dashboard/invoices/${item.invoice_id}`);
  }

  return result;
}

// ============================================
// Payments Actions
// ============================================

export async function recordPaymentAction(
  invoiceId: string,
  payment: {
    amount_cents: number;
    payment_date?: string;
    payment_method?: string;
    reference?: string;
    bank_reference?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Nicht authentifiziert.' };
  }

  const result = await svcRecordPayment(invoiceId, payment, user.id);

  if (result.success) {
    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${invoiceId}`);
  }

  return result;
}

export async function getPaymentsForInvoiceAction(invoiceId: string) {
  return svcGetPaymentsForInvoice(invoiceId);
}

// ============================================
// Debtors Actions
// ============================================

export async function getDebtorsAction() {
  return svcGetDebtors();
}

export async function getDebtorByIdAction(id: string) {
  return svcGetDebtorById(id);
}

// ============================================
// Export Actions
// ============================================

export async function exportDATEVAction(dateFrom: string, dateTo: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Nicht authentifiziert.' };
  }

  return exportDATEV(dateFrom, dateTo);
}

export async function exportZUGFeRDAction(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Nicht authentifiziert.' };
  }

  return exportZUGFeRD(invoiceId);
}

// ============================================
// Email Actions
// ============================================

export async function sendInvoiceEmailAction(invoiceId: string, recipientEmail?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Nicht authentifiziert.' };
  }

  const invoiceResult = await svcGetInvoiceById(invoiceId);
  if (!invoiceResult.success || !invoiceResult.data) {
    return { success: false, message: 'Rechnung nicht gefunden.' };
  }

  const invoice = invoiceResult.data;
  const email = recipientEmail || invoice.debtor?.invoice_email;

  if (!email) {
    return { success: false, message: 'Keine Empfänger-E-Mail gefunden.' };
  }

  // Generate PDF
  const pdfResult = await generateInvoicePDF(invoice);
  if (!pdfResult.success) {
    return { success: false, message: 'PDF konnte nicht generiert werden.' };
  }

  // Send email
  const emailResult = await sendInvoiceEmail({
    invoice,
    recipientEmail: email,
    pdfBuffer: pdfResult.data!,
  });

  if (emailResult.success) {
    // Update status to sent
    await svcUpdateInvoiceStatus(invoiceId, 'sent');
    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${invoiceId}`);
  }

  return emailResult;
}

// ============================================
// Dashboard Stats Action
// ============================================

export async function getInvoiceStatsAction() {
  return svcGetInvoiceStats();
}

// ============================================
// Utility Exports
// ============================================

export { formatCurrency, parseCurrencyInput };
