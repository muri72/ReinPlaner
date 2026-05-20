// ============================================
// Invoice Server Actions
// Migrated from Supabase to Drizzle+NextAuth
// ============================================

"use server";

import { auth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { Invoice, InvoiceItem, InvoiceFilters, CreateInvoiceData, UpdateInvoiceData, InvoiceStatus } from './types';
import { logDataChange } from '@/lib/audit-log';
import { addDays, format } from 'date-fns';
import { generateInvoicePDF } from './pdf-generator';
import { exportDATEV } from './datev-export';
import { exportZUGFeRD } from './zugferd-export';
import { exportXRechnung } from './xrechnung-export';
import { sendInvoiceEmail, sendReminderEmail } from './email-service';
import { validateAmountCents, validateQuantity, validateTaxRate, MAX_AMOUNT_CENTS } from '@/lib/security';
import { eq, and, desc, gte, lte, like, or, inArray } from 'drizzle-orm';
import { 
  invoices, 
  invoiceItems, 
  invoiceSequences,
  debtors, 
  payments, 
  profiles, 
  tenants,
  orders,
  customers,
  objects,
  timeEntries,
  serviceRates,
  employees
} from '@/lib/db/schema';

// ============================================
// Helper: Get current user session with tenant
// ============================================

async function getSessionWithTenant() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, message: 'Nicht authentifiziert.', user: null, tenantId: null };
  }

  const userId = session.user.id;
  const tenantId = (session.user as any).tenantId as string | null;

  return { success: true, user: session.user, tenantId };
}

// ============================================
// Invoice CRUD
// ============================================

export async function getInvoicesAction(filters: InvoiceFilters = {}) {
  const { success, message, user, tenantId } = await getSessionWithTenant();
  
  if (!success || !user) {
    return { success: false, message };
  }

  if (!tenantId) {
    return { success: true, data: [] };
  }

  try {
    // Build query conditions
    const conditions = [eq(invoices.tenantId, tenantId)];

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(inArray(invoices.status, filters.status));
      } else {
        conditions.push(eq(invoices.status, filters.status));
      }
    }

    if (filters.debtor_id) {
      conditions.push(eq(invoices.customerId, filters.debtor_id));
    }

    if (filters.date_from) {
      conditions.push(gte(invoices.issueDate, new Date(filters.date_from)));
    }

    if (filters.date_to) {
      conditions.push(lte(invoices.issueDate, new Date(filters.date_to)));
    }

    if (filters.search) {
      conditions.push(
        like(invoices.invoiceNumber, `%${filters.search}%`)
      );
    }

    const result = await db.query.invoices.findMany({
      where: and(...conditions),
      with: {
        customer: true,
        items: true,
      },
      orderBy: [desc(invoices.createdAt)],
    });

    const today = new Date().toISOString().split('T')[0];
    const processedData = result.map(inv => ({
      ...inv,
      status: inv.status === 'sent' && inv.dueDate && inv.dueDate < new Date(today) && (inv.paidAmount || 0) < (inv.totalAmount || 0)
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
  const { success, message, user, tenantId } = await getSessionWithTenant();
  
  if (!success || !user) {
    return { success: false, message };
  }

  if (!tenantId) {
    return { success: false, message: 'Tenant nicht gefunden.' };
  }

  try {
    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)),
      with: {
        items: true,
      },
    });

    if (!invoice) {
      return { success: false, message: 'Rechnung nicht gefunden.' };
    }

    const today = new Date().toISOString().split('T')[0];
    const processedData = {
      ...invoice,
      status: invoice.status === 'sent' && invoice.dueDate && invoice.dueDate < new Date(today) && (invoice.paidAmount || 0) < (invoice.totalAmount || 0)
        ? 'overdue' as const
        : invoice.status,
    };

    return { success: true, data: processedData };
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    return { success: false, message: error.message };
  }
}

