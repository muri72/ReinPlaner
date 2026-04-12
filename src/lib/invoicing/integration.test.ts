// ============================================
// Integration Tests: Invoice CRUD
// Tests complete business flows with mock Supabase
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// In-Memory DB Store
// ============================================

interface StoredInvoice {
  id: string;
  invoice_number: string;
  debtor_id: string | null;
  order_id: string | null;
  tenant_id: string | null;
  issue_date: string;
  due_date: string;
  net_amount_cents: number;
  tax_amount_cents: number;
  total_amount_cents: number;
  paid_amount_cents: number;
  tax_rate: number;
  status: string;
  currency: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface StoredInvoiceItem {
  id: string;
  invoice_id: string;
  line_number: number;
  service_description: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  net_amount_cents: number;
  tax_rate: number;
  tax_amount_cents: number;
  sort_order: number;
  created_at: string;
}

interface StoredPayment {
  id: string;
  invoice_id: string;
  tenant_id: string | null;
  payment_date: string;
  amount_cents: number;
  payment_method: string;
  created_by: string | null;
  created_at: string;
}

interface StoredDebtor {
  id: string;
  tenant_id: string | null;
  customer_id: string | null;
  billing_name: string | null;
  billing_country: string;
  created_at: string;
}

class InMemoryDB {
  invoices: Map<string, StoredInvoice> = new Map();
  invoiceItems: Map<string, StoredInvoiceItem> = new Map();
  payments: Map<string, StoredPayment> = new Map();
  debtors: Map<string, StoredDebtor> = new Map();
  invoiceCounter = 0;
  itemCounter = 0;
  paymentCounter = 0;
  debtorCounter = 0;

  reset() {
    this.invoices.clear();
    this.invoiceItems.clear();
    this.payments.clear();
    this.debtors.clear();
    this.invoiceCounter = 0;
    this.itemCounter = 0;
    this.paymentCounter = 0;
    this.debtorCounter = 0;
  }

