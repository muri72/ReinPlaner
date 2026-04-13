// ============================================
// Invoice Service - Business Logic for Invoicing
// ============================================

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { Invoice, InvoiceItem, Debtor, Payment, InvoiceFilters, CreateInvoiceData, UpdateInvoiceData } from './types';
import { addDays, format } from 'date-fns';

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf',
  sent: 'Versendet',
  paid: 'Bezahlt',
  partial: 'Teilweise bezahlt',
  overdue: 'Überfällig',
  cancelled: 'Storniert',
  void: ' Ungültig',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Überweisung',
  cash: 'Bar',
  credit_card: 'Kreditkarte',
  direct_debit: 'Lastschrift',
  check: 'Scheck',
  other: 'Sonstige',
};

export { INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS };

// ============================================
// Invoice CRUD
// ============================================

export async function getInvoices(filters: InvoiceFilters = {}): Promise<{ success: boolean; data?: Invoice[]; message?: string }> {
  const supabase = createAdminClient();

  try {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        debtor:debtors(*),
        order:orders(id, title, customer_id),
        items:invoice_items(*)
      `)
      .order('created_at', { ascending: false });

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters.debtor_id) {
      query = query.eq('debtor_id', filters.debtor_id);
    }

    if (filters.order_id) {
      query = query.eq('order_id', filters.order_id);
    }

    if (filters.date_from) {
      query = query.gte('issue_date', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('issue_date', filters.date_to);
    }

    if (filters.search) {
      query = query.or(`invoice_number.ilike.%${filters.search}%,reference_text.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Mark overdue invoices
    const today = new Date().toISOString().split('T')[0];
    const processedData = (data || []).map(inv => ({
      ...inv,
      status: inv.status === 'sent' && inv.due_date < today && inv.paid_amount_cents < inv.total_amount_cents
        ? 'overdue' as const
        : inv.status,
    }));

    return { success: true, data: processedData };
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return { success: false, message: error.message };
  }
}

export async function getInvoiceById(id: string): Promise<{ success: boolean; data?: Invoice; message?: string }> {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        debtor:debtors(*),
        order:orders(id, title, customer_id, objects(*, customers(*))),
        items:invoice_items(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Mark overdue
    const today = new Date().toISOString().split('T')[0];
    const processedData = {
      ...data,
      status: data.status === 'sent' && data.due_date < today && data.paid_amount_cents < data.total_amount_cents
        ? 'overdue' as const
        : data.status,
    };

    return { success: true, data: processedData };
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    return { success: false, message: error.message };
  }
}