export async function createInvoiceAction(data: CreateInvoiceData) {
  const { success, message, user, tenantId } = await getSessionWithTenant();
  
  if (!success || !user) {
    return { success: false, message };
  }

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
    const debtor = await db.query.debtors.findFirst({
      where: and(eq(debtors.id, data.debtor_id), eq(debtors.tenantId, tenantId)),
    });

    if (!debtor) {
      return { success: false, message: 'Debitor nicht gefunden.' };
    }
  }

  try {
    // Generate invoice number
    let invoiceNumber = 'R/00001';
    
    if (tenantId) {
      // Get or create invoice sequence
      const sequence = await db.query.invoiceSequences.findFirst({
        where: and(eq(invoiceSequences.tenantId, tenantId), eq(invoiceSequences.year, new Date().getFullYear())),
      });

      if (sequence) {
        const nextNumber = (sequence.lastNumber ?? 0) + 1;
        invoiceNumber = `${sequence.prefix || 'RE'}/${new Date().getFullYear()}/${String(nextNumber).padStart(5, '0')}`;
        
        await db.update(invoiceSequences)
          .set({ lastNumber: nextNumber, updatedAt: new Date() })
          .where(eq(invoiceSequences.id, sequence.id));
      } else {
        // Create new sequence for this year
        invoiceNumber = `RE/${new Date().getFullYear()}/00001`;
        
        await db.insert(invoiceSequences).values({
          tenantId,
          lastNumber: 1,
          year: new Date().getFullYear(),
          prefix: 'RE',
        });
      }
    } else {
      const countResult = await db.select().from(invoices);
      invoiceNumber = `R/${new Date().getFullYear()}/${String((countResult.length || 0) + 1).padStart(5, '0')}`;
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
        unitPrice: unitPrice,
        netAmount: netAmount,
        taxAmount: taxAmount,
        sortOrder: index,
        serviceDate: item.service_date || null,
      };
    });

    // Get customer_id from debtor or order
    let customerId = '';
    if (data.debtor_id) {
      const debtor = await db.query.debtors.findFirst({
        where: eq(debtors.id, data.debtor_id),
      });
      customerId = debtor?.customerId ?? '';
    } else if (data.order_id) {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, data.order_id),
      });
      customerId = order?.customerId ?? '';
    }

    const [invoice] = await db.insert(invoices).values({
      tenantId: tenantId!,
      customerId,
      invoiceNumber,
      status: 'draft',
      issueDate: data.issue_date ? new Date(data.issue_date) : new Date(),
      dueDate: data.due_date ? new Date(data.due_date) : null,
      totalAmount: netAmountCents + taxAmountCents,
      notes: data.notes || null,
    }).returning();

    if (processedItems.length > 0) {
      const itemsWithInvoiceId = processedItems.map((item, idx) => ({
        invoiceId: invoice.id,
        description: item.service_description,
        quantity: item.quantity,
        unitPrice: Math.round(item.unitPrice ?? 0),
        totalPrice: Math.round(item.netAmount ?? 0),
      }));

      await db.insert(invoiceItems).values(itemsWithInvoiceId);
    }

    // Fetch complete invoice with relations
    const completeInvoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoice.id),
      with: {
        items: true,
      },
    });

    if (completeInvoice && user.id) {
      await logDataChange(user.id, 'INSERT', 'invoices', invoice.id, null, {
        invoice_number: completeInvoice.invoiceNumber,
        total: completeInvoice.totalAmount,
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
  const { success, message, user, tenantId } = await getSessionWithTenant();
  
  if (!success || !user) {
    return { success: false, message };
  }

  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        object: true,
      },
    });

    if (!order) {
      return { success: false, message: 'Auftrag nicht gefunden.' };
    }

    let debtorId: string | null = null;

    if (order.customerId) {
      const existingDebtor = await db.query.debtors.findFirst({
        where: eq(debtors.customerId, order.customerId),
      });

      if (existingDebtor) {
        debtorId = existingDebtor.id;
      }
    }

    const issueDate = options.issue_date || new Date().toISOString().split('T')[0];
    const dueDays = options.due_days || 30;
    const dueDate = format(addDays(new Date(issueDate), dueDays), 'yyyy-MM-dd');
    const taxRate = options.tax_rate ?? 19.0;

    const items: CreateInvoiceData['items'] = [];

    // Check for permanent orders with fixed monthly price
    if ((order as any).order_type === 'permanent' && (order as any).fixed_monthly_price) {
      const netAmount = Math.round(Number((order as any).fixed_monthly_price) * 100);
      items.push({
        service_description: `Monatliche Pauschale für: ${(order as any).title || 'Auftrag'}`,
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

      // Get time entries for this order
      const timeEntriesData = await db.query.timeEntries.findMany({
        where: eq(timeEntries.shiftId, orderId as any), // Using order_id reference
      });

      // Get service rates
      const serviceRatesData = await db.select().from(serviceRates);
      const rateMap = new Map(serviceRatesData.map((r: any) => [r.serviceType, Number(r.hourlyRate)]));
      const rate = rateMap.get((order as any).service_type || '') || rateMap.get('standard') || 2400;

      let totalMinutes = 0;
      (timeEntriesData || []).forEach((entry: any) => {
        totalMinutes += Number(entry.hoursWorked || 0);
      });

      if (totalMinutes > 0) {
        const hours = totalMinutes / 60;
        const netAmount = Math.round(Number(hours) * Number(rate));
        items.push({
          service_description: `Dienstleistung: ${(order as any).title || 'Auftrag'}`,
          quantity: Math.round(Number(hours) * 100) / 100,
          unit: 'h',
          unit_price_cents: Number(rate),
          tax_rate: taxRate,
          sort_order: 0,
          service_date: issueDate,
        });
      }
    }

    // Generate invoice number
    let invoiceNumber = 'R/00001';
    const customerId = order.customerId;

    if (tenantId) {
      const sequence = await db.query.invoiceSequences.findFirst({
        where: and(eq(invoiceSequences.tenantId, tenantId), eq(invoiceSequences.year, new Date().getFullYear())),
      });

      if (sequence) {
        const nextNumber = (sequence.lastNumber ?? 0) + 1;
        invoiceNumber = `${sequence.prefix || 'RE'}/${new Date().getFullYear()}/${String(nextNumber).padStart(5, '0')}`;
        
        await db.update(invoiceSequences)
          .set({ lastNumber: nextNumber, updatedAt: new Date() })
          .where(eq(invoiceSequences.id, sequence.id));
      } else {
        invoiceNumber = `RE/${new Date().getFullYear()}/00001`;
        
        await db.insert(invoiceSequences).values({
          tenantId,
          lastNumber: 1,
          year: new Date().getFullYear(),
          prefix: 'RE',
        });
      }
    }

    let netAmountCents = 0;
    let taxAmountCents = 0;

    items.forEach(item => {
      const netAmount = Math.round(item.quantity * item.unit_price_cents);
      netAmountCents += netAmount;
      taxAmountCents += Math.round(netAmount * (taxRate / 100));
    });

    const [invoice] = await db.insert(invoices).values({
      tenantId,
      customerId,
      invoiceNumber,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      totalAmount: netAmountCents + taxAmountCents,
      status: 'draft',
      notes: options.notes || `Rechnung für Auftrag: ${(order as any).title || 'Auftrag'}`,
    }).returning();

    if (items.length > 0) {
      const itemsForInsert = items.map((item) => ({
        invoiceId: invoice.id,
        description: item.service_description,
        quantity: item.quantity,
        unitPrice: item.unit_price_cents,
        totalPrice: Math.round(item.quantity * item.unit_price_cents),
      }));

      await db.insert(invoiceItems).values(itemsForInsert);
    }

    const completeInvoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoice.id),
      with: {
        debtor: true,
        items: true,
      },
    });

    if (completeInvoice) {
      await logDataChange(user.id, 'INSERT', 'invoices', invoice.id, null, {
        invoice_number: invoice.invoiceNumber,
        order_id: orderId,
        total: invoice.totalAmount,
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
  const { success, message, user, tenantId } = await getSessionWithTenant();
  
  if (!success || !user) {
    return { success: false, message };
  }

  if (!tenantId) {
    return { success: false, message: 'Tenant nicht gefunden.' };
  }

  try {
    // First verify this invoice belongs to the tenant
    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)),
    });

    if (!invoice) {
      throw new Error('Invoice nicht gefunden oder keine Berechtigung.');
    }

    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    if (data.issue_date) updateData.issueDate = new Date(data.issue_date);
    if (data.due_date) updateData.dueDate = new Date(data.due_date);
    if (data.delivery_date_start) updateData.deliveryDateStart = new Date(data.delivery_date_start);
    if (data.delivery_date_end) updateData.deliveryDateEnd = new Date(data.delivery_date_end);

    const [updatedInvoice] = await db.update(invoices)
      .set(updateData)
      .where(eq(invoices.id, invoiceId))
      .returning();

    const completeInvoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
      with: {
        debtor: true,
        items: true,
      },
    });

    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${invoiceId}`);

    return { success: true, data: completeInvoice };
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    return { success: false, message: error.message };
  }
}

export async function updateInvoiceStatusAction(invoiceId: string, status: InvoiceStatus) {
  const { success, message, user, tenantId } = await getSessionWithTenant();
  
  if (!success || !user) {
    return { success: false, message };
  }

  if (!tenantId) {
    return { success: false, message: 'Tenant nicht gefunden.' };
  }

  try {
    // First verify this invoice belongs to the tenant
    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)),
    });

    if (!invoice) {
      throw new Error('Invoice nicht gefunden oder keine Berechtigung.');
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'sent') {
      updateData.sentAt = new Date();
    }

    if (status === 'paid') {
      updateData.paidAt = new Date();
      updateData.paidAmount = invoice.totalAmount;
    }

    await db.update(invoices)
      .set(updateData)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));

    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${invoiceId}`);

    return { success: true };
  } catch (error: any) {
    console.error('Error updating invoice status:', error);
    return { success: false, message: error.message };
  }
}