  seedTestData() {
    this.reset();

    const now = new Date().toISOString();

    this.debtors.set('deb-seed-1', {
      id: 'deb-seed-1', tenant_id: 'tenant-1', customer_id: 'cust-1',
      billing_name: 'Mustermann GmbH', billing_country: 'DE', created_at: now,
    });
    this.debtors.set('deb-seed-2', {
      id: 'deb-seed-2', tenant_id: 'tenant-1', customer_id: 'cust-2',
      billing_name: 'Test AG', billing_country: 'DE', created_at: now,
    });

    this.invoices.set('inv-seed-1', {
      id: 'inv-seed-1', invoice_number: 'R/2026/00001', debtor_id: 'deb-seed-1',
      order_id: null, tenant_id: 'tenant-1', issue_date: '2026-03-01', due_date: '2026-03-31',
      net_amount_cents: 10000, tax_amount_cents: 1900, total_amount_cents: 11900,
      paid_amount_cents: 0, tax_rate: 19, status: 'sent', currency: 'EUR',
      notes: 'Beratung', created_by: 'user-1', created_at: now, updated_at: now,
    });
    this.invoices.set('inv-seed-2', {
      id: 'inv-seed-2', invoice_number: 'R/2026/00002', debtor_id: 'deb-seed-2',
      order_id: null, tenant_id: 'tenant-1', issue_date: '2026-04-01', due_date: '2026-04-30',
      net_amount_cents: 20000, tax_amount_cents: 3800, total_amount_cents: 23800,
      paid_amount_cents: 23800, tax_rate: 19, status: 'paid', currency: 'EUR',
      notes: null, created_by: 'user-1', created_at: now, updated_at: now,
    });
    this.invoices.set('inv-seed-3', {
      id: 'inv-seed-3', invoice_number: 'R/2026/00003', debtor_id: 'deb-seed-1',
      order_id: null, tenant_id: 'tenant-1', issue_date: '2026-04-10', due_date: '2025-01-01',
      net_amount_cents: 5000, tax_amount_cents: 950, total_amount_cents: 5950,
      paid_amount_cents: 0, tax_rate: 19, status: 'sent', currency: 'EUR',
      notes: 'Draft note', created_by: 'user-1', created_at: now, updated_at: now,
    });

    this.invoiceItems.set('item-seed-1', {
      id: 'item-seed-1', invoice_id: 'inv-seed-1', line_number: 1,
      service_description: 'Beratung Stunde 1', quantity: 1, unit: 'h',
      unit_price_cents: 10000, net_amount_cents: 10000, tax_rate: 19,
      tax_amount_cents: 1900, sort_order: 0, created_at: now,
    });
    this.invoiceItems.set('item-seed-2', {
      id: 'item-seed-2', invoice_id: 'inv-seed-2', line_number: 1,
      service_description: 'Entwicklung', quantity: 2, unit: 'h',
      unit_price_cents: 10000, net_amount_cents: 20000, tax_rate: 19,
      tax_amount_cents: 3800, sort_order: 0, created_at: now,
    });

    this.payments.set('pay-seed-1', {
      id: 'pay-seed-1', invoice_id: 'inv-seed-2', tenant_id: 'tenant-1',
      payment_date: '2026-04-15', amount_cents: 23800, payment_method: 'bank_transfer',
      created_by: 'user-1', created_at: now,
    });
  }
}

const db = new InMemoryDB();

// ============================================
// Build In-Memory Query Builder
// ============================================

function buildQueryBuilder(tableName: string) {
  let filteredData: any[] = [];
  let appliedEq: { field: string; value: any } | null = null;
  let appliedIn: { field: string; values: any[] } | null = null;
  let appliedGte: { field: string; value: any } | null = null;
  let appliedLte: { field: string; value: any } | null = null;
  let appliedOrder: { field: string; ascending: boolean } | null = null;
  let appliedOr: string | null = null;

  function getTableData(): any[] {
    switch (tableName) {
      case 'invoices': return Array.from(db.invoices.values());
      case 'invoice_items': return Array.from(db.invoiceItems.values());
      case 'payments': return Array.from(db.payments.values());
      case 'debtors': return Array.from(db.debtors.values());
      default: return [];
    }
  }

  const builder: any = {
    select: (_fields?: string) => builder,
    eq: (field: string, value: any) => {
      appliedEq = { field, value };
      if (field === 'id') {
        filteredData = [getTableData().find(r => r.id === value)].filter(Boolean);
      } else if (field === 'invoice_id') {
        filteredData = getTableData().filter(r => r.invoice_id === value);
      } else {
        filteredData = getTableData().filter(r => (r as any)[field] === value);
      }
      return builder;
    },
    in: (field: string, values: any[]) => {
      appliedIn = { field, values };
      filteredData = getTableData().filter(r => values.includes((r as any)[field]));
      return builder;
    },
    gte: (field: string, value: any) => {
      appliedGte = { field, value };
      filteredData = getTableData().filter(r => (r as any)[field] >= value);
      return builder;
    },
    lte: (field: string, value: any) => {
      appliedLte = { field, value };
      filteredData = getTableData().filter(r => (r as any)[field] <= value);
      return builder;
    },
    or: (condition: string) => {
      appliedOr = condition;
      const parts = condition.split(',');
      const patterns = parts.map((p: string) => {
        const match = p.match(/(\w+)\.ilike\.%(.+)%/);
        return match ? { field: match[1], pattern: match[2].toLowerCase() } : null;
      }).filter(Boolean);
      filteredData = getTableData().filter((r: any) =>
        patterns.some((p: any) => p && r[p.field]?.toLowerCase().includes(p.pattern))
      );
      return builder;
    },
    order: (field: string, options?: { ascending: boolean }) => {
      appliedOrder = { field, ascending: options?.ascending ?? true };
      filteredData = [...filteredData].sort((a: any, b: any) => {
        const aVal = a[field];
        const bVal = b[field];
        return appliedOrder!.ascending ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      });
      return builder;
    },
    limit: (n: number) => {
      filteredData = filteredData.slice(0, n);
      return builder;
    },
    single: () => Promise.resolve({
      data: filteredData[0] || null,
      error: filteredData.length > 1 ? new Error('More than one result') : (filteredData.length === 0 ? new Error('Not found') : null),
    }),
    then: (resolve: Function) => resolve({ data: filteredData, error: null }),
  };

  return builder;
}

// ============================================
// Create Mock Supabase Factory
// ============================================

function createMockSupabase() {
  return {
    from: vi.fn((table: string) => {
      const builder = buildQueryBuilder(table);

      const insert = vi.fn().mockImplementation((data: any) => {
        const now = new Date().toISOString();

        if (table === 'invoices') {
          const id = `inv-${++db.invoiceCounter}`;
          const newInvoice: StoredInvoice = {
            id, invoice_number: data.invoice_number || 'R/NEW', debtor_id: data.debtor_id || null,
            order_id: data.order_id || null, tenant_id: data.tenant_id || null,
            issue_date: data.issue_date, due_date: data.due_date,
            net_amount_cents: data.net_amount_cents, tax_amount_cents: data.tax_amount_cents,
            total_amount_cents: data.total_amount_cents, paid_amount_cents: data.paid_amount_cents || 0,
            tax_rate: data.tax_rate, status: data.status || 'draft', currency: data.currency || 'EUR',
            notes: data.notes || null, created_by: data.created_by || null,
            created_at: now, updated_at: now,
          };
          db.invoices.set(id, newInvoice);
          return {
            select: () => ({ returnThis: null, single: () => Promise.resolve({ data: newInvoice, error: null }) }),
          };
        }

        if (table === 'invoice_items') {
          const id = `item-${++db.itemCounter}`;
          const newItem: StoredInvoiceItem = {
            id, invoice_id: data.invoice_id, line_number: data.line_number || 1,
            service_description: data.service_description, quantity: data.quantity,
            unit: data.unit || 'h', unit_price_cents: data.unit_price_cents,
            net_amount_cents: data.net_amount_cents, tax_rate: data.tax_rate,
            tax_amount_cents: data.tax_amount_cents, sort_order: data.sort_order || 0, created_at: now,
          };
          db.invoiceItems.set(id, newItem);
          return { select: () => ({ single: () => Promise.resolve({ data: newItem, error: null }) }) };
        }

        if (table === 'payments') {
          const id = `pay-${++db.paymentCounter}`;
          db.payments.set(id, {
            id, invoice_id: data.invoice_id, tenant_id: data.tenant_id || null,
            payment_date: data.payment_date, amount_cents: data.amount_cents,
            payment_method: data.payment_method || 'bank_transfer',
            created_by: data.created_by || null, created_at: now,
          });
          return Promise.resolve({ data: null, error: null });
        }

        if (table === 'debtors') {
          const id = `deb-${++db.debtorCounter}`;
          db.debtors.set(id, {
            id, tenant_id: data.tenant_id || null, customer_id: data.customer_id || null,
            billing_name: data.billing_name || null, billing_country: data.billing_country || 'DE', created_at: now,
          });
          return { select: () => ({ single: () => Promise.resolve({ data: db.debtors.get(id), error: null }) }) };
        }

        return { select: () => builder };
      });

      const update = vi.fn().mockImplementation((data: any) => {
        if (table === 'invoices' && appliedEq?.field === 'id') {
          const existing = db.invoices.get(appliedEq.value);
          if (existing) {
            db.invoices.set(appliedEq.value, { ...existing, ...data, updated_at: new Date().toISOString() });
          }
        }
        return {
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const delete_fn = vi.fn().mockImplementation(() => {
        if (table === 'invoices' && appliedEq?.field === 'id') db.invoices.delete(appliedEq.value);
        if (table === 'invoice_items' && appliedEq?.field === 'id') db.invoiceItems.delete(appliedEq.value);
        return { eq: vi.fn().mockResolvedValue({ data: null, error: null }) };
      });

      return {
        select: builder.select, insert, update, delete: delete_fn,
        eq: builder.eq, in: builder.in, gte: builder.gte, lte: builder.lte,
        or: builder.or, order: builder.order, limit: builder.limit,
        single: builder.single, then: builder.then,
      };
    }),
    rpc: vi.fn().mockResolvedValue({ data: 'R/2026/99999', error: null }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com' } }, error: null }) },
  };
}

// ============================================
// Mock Supabase (hoisted by Vitest)
// ============================================

const mockSupabase = vi.hoisted(() => {
  return {
    from: vi.fn((table: string) => {
      const builder = buildQueryBuilder(table);

      const insert = vi.fn().mockImplementation((data: any) => {
        const now = new Date().toISOString();

        if (table === 'invoices') {
          const id = 'inv-' + (++db.invoiceCounter);
          const newInvoice: StoredInvoice = {
            id, invoice_number: data.invoice_number || 'R/NEW', debtor_id: data.debtor_id || null,
            order_id: data.order_id || null, tenant_id: data.tenant_id || null,
            issue_date: data.issue_date, due_date: data.due_date,
            net_amount_cents: data.net_amount_cents, tax_amount_cents: data.tax_amount_cents,
            total_amount_cents: data.total_amount_cents, paid_amount_cents: data.paid_amount_cents || 0,
            tax_rate: data.tax_rate, status: data.status || 'draft', currency: data.currency || 'EUR',
            notes: data.notes || null, created_by: data.created_by || null,
            created_at: now, updated_at: now,
          };
          db.invoices.set(id, newInvoice);
          return {
            select: () => ({ returnThis: null, single: () => Promise.resolve({ data: newInvoice, error: null }) }),
          };
        }

        if (table === 'invoice_items') {
          const id = 'item-' + (++db.itemCounter);
          const newItem: StoredInvoiceItem = {
            id, invoice_id: data.invoice_id, line_number: data.line_number || 1,
            service_description: data.service_description, quantity: data.quantity,
            unit: data.unit || 'h', unit_price_cents: data.unit_price_cents,
            net_amount_cents: data.net_amount_cents, tax_rate: data.tax_rate,
            tax_amount_cents: data.tax_amount_cents, sort_order: data.sort_order || 0, created_at: now,
          };
          db.invoiceItems.set(id, newItem);
          return { select: () => ({ single: () => Promise.resolve({ data: newItem, error: null }) }) };
        }
        if (table === 'payments') {
          const id = 'pay-' + (++db.paymentCounter);
          db.payments.set(id, {
            id, invoice_id: data.invoice_id, tenant_id: data.tenant_id || null,
            payment_date: data.payment_date, amount_cents: data.amount_cents,
            payment_method: data.payment_method || 'bank_transfer',
            created_by: data.created_by || null, created_at: now,
          });
          return Promise.resolve({ data: null, error: null });
        }

        if (table === 'debtors') {
          const id = 'deb-' + (++db.debtorCounter);
          db.debtors.set(id, {
            id, tenant_id: data.tenant_id || null, customer_id: data.customer_id || null,
            billing_name: data.billing_name || null, billing_country: data.billing_country || 'DE', created_at: now,
          });
          return { select: () => ({ single: () => Promise.resolve({ data: db.debtors.get(id), error: null }) }) };
        }

        return { select: () => builder };
      });

      const update = vi.fn().mockImplementation((data: any) => {
        if (table === 'invoices' && appliedEq?.field === 'id') {
          const existing = db.invoices.get(appliedEq.value);
          if (existing) {
            db.invoices.set(appliedEq.value, { ...existing, ...data, updated_at: new Date().toISOString() });
          }
        }
        return {
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const delete_fn = vi.fn().mockImplementation(() => {
        if (table === 'invoices' && appliedEq?.field === 'id') db.invoices.delete(appliedEq.value);
        if (table === 'invoice_items' && appliedEq?.field === 'id') db.invoiceItems.delete(appliedEq.value);
        return { eq: vi.fn().mockResolvedValue({ data: null, error: null }) };
      });

      return {
        select: builder.select, insert, update, delete: delete_fn,
        eq: builder.eq, in: builder.in, gte: builder.gte, lte: builder.lte,
        or: builder.or, order: builder.order, limit: builder.limit,
        single: builder.single, then: builder.then,
      };
    }),
    rpc: vi.fn().mockResolvedValue({ data: 'R/2026/99999', error: null }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com' } }, error: null }) },
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockSupabase,
  createClient: () => mockSupabase,
}));

// ============================================
// Import after mocks
// ============================================

import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  addInvoiceItem,
  updateInvoiceItem,
  deleteInvoiceItem,
  recordPayment,
  getPaymentsForInvoice,
  getDebtors,
  getInvoiceStats,
  formatCurrency,
} from './invoice-service';

import type { CreateInvoiceData } from './types';

// ============================================
// Integration Tests
// ============================================

describe('Invoice CRUD Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.seedTestData();
  });

  // ---- Create ----

  describe('Create Invoice', () => {
    it('should create a new invoice with items', async () => {
      const input: CreateInvoiceData = {
        debtor_id: 'deb-seed-1', due_date: '2026-05-31', issue_date: '2026-05-01', tax_rate: 19,
        items: [{
          service_description: 'Softwareentwicklung', quantity: 10, unit: 'h',
          unit_price_cents: 12000, tax_rate: 19, sort_order: 0, service_date: '2026-05-01',
        }],
      };

      const result = await createInvoice(input, 'user-1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.net_amount_cents).toBe(120000);
      expect(result.data!.tax_amount_cents).toBe(22800);
      expect(result.data!.total_amount_cents).toBe(142800);
    });

    it('should create invoice without items', async () => {
      const input: CreateInvoiceData = { debtor_id: 'deb-seed-1', due_date: '2026-05-31', items: [] };

      const result = await createInvoice(input, 'user-1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.data!.net_amount_cents).toBe(0);
    });

    it('should calculate multiple line items correctly', async () => {
      const input: CreateInvoiceData = {
        debtor_id: 'deb-seed-1', due_date: '2026-05-31', tax_rate: 19,
        items: [
          { service_description: 'Beratung', quantity: 5, unit: 'h', unit_price_cents: 10000, tax_rate: 19, sort_order: 0, service_date: null },
          { service_description: 'Fahrtkosten', quantity: 1, unit: 'pau', unit_price_cents: 5000, tax_rate: 19, sort_order: 1, service_date: null },
        ],
      };

      const result = await createInvoice(input, 'user-1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.data!.net_amount_cents).toBe(55000);
      expect(result.data!.tax_amount_cents).toBe(10450);
    });
  });

  // ---- Read ----

  describe('Read Invoices', () => {
    it('should fetch all invoices', async () => {
      const result = await getInvoices();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });

    it('should fetch invoices filtered by status', async () => {
      const result = await getInvoices({ status: 'sent' });
      expect(result.success).toBe(true);
      result.data!.forEach(inv => {
        expect(['sent', 'overdue']).toContain(inv.status);
      });
    });

    it('should fetch invoices filtered by debtor', async () => {
      const result = await getInvoices({ debtor_id: 'deb-seed-1' });
      expect(result.success).toBe(true);
      result.data!.forEach(inv => expect(inv.debtor_id).toBe('deb-seed-1'));
    });

    it('should fetch invoices filtered by date range', async () => {
      const result = await getInvoices({ date_from: '2026-03-01', date_to: '2026-03-31' });
      expect(result.success).toBe(true);
      result.data!.forEach(inv => {
        expect(inv.issue_date >= '2026-03-01' && inv.issue_date <= '2026-03-31').toBe(true);
      });
    });

    it('should search invoices by invoice number', async () => {
      const result = await getInvoices({ search: '00001' });
      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('should fetch single invoice by ID', async () => {
      const result = await getInvoiceById('inv-seed-1');
      expect(result.success).toBe(true);
      expect(result.data!.invoice_number).toBe('R/2026/00001');
    });

    it('should return error for nonexistent invoice', async () => {
      const result = await getInvoiceById('nonexistent');
      expect(result.success).toBe(false);
    });

    it('should mark overdue invoices correctly', async () => {
      const result = await getInvoices();
      const overdueInv = result.data!.find(inv => inv.id === 'inv-seed-3');
      expect(overdueInv!.status).toBe('overdue');
    });
  });

  // ---- Update ----

  describe('Update Invoice', () => {
    it('should update invoice notes', async () => {
      const result = await updateInvoice('inv-seed-1', { notes: 'Updated notes' });
      expect(result.success).toBe(true);
      expect(result.data!.notes).toBe('Updated notes');
    });

    it('should update invoice status', async () => {
      const result = await updateInvoiceStatus('inv-seed-1', 'paid');
      expect(result.success).toBe(true);
    });

    it('should return error when updating nonexistent invoice', async () => {
      const result = await updateInvoice('nonexistent', { notes: 'New' });
      expect(result.success).toBe(false);
    });
  });

  // ---- Delete ----

  describe('Delete Invoice', () => {
    it('should delete an invoice', async () => {
      const result = await deleteInvoice('inv-seed-1');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Rechnung erfolgreich gelöscht.');
    });

    it('should return error when deleting nonexistent invoice', async () => {
      const result = await deleteInvoice('nonexistent');
      expect(result.success).toBe(false);
    });
  });

  // ---- Payments ----

  describe('Payment Recording', () => {
    it('should record partial payment', async () => {
      const result = await recordPayment('inv-seed-1', {
        amount_cents: 5000, payment_date: '2026-04-15', payment_method: 'bank_transfer',
      });
      expect(result.success).toBe(true);
    });

    it('should return error when invoice not found', async () => {
      const result = await recordPayment('nonexistent', { amount_cents: 1000 });
      expect(result.success).toBe(false);
    });

    it('should fetch payments for invoice', async () => {
      const result = await getPaymentsForInvoice('inv-seed-2');
      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });
  });

  // ---- Invoice Items ----

  describe('Invoice Items', () => {
    it('should add item to invoice', async () => {
      const result = await addInvoiceItem('inv-seed-1', {
        service_description: 'Zusätzliche Beratung', quantity: 2, unit: 'h',
        unit_price_cents: 10000, tax_rate: 19, sort_order: 0, service_date: null,
      });
      expect(result.success).toBe(true);
      expect(result.data!.service_description).toBe('Zusätzliche Beratung');
    });

    it('should update invoice item', async () => {
      const result = await updateInvoiceItem('item-seed-1', { quantity: 5, service_description: 'Updated service' });
      expect(result.success).toBe(true);
      expect(result.data!.quantity).toBe(5);
    });

    it('should delete invoice item', async () => {
      const result = await deleteInvoiceItem('item-seed-1');
      expect(result.success).toBe(true);
    });
  });

  // ---- Debtors ----

  describe('Debtors', () => {
    it('should fetch all debtors', async () => {
      const result = await getDebtors();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should sort debtors by billing_name', async () => {
      const result = await getDebtors();
      const names = result.data!.map(d => d.billing_name);
      expect(names).toEqual(['Mustermann GmbH', 'Test AG']);
    });
  });

  // ---- Stats ----

  describe('Invoice Stats', () => {
    it('should return invoice statistics', async () => {
      const result = await getInvoiceStats();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.currency).toBe('EUR');
    });
  });

  // ---- Currency Formatting ----

  describe('Currency Formatting', () => {
    it('should format invoice amounts correctly', () => {
      expect(formatCurrency(11900)).toContain('119');
    });
  });
});