export async function createInvoice(
  data: CreateInvoiceData,
  userId: string,
  tenantId: string | null
): Promise<{ success: boolean; data?: Invoice; message?: string }> {
  const supabase = createAdminClient();

  try {
    // Generate invoice number
    let invoiceNumber = 'R/00001';

    if (tenantId) {
      const { data: seqData } = await supabase.rpc('generate_invoice_number', { p_tenant_id: tenantId });
      if (seqData) invoiceNumber = seqData;
    } else {
      // Fallback for non-tenant context
      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
      invoiceNumber = `R/${new Date().getFullYear()}/${String((count || 0) + 1).padStart(5, '0')}`;
    }

    // Calculate totals
    let netAmountCents = 0;
    let taxAmountCents = 0;
    const taxRate = data.tax_rate ?? 19.0;

    const processedItems = (data.items || []).map((item, index) => {
      const qty = Number(item.quantity) || 1;
      const unitPrice = Number(item.unit_price_cents) || 0;
      const netAmount = Math.round(qty * unitPrice);
      const taxAmount = Math.round(netAmount * (taxRate / 100));

      netAmountCents += netAmount;
      taxAmountCents += taxAmount;

      return {
        ...item,
        quantity: qty,
        unit_price_cents: unitPrice,
        net_amount_cents: netAmount,
        tax_amount_cents: taxAmount,
        tax_rate: Number(item.tax_rate) || taxRate,
        sort_order: index,
        service_date: item.service_date || null,
      };
    });

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        tenant_id: tenantId,
        invoice_number: invoiceNumber,
        debtor_id: data.debtor_id || null,
        order_id: data.order_id || null,
        issue_date: data.issue_date || new Date().toISOString().split('T')[0],
        due_date: data.due_date,
        delivery_date_start: data.delivery_date_start || null,
        delivery_date_end: data.delivery_date_end || null,
        net_amount_cents: netAmountCents,
        tax_amount_cents: taxAmountCents,
        total_amount_cents: netAmountCents + taxAmountCents,
        tax_rate: taxRate,
        status: 'draft',
        notes: data.notes || null,
        internal_notes: data.internal_notes || null,
        reference_text: data.reference_text || null,
        order_reference: data.order_reference || null,
        created_by: userId,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Create invoice items
    if (processedItems.length > 0) {
      const itemsWithInvoiceId = processedItems.map((item, idx) => ({
        ...item,
        invoice_id: invoice.id,
        line_number: idx + 1,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsWithInvoiceId);

      if (itemsError) throw itemsError;
    }

    // Fetch complete invoice
    const { data: completeInvoice } = await supabase
      .from('invoices')
      .select('*, debtor:debtors(*), items:invoice_items(*)')
      .eq('id', invoice.id)
      .single();

    return { success: true, data: completeInvoice };
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return { success: false, message: error.message };
  }
}

export async function createInvoiceFromOrder(
  orderId: string,
  userId: string,
  tenantId: string | null,
  options: {
    issue_date?: string;
    due_days?: number;
    tax_rate?: number;
    notes?: string;
  } = {}
): Promise<{ success: boolean; data?: Invoice; message?: string }> {
  const supabase = createAdminClient();

  try {
    // Fetch order with customer
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, objects(*, customers(*)), customer_contacts(*)')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // Get or create debtor for customer
    let debtorId: string | null = null;

    if (order.customer_id) {
      const { data: existingDebtor } = await supabase
        .from('debtors')
        .select('id')
        .eq('customer_id', order.customer_id)
        .maybeSingle();

      if (existingDebtor) {
        debtorId = existingDebtor.id;
      } else {
        // Create debtor from customer
        const customer = (order as any).objects?.customers;
        if (customer) {
          const { data: newDebtor } = await supabase
            .from('debtors')
            .insert({
              tenant_id: tenantId,
              customer_id: order.customer_id,
              billing_name: customer.name || null,
              billing_street: customer.address || null,
              billing_postal_code: customer.postal_code || null,
              billing_city: customer.city || null,
              billing_country: 'DE',
              invoice_email: customer.email || null,
            })
            .select('id')
            .single();

          debtorId = newDebtor?.id || null;
        }
      }
    }

    // Calculate due date
    const issueDate = options.issue_date || new Date().toISOString().split('T')[0];
    const dueDays = options.due_days || 30;
    const dueDate = addDays(new Date(issueDate), dueDays);

    // Build line items from order
    const items: CreateInvoiceData['items'] = [];

    if (order.order_type === 'permanent' && order.fixed_monthly_price) {
      // Fixed price order
      const netAmount = Math.round(Number(order.fixed_monthly_price) * 100);
      const taxRate = options.tax_rate ?? 19.0;
      const taxAmount = Math.round(netAmount * (taxRate / 100));

      items.push({
        service_description: `Monatliche Pauschale für: ${order.title}`,
        quantity: 1,
        unit: 'Pauschale',
        unit_price_cents: netAmount,
        tax_rate: taxRate,
        sort_order: 0,
        service_date: issueDate,
      });
    } else {
      // Time-based order: calculate from completed time entries this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);

      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('duration_minutes, break_minutes, employees(hourly_rate)')
        .eq('order_id', orderId)
        .gte('start_time', startOfMonth.toISOString());

      const serviceRates = await supabase.from('service_rates').select('*');
      const rateMap = new Map((serviceRates.data || []).map(r => [r.service_type, Number(r.hourly_rate)]));

      const rate = rateMap.get(order.service_type || '') || rateMap.get('standard') || 2400; // €24 fallback

      let totalMinutes = 0;
      (timeEntries || []).forEach(entry => {
        const emp = Array.isArray(entry.employees) ? entry.employees[0] : entry.employees;
        totalMinutes += (entry.duration_minutes || 0);
      });

      if (totalMinutes > 0) {
        const hours = totalMinutes / 60;
        const netAmount = Math.round(hours * rate);
        const taxRate = options.tax_rate ?? 19.0;

        items.push({
          service_description: `Dienstleistung: ${order.title}`,
          quantity: Math.round(hours * 100) / 100,
          unit: 'h',
          unit_price_cents: rate,
          tax_rate: taxRate,
          sort_order: 0,
          service_date: issueDate,
        });
      }
    }

    // Generate invoice number
    let invoiceNumber = 'R/00001';
    if (tenantId) {
      const { data: seqData } = await supabase.rpc('generate_invoice_number', { p_tenant_id: tenantId });
      if (seqData) invoiceNumber = seqData;
    }

    const taxRate = options.tax_rate ?? 19.0;
    let netAmountCents = 0;
    let taxAmountCents = 0;

    items.forEach(item => {
      const netAmount = Math.round(item.quantity * item.unit_price_cents);
      netAmountCents += netAmount;
      taxAmountCents += Math.round(netAmount * (taxRate / 100));
    });

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        tenant_id: tenantId,
        invoice_number: invoiceNumber,
        debtor_id: debtorId,
        order_id: orderId,
        issue_date: issueDate,
        due_date: format(dueDate, 'yyyy-MM-dd'),
        net_amount_cents: netAmountCents,
        tax_amount_cents: taxAmountCents,
        total_amount_cents: netAmountCents + taxAmountCents,
        tax_rate: taxRate,
        status: 'draft',
        notes: options.notes || `Rechnung für Auftrag: ${order.title}`,
        order_reference: order.title,
        created_by: userId,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Create items
    if (items.length > 0) {
      const itemsWithLineNumbers = items.map((item, idx) => ({
        ...item,
        invoice_id: invoice.id,
        line_number: idx + 1,
        net_amount_cents: Math.round(item.quantity * item.unit_price_cents),
        tax_amount_cents: Math.round(item.quantity * item.unit_price_cents * (taxRate / 100)),
      }));

      await supabase.from('invoice_items').insert(itemsWithLineNumbers);
    }

    // Fetch complete invoice
    const { data: completeInvoice } = await supabase
      .from('invoices')
      .select('*, debtor:debtors(*), items:invoice_items(*)')
      .eq('id', invoice.id)
      .single();

    return { success: true, data: completeInvoice };
  } catch (error: any) {
    console.error('Error creating invoice from order:', error);
    return { success: false, message: error.message };
  }
}

export async function updateInvoice(
  invoiceId: string,
  data: UpdateInvoiceData
): Promise<{ success: boolean; data?: Invoice; message?: string }> {
  const supabase = createAdminClient();

  try {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select('*, debtor:debtors(*), items:invoice_items(*)')
      .single();

    if (error) throw error;

    return { success: true, data: invoice };
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    return { success: false, message: error.message };
  }
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: Invoice['status']
): Promise<{ success: boolean; message?: string }> {
  const supabase = createAdminClient();

  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString();
    }

    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString();
      updateData.paid_amount_cents = (
        await supabase.from('invoices').select('total_amount_cents').eq('id', invoiceId).single()
      ).data?.total_amount_cents || 0;
    }

    const { error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error updating invoice status:', error);
    return { success: false, message: error.message };
  }
}