export async function deleteInvoiceAction(invoiceId: string) {
  const { success, message, user, tenantId } = await getSessionWithTenant();
  
  if (!success || !user) {
    return { success: false, message };
  }

  if (!tenantId) {
    return { success: false, message: 'Tenant nicht gefunden.' };
  }

  try {
    // First verify this invoice belongs to the tenant
    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)),
    });

    if (!invoice) {
      throw new Error('Invoice nicht gefunden oder keine Berechtigung.');
    }

    await db.delete(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));

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
  try {
    // Get last line number for this invoice
    const lastItem = await db.query.invoiceItems.findFirst({
      where: eq(invoiceItems.invoiceId, invoiceId),
      orderBy: [desc(invoiceItems.lineNumber)],
    });

    const lineNumber = (lastItem?.lineNumber || 0) + 1;

    // Get invoice tax rate
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
    });

    const taxRate = item.tax_rate || invoice?.taxRate || 19.0;
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unit_price_cents) || 0;
    const netAmount = Math.round(qty * unitPrice);
    const taxAmount = Math.round(netAmount * (taxRate / 100));

    const [newItem] = await db.insert(invoiceItems).values({
      invoiceId,
      lineNumber,
      serviceDate: item.service_date || null,
      serviceDescription: item.service_description,
      quantity: qty,
      unit: item.unit || 'h',
      unitPrice: unitPrice,
      netAmount,
      taxRate,
      taxAmount,
      sortOrder: item.sort_order || lineNumber,
    }).returning();

    revalidatePath(`/dashboard/invoices/${invoiceId}`);

    return { success: true, data: newItem };
  } catch (error: any) {
    console.error('Error adding invoice item:', error);
    return { success: false, message: error.message };
  }
}

