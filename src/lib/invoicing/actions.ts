// ============================================
// Invoice Server Actions
// ============================================

"use server";

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Invoice, InvoiceItem, InvoiceFilters, CreateInvoiceData, UpdateInvoiceData, InvoiceStatus } from './types';
import { logDataChange } from '@/lib/audit-log';
import { addDays, format } from 'date-fns';
import { generateInvoicePDF } from './pdf-generator';
import { exportDATEV } from './datev-export';
import { exportZUGFeRD } from './zugferd-export';
import { sendInvoiceEmail } from './email-service';
import { validateAmountCents, validateQuantity, validateTaxRate, MAX_AMOUNT_CENTS } from '@/lib/security';

// ============================================
// Invoice CRUD
// ============================================

export async function getInvoicesAction(filters: InvoiceFilters = {}) {
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

  const tenantId = profile?.tenant_id;

  if (!tenantId) {
    return { success: true, data: [] };
  }

  const supabaseAdmin = createAdminClient();

  try {
    let query = supabaseAdmin
      .from('invoices')
      .select(`
        *,
        debtor:debtors(*),
        order:orders(id, title, customer_id),
        items:invoice_items(*)
      `)
      .eq('tenant_id', tenantId)
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

export async function getInvoiceByIdAction(id: string) {
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

  const tenantId = profile?.tenant_id;

  if (!tenantId) {
    return { success: false, message: 'Tenant nicht gefunden.' };
  }

  const supabaseAdmin = createAdminClient();

  try {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        debtor:debtors(*),
        order:orders(id, title, customer_id, objects(*, customers(*))),
        items:invoice_items(*)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) throw error;

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

export async function createInvoiceAction(data: CreateInvoiceData) {
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

  const supabaseAdmin = createAdminClient();
  const tenantId = profile?.tenant_id || null;

  // Validate financial field bounds
  const taxRateValidation = validateTaxRate(data.tax_rate ?? 19.0);
  if (!taxRateValidation.valid) {
    return { success: false, message: `Steuersatz: ${taxRateValidation.message}` };
  }

  for (const item of data.items || []) {
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unit_price_cents) || 0;

    const qtyValidation = validateQuantity(qty);
    if (!qtyValidation.valid) {
      return { success: false, message: `Menge: ${qtyValidation.message}` };
    }

    const priceValidation = validateAmountCents(unitPrice);
    if (!priceValidation.valid) {
      return { success: false, message: `Einzelpreis: ${priceValidation.message}` };
    }

    const lineTotal = Math.round(qty * unitPrice);
    if (lineTotal > MAX_AMOUNT_CENTS) {
      return { success: false, message: `Positionssumme überschreitet Maximum von ${(MAX_AMOUNT_CENTS / 100).toFixed(2)} €.` };
    }
  }

  // Validate debtor ownership (debtor must belong to same tenant)
  if (data.debtor_id && tenantId) {
    const { data: debtor } = await supabaseAdmin
      .from('debtors')
      .select('tenant_id')
      .eq('id', data.debtor_id)
      .single();

    if (!debtor) {
      return { success: false, message: 'Debitor nicht gefunden.' };
    }

    if (debtor.tenant_id !== tenantId) {
      return { success: false, message: 'Keine Berechtigung für diesen Debitor.' };
    }
  }

  try {
    // Generate invoice number
    let invoiceNumber = 'R/00001';
    if (tenantId) {
      const { data: seqData } = await supabaseAdmin.rpc('generate_invoice_number', { p_tenant_id: tenantId });
      if (seqData) invoiceNumber = seqData;
    } else {
      const { count } = await supabaseAdmin.from('invoices').select('*', { count: 'exact', head: true });
      invoiceNumber = `R/${new Date().getFullYear()}/${String((count || 0) + 1).padStart(5, '0')}`;
    }

    const taxRate = data.tax_rate ?? 19.0;
    let netAmountCents = 0;
    let taxAmountCents = 0;

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
        sort_order: index,
        service_date: item.service_date || null,
      };
    });

    const { data: invoice, error: invoiceError } = await supabaseAdmin
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
        created_by: user.id,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    if (processedItems.length > 0) {
      const itemsWithInvoiceId = processedItems.map((item, idx) => ({
        ...item,
        invoice_id: invoice.id,
        line_number: idx + 1,
      }));

      const { error: itemsError } = await supabaseAdmin
        .from('invoice_items')
        .insert(itemsWithInvoiceId);

      if (itemsError) throw itemsError;
    }

    const { data: completeInvoice } = await supabaseAdmin
      .from('invoices')
      .select('*, debtor:debtors(*), items:invoice_items(*)')
      .eq('id', invoice.id)
      .single();

    if (completeInvoice) {
      await logDataChange(user.id, 'INSERT', 'invoices', invoice.id, null, {
        invoice_number: invoice.invoice_number,
        total: invoice.total_amount_cents,
      });
    }

    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard/invoices/new');

    return { success: true, data: completeInvoice };
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return { success: false, message: error.message };
  }
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

  const supabaseAdmin = createAdminClient();
  const tenantId = profile?.tenant_id || null;

  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, objects(*, customers(*)), customer_contacts(*)')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    let debtorId: string | null = null;

    if (order.customer_id) {
      const { data: existingDebtor } = await supabaseAdmin
        .from('debtors')
        .select('id')
        .eq('customer_id', order.customer_id)
        .maybeSingle();

      if (existingDebtor) {
        debtorId = existingDebtor.id;
      } else {
        const customer = (order as any).objects?.customers;
        if (customer) {
          const { data: newDebtor } = await supabaseAdmin
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

    const issueDate = options.issue_date || new Date().toISOString().split('T')[0];
    const dueDays = options.due_days || 30;
    const dueDate = format(addDays(new Date(issueDate), dueDays), 'yyyy-MM-dd');
    const taxRate = options.tax_rate ?? 19.0;

    const items: CreateInvoiceData['items'] = [];

    if (order.order_type === 'permanent' && order.fixed_monthly_price) {
      const netAmount = Math.round(Number(order.fixed_monthly_price) * 100);
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
      const startOfMonth = new Date();
      startOfMonth.setDate(1);

      const { data: timeEntries } = await supabaseAdmin
        .from('time_entries')
        .select('duration_minutes, break_minutes, employees(hourly_rate)')
        .eq('order_id', orderId)
        .gte('start_time', startOfMonth.toISOString());

      const { data: serviceRates } = await supabaseAdmin.from('service_rates').select('*');
      const rateMap = new Map((serviceRates || []).map((r: any) => [r.service_type, Number(r.hourly_rate)]));
      const rate = rateMap.get(order.service_type || '') || rateMap.get('standard') || 2400;

      let totalMinutes = 0;
      (timeEntries || []).forEach((entry: any) => {
        totalMinutes += entry.duration_minutes || 0;
      });

      if (totalMinutes > 0) {
        const hours = totalMinutes / 60;
        const netAmount = Math.round(hours * rate);
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

    let invoiceNumber = 'R/00001';
    if (tenantId) {
      const { data: seqData } = await supabaseAdmin.rpc('generate_invoice_number', { p_tenant_id: tenantId });
      if (seqData) invoiceNumber = seqData;
    }

    let netAmountCents = 0;
    let taxAmountCents = 0;

    items.forEach(item => {
      const netAmount = Math.round(item.quantity * item.unit_price_cents);
      netAmountCents += netAmount;
      taxAmountCents += Math.round(netAmount * (taxRate / 100));
    });

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert({
        tenant_id: tenantId,
        invoice_number: invoiceNumber,
        debtor_id: debtorId,
        order_id: orderId,
        issue_date: issueDate,
        due_date: dueDate,
        net_amount_cents: netAmountCents,
        tax_amount_cents: taxAmountCents,
        total_amount_cents: netAmountCents + taxAmountCents,
        tax_rate: taxRate,
        status: 'draft',
        notes: options.notes || `Rechnung für Auftrag: ${order.title}`,
        order_reference: order.title,
        created_by: user.id,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    if (items.length > 0) {
      const itemsWithLineNumbers = items.map((item, idx) => ({
        ...item,
        invoice_id: invoice.id,
        line_number: idx + 1,
        net_amount_cents: Math.round(item.quantity * item.unit_price_cents),
        tax_amount_cents: Math.round(item.quantity * item.unit_price_cents * (taxRate / 100)),
      }));

      await supabaseAdmin.from('invoice_items').insert(itemsWithLineNumbers);
    }

    const { data: completeInvoice } = await supabaseAdmin
      .from('invoices')
      .select('*, debtor:debtors(*), items:invoice_items(*)')
      .eq('id', invoice.id)
      .single();

    if (completeInvoice) {
      await logDataChange(user.id, 'INSERT', 'invoices', invoice.id, null, {
        invoice_number: invoice.invoice_number,
        order_id: orderId,
        total: invoice.total_amount_cents,
      });
    }

    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard/orders');

    return { success: true, data: completeInvoice };
  } catch (error: any) {
    console.error('Error creating invoice from order:', error);
    return { success: false, message: error.message };
  }
}

export async function updateInvoiceAction(invoiceId: string, data: UpdateInvoiceData) {
  const supabaseAdmin = createAdminClient();

  try {
    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select('*, debtor:debtors(*), items:invoice_items(*)')
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${invoiceId}`);

    return { success: true, data: invoice };
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    return { success: false, message: error.message };
  }
}

export async function updateInvoiceStatusAction(invoiceId: string, status: InvoiceStatus) {
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

  const tenantId = profile?.tenant_id;

  if (!tenantId) {
    return { success: false, message: 'Tenant nicht gefunden.' };
  }

  const supabaseAdmin = createAdminClient();

  try {
    // First verify this invoice belongs to the tenant
    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('tenant_id, total_amount_cents')
      .eq('id', invoiceId)
      .eq('tenant_id', tenantId)
      .single();

    if (!invoice) {
      throw new Error('Invoice nicht gefunden oder keine Berechtigung.');
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString();
    }

    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString();
      updateData.paid_amount_cents = invoice.total_amount_cents;
    }

    const { error } = await supabaseAdmin
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${invoiceId}`);

    return { success: true };
  } catch (error: any) {
    console.error('Error updating invoice status:', error);
    return { success: false, message: error.message };
  }
}

export async function deleteInvoiceAction(invoiceId: string) {
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

  const tenantId = profile?.tenant_id;

  if (!tenantId) {
    return { success: false, message: 'Tenant nicht gefunden.' };
  }

  const supabaseAdmin = createAdminClient();

  try {
    // First verify this invoice belongs to the tenant
    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('id')
      .eq('id', invoiceId)
      .eq('tenant_id', tenantId)
      .single();

    if (!invoice) {
      throw new Error('Invoice nicht gefunden oder keine Berechtigung.');
    }

    const { error } = await supabaseAdmin
      .from('invoices')
      .delete()
      .eq('id', invoiceId)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    revalidatePath('/dashboard/invoices');

    return { success: true, message: 'Rechnung erfolgreich gelöscht.' };
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    return { success: false, message: error.message };
  }
}

// ============================================
// Invoice Items
// ============================================

export async function addInvoiceItemAction(
  invoiceId: string,
  item: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at' | 'line_number' | 'net_amount_cents' | 'tax_amount_cents'>
) {
  const supabaseAdmin = createAdminClient();

  try {
    const { data: lastItem } = await supabaseAdmin
      .from('invoice_items')
      .select('line_number')
      .eq('invoice_id', invoiceId)
      .order('line_number', { ascending: false })
      .limit(1)
      .single();

    const lineNumber = (lastItem?.line_number || 0) + 1;

    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('tax_rate')
      .eq('id', invoiceId)
      .single();

    const taxRate = item.tax_rate || invoice?.tax_rate || 19.0;
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unit_price_cents) || 0;
    const netAmount = Math.round(qty * unitPrice);
    const taxAmount = Math.round(netAmount * (taxRate / 100));

    const { data: newItem, error } = await supabaseAdmin
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

    revalidatePath(`/dashboard/invoices/${invoiceId}`);

    return { success: true, data: newItem };
  } catch (error: any) {
    console.error('Error adding invoice item:', error);
    return { success: false, message: error.message };
  }
}

export async function updateInvoiceItemAction(itemId: string, updates: Partial<InvoiceItem>) {
  const supabaseAdmin = createAdminClient();

  try {
    const { data: existingItem } = await supabaseAdmin
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

    const { data: updatedItem, error } = await supabaseAdmin
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

    // Find invoice_id to revalidate
    const { data: item } = await supabaseAdmin
      .from('invoice_items')
      .select('invoice_id')
      .eq('id', itemId)
      .single();

    if (item) {
      revalidatePath(`/dashboard/invoices/${item.invoice_id}`);
    }

    return { success: true, data: updatedItem };
  } catch (error: any) {
    console.error('Error updating invoice item:', error);
    return { success: false, message: error.message };
  }
}

export async function deleteInvoiceItemAction(itemId: string) {
  const supabaseAdmin = createAdminClient();

  try {
    const { data: item } = await supabaseAdmin
      .from('invoice_items')
      .select('invoice_id')
      .eq('id', itemId)
      .single();

    const { error } = await supabaseAdmin
      .from('invoice_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;

    if (item) {
      revalidatePath(`/dashboard/invoices/${item.invoice_id}`);
    }

    return { success: true, message: 'Position erfolgreich gelöscht.' };
  } catch (error: any) {
    console.error('Error deleting invoice item:', error);
    return { success: false, message: error.message };
  }
}

// ============================================
// Payments
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
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Nicht authentifiziert.' };
  }

  try {
    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('tenant_id, paid_amount_cents, total_amount_cents')
      .eq('id', invoiceId)
      .single();

    if (!invoice) throw new Error('Invoice not found');

    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        tenant_id: invoice.tenant_id,
        invoice_id: invoiceId,
        payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
        amount_cents: payment.amount_cents,
        payment_method: payment.payment_method || 'bank_transfer',
        reference: payment.reference || null,
        bank_reference: payment.bank_reference || null,
        created_by: user.id,
      });

    if (paymentError) throw paymentError;

    const newPaidAmount = invoice.paid_amount_cents + payment.amount_cents;
    let newStatus: Invoice['status'] = 'partial';

    if (newPaidAmount >= invoice.total_amount_cents) {
      newStatus = 'paid';
    }

    const { error: updateError } = await supabaseAdmin
      .from('invoices')
      .update({
        paid_amount_cents: newPaidAmount,
        status: newStatus,
        paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (updateError) throw updateError;

    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${invoiceId}`);

    return { success: true, message: 'Zahlung erfolgreich erfasst.' };
  } catch (error: any) {
    console.error('Error recording payment:', error);
    return { success: false, message: error.message };
  }
}

export async function getPaymentsForInvoiceAction(invoiceId: string) {
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

  const tenantId = profile?.tenant_id;

  if (!tenantId) {
    return { success: false, message: 'Tenant nicht gefunden.' };
  }

  const supabaseAdmin = createAdminClient();

  try {
    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('tenant_id', tenantId)
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

export async function getDebtorsAction() {
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

  const tenantId = profile?.tenant_id;

  if (!tenantId) {
    return { success: true, data: [] };
  }

  const supabaseAdmin = createAdminClient();

  try {
    const { data, error } = await supabaseAdmin
      .from('debtors')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('billing_name');

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching debtors:', error);
    return { success: false, message: error.message };
  }
}

export async function getDebtorByIdAction(id: string) {
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

  const tenantId = profile?.tenant_id;

  if (!tenantId) {
    return { success: false, message: 'Tenant nicht gefunden.' };
  }

  const supabaseAdmin = createAdminClient();

  try {
    const { data, error } = await supabaseAdmin
      .from('debtors')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching debtor:', error);
    return { success: false, message: error.message };
  }
}

// ============================================
// Dashboard Stats
// ============================================

export async function getInvoiceStatsAction() {
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

  const tenantId = profile?.tenant_id;

  if (!tenantId) {
    return { success: true, data: { total_open: 0, total_overdue: 0, total_paid_this_month: 0, total_draft: 0, currency: 'EUR' } };
  }

  const supabaseAdmin = createAdminClient();

  try {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date();
    startOfMonth.setDate(1);

    const { count: openCount } = await supabaseAdmin
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['sent', 'partial', 'overdue']);

    const { count: overdueCount } = await supabaseAdmin
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'overdue');

    const { data: paidData } = await supabaseAdmin
      .from('invoices')
      .select('paid_amount_cents')
      .eq('tenant_id', tenantId)
      .eq('status', 'paid')
      .gte('paid_at', startOfMonth.toISOString());

    const paidThisMonth = (paidData || []).reduce((sum: number, inv: any) => sum + inv.paid_amount_cents, 0);

    const { count: draftCount } = await supabaseAdmin
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
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
// Export Actions
// ============================================

export async function exportDATEVAction(dateFrom: string, dateTo: string) {
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

  const tenantId = profile?.tenant_id;
  if (!tenantId) {
    return { success: false, message: 'Tenant nicht gefunden.' };
  }

  return exportDATEV(dateFrom, dateTo, tenantId);
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

  const invoiceResult = await getInvoiceByIdAction(invoiceId);
  if (!invoiceResult.success || !invoiceResult.data) {
    return { success: false, message: 'Rechnung nicht gefunden.' };
  }

  const invoice = invoiceResult.data;
  const email = recipientEmail || invoice.debtor?.invoice_email;

  if (!email) {
    return { success: false, message: 'Keine Empfänger-E-Mail gefunden.' };
  }

  const pdfResult = await generateInvoicePDF(invoice);
  if (!pdfResult.success) {
    return { success: false, message: 'PDF konnte nicht generiert werden.' };
  }

  const emailResult = await sendInvoiceEmail({
    invoice,
    recipientEmail: email,
    pdfBuffer: pdfResult.data!,
  });

  if (emailResult.success) {
    await updateInvoiceStatusAction(invoiceId, 'sent');
    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${invoiceId}`);
  }

  return emailResult;
}

// ============================================
// PDF Download
// ============================================

export async function downloadInvoicePDFAction(invoiceId: string) {
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

  const tenantId = profile?.tenant_id;

  if (!tenantId) {
    return { success: false, message: 'Tenant nicht gefunden.' };
  }

  // Get invoice with tenant verification
  const supabaseAdmin = createAdminClient();
  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select(`
      *,
      debtor:debtors(*),
      items:invoice_items(*)
    `)
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !invoice) {
    return { success: false, message: 'Rechnung nicht gefunden oder keine Berechtigung.' };
  }

  const pdfResult = await generateInvoicePDF(invoice);

  if (!pdfResult.success) {
    return { success: false, message: pdfResult.message || 'PDF konnte nicht generiert werden.' };
  }

  return {
    success: true,
    data: pdfResult.data,
    filename: pdfResult.filename,
  };
}