export async function deleteInvoice(invoiceId: string): Promise<{ success: boolean; message?: string }> {
  const supabase = createAdminClient();

  try {
    // Items are deleted via CASCADE
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);

    if (error) throw error;

    return { success: true, message: 'Rechnung erfolgreich gelöscht.' };
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    return { success: false, message: error.message };
  }
}

// ============================================
// Invoice Items
// ============================================

export async function addInvoiceItem(
  invoiceId: string,
  item: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at' | 'line_number' | 'net_amount_cents' | 'tax_amount_cents'>
): Promise<{ success: boolean; data?: InvoiceItem; message?: string }> {
  const supabase = createAdminClient();

  try {
    // Get current max line number
    const { data: lastItem } = await supabase
      .from('invoice_items')
      .select('line_number')
      .eq('invoice_id', invoiceId)
      .order('line_number', { ascending: false })
      .limit(1)
      .single();

    const lineNumber = (lastItem?.line_number || 0) + 1;

    // Get tax rate from invoice
    const { data: invoice } = await supabase
      .from('invoices')
      .select('tax_rate')
      .eq('id', invoiceId)
      .single();

    const taxRate = item.tax_rate || invoice?.tax_rate || 19.0;
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unit_price_cents) || 0;
    const netAmount = Math.round(qty * unitPrice);
    const taxAmount = Math.round(netAmount * (taxRate / 100));

    const { data: newItem, error } = await supabase
      .from('invoice_items')
      .insert({
        invoice_id: invoiceId,
        line_number: lineNumber,
        service_date: item.service_date || null,
        service_description: item.service_description,
        quantity: qty,
        unit: item.unit || 'h',
        unit_price_cents: unitPrice,
        net_amount_cents: netAmount,
        tax_rate: taxRate,
        tax_amount_cents: taxAmount,
        sort_order: item.sort_order || lineNumber,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data: newItem };
  } catch (error: any) {
    console.error('Error adding invoice item:', error);
    return { success: false, message: error.message };
  }
}