export async function updateInvoiceItemAction(itemId: string, updates: Partial<InvoiceItem>) {
  try {
    const existingItem = await db.query.invoiceItems.findFirst({
      where: eq(invoiceItems.id, itemId),
      with: {
        invoices: {
          with: {}
        }
      },
    });

    if (!existingItem) throw new Error('Item not found');

    const taxRate = updates.tax_rate || (existingItem as any).invoices?.taxRate || 19.0;
    const qty = updates.quantity !== undefined ? Number(updates.quantity) : existingItem.quantity;
    const unitPrice = updates.unit_price_cents !== undefined ? Number(updates.unit_price_cents) : existingItem.unitPrice;
    const netAmount = Math.round(qty * unitPrice);
    const taxAmount = Math.round(netAmount * (taxRate / 100));

    const [updatedItem] = await db.update(invoiceItems)
      .set({
        serviceDate: updates.service_date ?? existingItem.serviceDate,
        serviceDescription: updates.service_description ?? existingItem.serviceDescription,
        quantity: qty,
        unit: updates.unit ?? existingItem.unit,
        unitPrice: unitPrice,
        netAmount: netAmount,
        taxRate: taxRate,
        taxAmount: taxAmount,
        sortOrder: updates.sort_order ?? existingItem.sortOrder,
      })
      .where(eq(invoiceItems.id, itemId))
      .returning();

    // Find invoice_id to revalidate
    const item = await db.query.invoiceItems.findFirst({
      where: eq(invoiceItems.id, itemId),
    });

    if (item) {
      revalidatePath(`/dashboard/invoices/${item.invoiceId}`);
    }

    return { success: true, data: updatedItem };
  } catch (error: any) {
    console.error('Error updating invoice item:', error);
    return { success: false, message: error.message };
  }
}

export async function deleteInvoiceItemAction(itemId: string) {
  try {
    const item = await db.query.invoiceItems.findFirst({
      where: eq(invoiceItems.id, itemId),
    });

    await db.delete(invoiceItems).where(eq(invoiceItems.id, itemId));

    if (item) {
      revalidatePath(`/dashboard/invoices/${item.invoiceId}`);
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
  const { success, message, user, tenantId } = await getSessionWithTenant();
  
  if (!success || !user) {
    return { success: false, message };
  }

  try {
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
    });

    if (!invoice) throw new Error('Invoice not found');

    await db.insert(payments).values({
      invoiceId,
      debtorId: invoice.debtorId || null,
      amount: payment.amount_cents,
      paymentDate: payment.payment_date ? new Date(payment.payment_date) : new Date(),
      paymentMethod: payment.payment_method || 'bank_transfer',
      reference: payment.reference || null,
    });

    const newPaidAmount = (invoice.paidAmount || 0) + payment.amount_cents;
    let newStatus: Invoice['status'] = 'partial';

    if (newPaidAmount >= (invoice.totalAmount || 0)) {
      newStatus = 'paid';
    }

    await db.update(invoices)
      .set({
        paidAmount: newPaidAmount,
        status: newStatus,
        paidAt: newStatus === 'paid' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId));

    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${invoiceId}`);

    return { success: true, message: 'Zahlung erfolgreich erfasst.' };
  } catch (error: any) {
    console.error('Error recording payment:', error);
    return { success: false, message: error.message };
  }
}

export async function getPaymentsForInvoiceAction(invoiceId: string) {
  const { success, message, user, tenantId } = await getSessionWithTenant();
  
  if (!success || !user) {
    return { success: false, message };
  }

  if (!tenantId) {
    return { success: false, message: 'Tenant nicht gefunden.' };
  }

  try {
    const result = await db.query.payments.findMany({
      where: eq(payments.invoiceId, invoiceId),
      orderBy: [desc(payments.paymentDate)],
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return { success: false, message: error.message };
  }
}

// ============================================
// Debtors
// ============================================

export async function getDebtorsAction() {
  const { success, message, user, tenantId } = await getSessionWithTenant();
  
  if (!success || !user) {
    return { success: false, message };
  }

  if (!tenantId) {
    return { success: true, data: [] };
  }

  try {
    const result = await db.query.debtors.findMany({
      where: eq(debtors.tenantId, tenantId),
      orderBy: [debtors.billingName],
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error fetching debtors:', error);
    return { success: false, message: error.message };
  }
}

export async function getDebtorByIdAction(id: string) {
  const { success, message, user, tenantId } = await getSessionWithTenant();
  
  if (!success || !user) {
    return { success: false, message };
  }

  if (!tenantId) {
    return { success: false, message: 'Tenant nicht gefunden.' };
  }

  try {
    const debtor = await db.query.debtors.findFirst({
      where: and(eq(debtors.id, id), eq(debtors.tenantId, tenantId)),
    });

    if (!debtor) {
      return { success: false, message: 'Debitor nicht gefunden.' };
    }

    return { success: true, data: debtor };
  } catch (error: any) {
    console.error('Error fetching debtor:', error);
    return { success: false, message: error.message };
  }
}

// ============================================
// Dashboard Stats
// ============================================

export async function getInvoiceStatsAction() {
  const { success, message, user, tenantId } = await getSessionWithTenant();
  
  if (!success || !user) {
    return { success: false, message };
  }

  if (!tenantId) {
    return { success: true, data: { total_open: 0, total_overdue: 0, total_paid_this_month: 0, total_draft: 0, currency: 'EUR' } };
  }

  try {
    const today = new Date();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);

    // Count open invoices
    const openInvoices = await db.query.invoices.findMany({
      where: and(
        eq(invoices.tenantId, tenantId),
        inArray(invoices.status, ['sent', 'partial', 'overdue'])
      ),
    });

    // Count overdue invoices
    const overdueInvoices = await db.query.invoices.findMany({
      where: and(
        eq(invoices.tenantId, tenantId),
        eq(invoices.status, 'overdue')
      ),
    });

    // Get paid this month
    const paidInvoices = await db.query.invoices.findMany({
      where: and(
        eq(invoices.tenantId, tenantId),
        eq(invoices.status, 'paid'),
        gte(invoices.paidAt, startOfMonth)
      ),
    });

    const paidThisMonth = paidInvoices.reduce((sum: number, inv: any) => sum + (inv.paidAmount || 0), 0);

    // Count draft invoices
    const draftInvoices = await db.query.invoices.findMany({
      where: and(
        eq(invoices.tenantId, tenantId),
        eq(invoices.status, 'draft')
      ),
    });

    return {
      success: true,
      data: {
        total_open: openInvoices.length,
        total_overdue: overdueInvoices.length,
        total_paid_this_month: paidThisMonth,
        total_draft: draftInvoices.length,
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
  const { success, message, user, tenantId } = await getSessionWithTenant();
  
  if (!success || !user) {
    return { success: false, message, data: null, filename: null };
  }

  if (!tenantId) {
    return { success: false, message: 'Tenant nicht gefunden.', data: null, filename: null };
  }

  return exportDATEV(dateFrom, dateTo, tenantId);
}

export async function exportZUGFeRDAction(invoiceId: string) {
  const { success, message, user } = await getSessionWithTenant();
  
  if (!success || !user) {
    return { success: false, message, data: null };
  }

  return exportZUGFeRD(invoiceId);
}

export async function exportXRechnungAction(invoiceId: string) {
  const { success, message, user } = await getSessionWithTenant();
  
  if (!success || !user) {
    return { success: false, message, data: null };
  }

  return exportXRechnung(invoiceId);
}

// ============================================
// Email Actions
// ============================================

export async function sendInvoiceEmailAction(invoiceId: string, recipientEmail?: string) {
  const { success, message, user } = await getSessionWithTenant();
  
  if (!success || !user) {
    return { success: false, message };
  }

  const invoiceResult = await getInvoiceByIdAction(invoiceId);
  if (!invoiceResult.success || !invoiceResult.data) {
    return { success: false, message: 'Rechnung nicht gefunden.' };
  }

  const invoice = invoiceResult.data;
  const email = recipientEmail || (invoice.debtor as any)?.invoice_email;

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
// Reminder Action
// ============================================

export async function sendInvoiceReminderAction(invoiceId: string) {
  const { success, message, user } = await getSessionWithTenant();
  
  if (!success || !user) {
    return { success: false, message };
  }

  const invoiceResult = await getInvoiceByIdAction(invoiceId);
  if (!invoiceResult.success || !invoiceResult.data) {
    return { success: false, message: 'Rechnung nicht gefunden.' };
  }

  const invoice = invoiceResult.data;
  const email = (invoice.debtor as any)?.invoice_email;

  if (!email) {
    return { success: false, message: 'Keine Empfänger-E-Mail gefunden.' };
  }

  const result = await sendReminderEmail(invoice, email);

  if (result.success) {
    // Increment reminder count
    await db.update(invoices)
      .set({
        reminderCount: (invoice.reminderCount || 0) + 1,
        lastReminderAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId));

    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${invoiceId}`);
  }

  return result;
}

// ============================================
// PDF Download
// ============================================

export async function downloadInvoicePDFAction(invoiceId: string) {
  const { success, message, user, tenantId } = await getSessionWithTenant();
  
  if (!success || !user) {
    return { success: false, message };
  }

  if (!tenantId) {
    return { success: false, message: 'Tenant nicht gefunden.' };
  }

  // Get invoice with tenant verification
  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)),
    with: {
      debtor: true,
      items: true,
    },
  });

  if (!invoice) {
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