export async function updateInvoiceItem(
  itemId: string,
  updates: Partial<InvoiceItem>
): Promise<{ success: boolean; data?: InvoiceItem; message?: string }> {
  const supabase = createAdminClient();

  try {
    const { data: existingItem } = await supabase
      .from('invoice_items')
      .select('*, invoices(tax_rate)')
      .eq('id', itemId)
      .single();

    if (!existingItem) throw new Error('Item not found');

    const taxRate = updates.tax_rate || (existingItem as any).invoices?.tax_rate || 19.0;
    const qty = updates.quantity !== undefined ? Number(updates.quantity) : existingItem.quantity;
    const unitPrice = updates.unit_price_cents !== undefined ? Number(updates.unit_price_cents) : existingItem.unit_price_cents;
    const netAmount = Math.round(qty * unitPrice);
    const taxAmount = Math.round(netAmount * (taxRate / 100));

    const { data: updatedItem, error } = await supabase
      .from('invoice_items')
      .update({
        service_date: updates.service_date ?? existingItem.service_date,
        service_description: updates.service_description ?? existingItem.service_description,
        quantity: qty,
        unit: updates.unit ?? existingItem.unit,
        unit_price_cents: unitPrice,
        net_amount_cents: netAmount,
        tax_rate: taxRate,
        tax_amount_cents: taxAmount,
        sort_order: updates.sort_order ?? existingItem.sort_order,
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data: updatedItem };
  } catch (error: any) {
    console.error('Error updating invoice item:', error);
    return { success: false, message: error.message };
  }
}

export async function deleteInvoiceItem(itemId: string): Promise<{ success: boolean; message?: string }> {
  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from('invoice_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;

    return { success: true, message: 'Position erfolgreich gelöscht.' };
  } catch (error: any) {
    console.error('Error deleting invoice item:', error);
    return { success: false, message: error.message };
  }
}

// ============================================
// Payments
// ============================================

export async function recordPayment(
  invoiceId: string,
  payment: {
    amount_cents: number;
    payment_date?: string;
    payment_method?: string;
    reference?: string;
    bank_reference?: string;
  },
  userId: string
): Promise<{ success: boolean; message?: string }> {
  const supabase = createAdminClient();

  try {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('tenant_id, paid_amount_cents, total_amount_cents')
      .eq('id', invoiceId)
      .single();

    if (!invoice) throw new Error('Invoice not found');

    // Insert payment
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        tenant_id: invoice.tenant_id,
        invoice_id: invoiceId,
        payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
        amount_cents: payment.amount_cents,
        payment_method: payment.payment_method || 'bank_transfer',
        reference: payment.reference || null,
        bank_reference: payment.bank_reference || null,
        created_by: userId,
      });

    if (paymentError) throw paymentError;

    // Update paid amount
    const newPaidAmount = invoice.paid_amount_cents + payment.amount_cents;
    let newStatus: Invoice['status'] = 'partial';

    if (newPaidAmount >= invoice.total_amount_cents) {
      newStatus = 'paid';
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        paid_amount_cents: newPaidAmount,
        status: newStatus,
        paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (updateError) throw updateError;

    return { success: true, message: 'Zahlung erfolgreich erfasst.' };
  } catch (error: any) {
    console.error('Error recording payment:', error);
    return { success: false, message: error.message };
  }
}

export async function getPaymentsForInvoice(invoiceId: string): Promise<{ success: boolean; data?: Payment[]; message?: string }> {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return { success: false, message: error.message };
  }
}

// ============================================
// Debtors
// ============================================

export async function getDebtors(): Promise<{ success: boolean; data?: Debtor[]; message?: string }> {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from('debtors')
      .select('*')
      .order('billing_name');

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching debtors:', error);
    return { success: false, message: error.message };
  }
}

export async function getDebtorById(id: string): Promise<{ success: boolean; data?: Debtor; message?: string }> {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from('debtors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching debtor:', error);
    return { success: false, message: error.message };
  }
}

export async function createOrUpdateDebtor(
  data: Partial<Debtor> & { customer_id: string },
  tenantId: string | null
): Promise<{ success: boolean; data?: Debtor; message?: string }> {
  const supabase = createAdminClient();

  try {
    if (data.id) {
      const { data: updated, error } = await supabase
        .from('debtors')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: updated };
    } else {
      const { data: created, error } = await supabase
        .from('debtors')
        .insert({ ...data, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: created };
    }
  } catch (error: any) {
    console.error('Error creating/updating debtor:', error);
    return { success: false, message: error.message };
  }
}

// ============================================
// Dashboard Stats
// ============================================

export async function getInvoiceStats(): Promise<{
  success: boolean;
  data?: {
    total_open: number;
    total_overdue: number;
    total_paid_this_month: number;
    total_draft: number;
    currency: string;
  };
  message?: string;
}> {
  const supabase = createAdminClient();

  try {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date();
    startOfMonth.setDate(1);

    // Open invoices (sent but not fully paid)
    const { count: openCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .in('status', ['sent', 'partial', 'overdue']);

    // Overdue
    const { count: overdueCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'overdue');

    // Paid this month
    const { data: paidData } = await supabase
      .from('invoices')
      .select('paid_amount_cents')
      .eq('status', 'paid')
      .gte('paid_at', startOfMonth.toISOString());

    const paidThisMonth = (paidData || []).reduce((sum, inv) => sum + inv.paid_amount_cents, 0);

    // Draft
    const { count: draftCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft');

    return {
      success: true,
      data: {
        total_open: openCount || 0,
        total_overdue: overdueCount || 0,
        total_paid_this_month: paidThisMonth,
        total_draft: draftCount || 0,
        currency: 'EUR',
      },
    };
  } catch (error: any) {
    console.error('Error fetching invoice stats:', error);
    return { success: false, message: error.message };
  }
}

// ============================================
// Utility
// ============================================

export function formatCurrency(cents: number, currency = 'EUR'): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(amount);
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
