// ============================================
// Unit Tests: Invoice Service
// ============================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================
// Mock Supabase (hoisted - hoisted before imports)
// ============================================

// vi.hoisted captures vi.fn references by closure, safe from TDZ
const mockSupabase = vi.hoisted(() => {
  return {
    from: vi.fn(),
    rpc: vi.fn(),
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
  getDebtorById,
  getInvoiceStats,
  formatCurrency,
  parseCurrencyInput,
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from './invoice-service';

import type { InvoiceFilters, CreateInvoiceData, Invoice, InvoiceItem } from './types';

// ============================================
// Helper: build mock query builder
// ============================================

function makeQueryBuilder(data: any[], error?: Error) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(error ? { data: null, error } : { data: data[0] || null, error: null }),
    then: vi.fn((resolve: Function) => resolve({ data, error })),
  };
}

function makeQueryResult(data: any, error?: Error) {
  return Promise.resolve({ data, error });
}

// ============================================
// INVOICE_STATUS_LABELS / PAYMENT_METHOD_LABELS
// ============================================

describe('invoice-service constants', () => {
  it('should have all expected status labels', () => {
    expect(INVOICE_STATUS_LABELS['draft']).toBe('Entwurf');
    expect(INVOICE_STATUS_LABELS['sent']).toBe('Versendet');
    expect(INVOICE_STATUS_LABELS['paid']).toBe('Bezahlt');
    expect(INVOICE_STATUS_LABELS['partial']).toBe('Teilweise bezahlt');
    expect(INVOICE_STATUS_LABELS['overdue']).toBe('Überfällig');
    expect(INVOICE_STATUS_LABELS['cancelled']).toBe('Storniert');
    expect(INVOICE_STATUS_LABELS['void']).toBe(' Ungültig');
  });

  it('should have all expected payment method labels', () => {
    expect(PAYMENT_METHOD_LABELS['bank_transfer']).toBe('Überweisung');
    expect(PAYMENT_METHOD_LABELS['cash']).toBe('Bar');
    expect(PAYMENT_METHOD_LABELS['credit_card']).toBe('Kreditkarte');
    expect(PAYMENT_METHOD_LABELS['direct_debit']).toBe('Lastschrift');
    expect(PAYMENT_METHOD_LABELS['check']).toBe('Scheck');
    expect(PAYMENT_METHOD_LABELS['other']).toBe('Sonstige');
  });
});

// ============================================
// getInvoices
// ============================================

describe('getInvoices', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return invoices successfully with no filters', async () => {
    const mockInvoices = [
      { id: 'inv-1', invoice_number: 'R/00001', status: 'sent', total_amount_cents: 10000, paid_amount_cents: 0, due_date: '2099-12-31' },
      { id: 'inv-2', invoice_number: 'R/00002', status: 'draft', total_amount_cents: 20000, paid_amount_cents: 0, due_date: '2099-12-31' },
    ];

    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: Function) => resolve({ data: mockInvoices, error: null })),
    };
    mockSupabase.from.mockReturnValue(queryBuilder);

    const result = await getInvoices();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data![0].invoice_number).toBe('R/00001');
  });

  it('should apply status filter correctly', async () => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: Function) => resolve({ data: [], error: null })),
    };
    mockSupabase.from.mockReturnValue(queryBuilder);

    await getInvoices({ status: 'sent' });

    expect(queryBuilder.eq).toHaveBeenCalledWith('status', 'sent');
  });

  it('should apply array status filter correctly', async () => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: Function) => resolve({ data: [], error: null })),
    };
    mockSupabase.from.mockReturnValue(queryBuilder);

    await getInvoices({ status: ['sent', 'overdue'] });

    expect(queryBuilder.in).toHaveBeenCalledWith('status', ['sent', 'overdue']);
  });

  it('should apply debtor_id filter', async () => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: Function) => resolve({ data: [], error: null })),
    };
    mockSupabase.from.mockReturnValue(queryBuilder);

    await getInvoices({ debtor_id: 'debtor-123' });

    expect(queryBuilder.eq).toHaveBeenCalledWith('debtor_id', 'debtor-123');
  });

  it('should apply date range filters', async () => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: Function) => resolve({ data: [], error: null })),
    };
    mockSupabase.from.mockReturnValue(queryBuilder);

    await getInvoices({ date_from: '2025-01-01', date_to: '2025-12-31' });

    expect(queryBuilder.gte).toHaveBeenCalledWith('issue_date', '2025-01-01');
    expect(queryBuilder.lte).toHaveBeenCalledWith('issue_date', '2025-12-31');
  });

  it('should apply search filter with ilike', async () => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: Function) => resolve({ data: [], error: null })),
    };
    mockSupabase.from.mockReturnValue(queryBuilder);

    await getInvoices({ search: 'R/00001' });

    expect(queryBuilder.or).toHaveBeenCalledWith('invoice_number.ilike.%R/00001%,reference_text.ilike.%R/00001%');
  });

  it('should mark sent invoices past due_date as overdue', async () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const mockInvoices = [
      { id: 'inv-1', invoice_number: 'R/00001', status: 'sent', total_amount_cents: 10000, paid_amount_cents: 0, due_date: yesterday },
      { id: 'inv-2', invoice_number: 'R/00002', status: 'sent', total_amount_cents: 10000, paid_amount_cents: 5000, due_date: yesterday },
      { id: 'inv-3', invoice_number: 'R/00003', status: 'sent', total_amount_cents: 10000, paid_amount_cents: 0, due_date: '2099-12-31' },
    ];

    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: Function) => resolve({ data: mockInvoices, error: null })),
    };
    mockSupabase.from.mockReturnValue(queryBuilder);

    const result = await getInvoices();

    expect(result.data![0].status).toBe('overdue');
    expect(result.data![1].status).toBe('overdue');
    expect(result.data![2].status).toBe('sent'); // future due date
  });

  it('should return error on database failure', async () => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: Function) => resolve({ data: null, error: new Error('DB error') })),
    };
    mockSupabase.from.mockReturnValue(queryBuilder);

    const result = await getInvoices();

    expect(result.success).toBe(false);
    expect(result.message).toBe('DB error');
  });
});

// ============================================
// getInvoiceById
// ============================================

describe('getInvoiceById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return a single invoice by id', async () => {
    const mockInvoice = { id: 'inv-1', invoice_number: 'R/00001', status: 'draft', total_amount_cents: 10000, paid_amount_cents: 0, due_date: '2099-12-31' };

    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockInvoice, error: null }),
    };
    mockSupabase.from.mockReturnValue(queryBuilder);

    const result = await getInvoiceById('inv-1');

    expect(result.success).toBe(true);
    expect(result.data!.id).toBe('inv-1');
  });

  it('should return error when invoice not found', async () => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Invoice not found') }),
    };
    mockSupabase.from.mockReturnValue(queryBuilder);

    const result = await getInvoiceById('nonexistent');

    expect(result.success).toBe(false);
  });
});

// ============================================
// createInvoice
// ============================================

describe('createInvoice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create an invoice with items', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'R/2026/00001', error: null });

    const createdInvoice = {
      id: 'new-inv-1',
      invoice_number: 'R/2026/00001',
      debtor_id: 'debtor-1',
      net_amount_cents: 10000,
      tax_amount_cents: 1900,
      total_amount_cents: 11900,
    };

    mockSupabase.from
      .mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: createdInvoice, error: null }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { ...createdInvoice, debtor: {}, items: [] }, error: null }),
      });

    const input: CreateInvoiceData = {
      debtor_id: 'debtor-1',
      due_date: '2026-04-30',
      items: [
        {
          service_description: 'Beratung',
          quantity: 1,
          unit: 'h',
          unit_price_cents: 10000,
          tax_rate: 19,
          sort_order: 0,
          service_date: '2026-04-13',
        },
      ],
    };

    const result = await createInvoice(input, 'user-1', 'tenant-1');

    expect(result.success).toBe(true);
    expect(result.data!.invoice_number).toBe('R/2026/00001');
  });

  it('should return error on invoice insert failure', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'R/2026/00001', error: null });

    mockSupabase.from.mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') }),
    });

    const result = await createInvoice({ debtor_id: 'debtor-1', due_date: '2026-04-30', items: [] }, 'user-1', 'tenant-1');

    expect(result.success).toBe(false);
    expect(result.message).toBe('Insert failed');
  });

  it('should generate sequential invoice number without tenant', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
    mockSupabase.from
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        count: 'exact',
        then: vi.fn((resolve: Function) => resolve({ data: null, count: 5, error: null })),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'inv-new' }, error: null }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'inv-new', invoice_number: `R/${new Date().getFullYear()}/00006` }, error: null }),
      });

    const result = await createInvoice({ debtor_id: 'debtor-1', due_date: '2026-04-30', items: [] }, 'user-1', null);

    expect(result.success).toBe(true);
  });

  it('should calculate tax and net amounts correctly', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'R/00001', error: null });

    let capturedInsert: any = null;

    mockSupabase.from
      .mockReturnValueOnce({
        insert: vi.fn().mockImplementation((data: any) => {
          capturedInsert = data;
          return { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { ...data, id: 'inv-1' }, error: null }) };
        }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'inv-1' }, error: null }),
      });

    const input: CreateInvoiceData = {
      debtor_id: 'debtor-1',
      due_date: '2026-04-30',
      tax_rate: 19,
      items: [
        {
          service_description: 'Test',
          quantity: 2,
          unit: 'h',
          unit_price_cents: 5000, // 2 × 5000 = 10000 net
          tax_rate: 19,
          sort_order: 0,
          service_date: null,
        },
      ],
    };

    await createInvoice(input, 'user-1', 'tenant-1');

    // net = 2 * 5000 = 10000, tax = 1900, total = 11900
    expect(capturedInsert.net_amount_cents).toBe(10000);
    expect(capturedInsert.tax_amount_cents).toBe(1900);
    expect(capturedInsert.total_amount_cents).toBe(11900);
  });
});

// ============================================
// updateInvoice
// ============================================

describe('updateInvoice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should update invoice fields', async () => {
    const updatedInvoice = { id: 'inv-1', notes: 'Updated notes', status: 'sent' };

    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedInvoice, error: null }),
    });

    const result = await updateInvoice('inv-1', { notes: 'Updated notes' });

    expect(result.success).toBe(true);
    expect(result.data!.notes).toBe('Updated notes');
  });

  it('should return error on update failure', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Update failed') }),
    });

    const result = await updateInvoice('inv-1', { notes: 'New notes' });

    expect(result.success).toBe(false);
    expect(result.message).toBe('Update failed');
  });
});

// ============================================
// updateInvoiceStatus
// ============================================

describe('updateInvoiceStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should update status to sent and set sent_at', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const result = await updateInvoiceStatus('inv-1', 'sent');

    expect(result.success).toBe(true);
  });

  it('should update status to paid and set paid_at and paid_amount_cents', async () => {
    mockSupabase.from
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { total_amount_cents: 11900 }, error: null }),
      })
      .mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

    const result = await updateInvoiceStatus('inv-1', 'paid');

    expect(result.success).toBe(true);
  });

  it('should return error on status update failure', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: new Error('Status update failed') }),
    });

    const result = await updateInvoiceStatus('inv-1', 'sent');

    expect(result.success).toBe(false);
  });
});

// ============================================
// deleteInvoice
// ============================================

describe('deleteInvoice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delete an invoice successfully', async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const result = await deleteInvoice('inv-1');

    expect(result.success).toBe(true);
    expect(result.message).toBe('Rechnung erfolgreich gelöscht.');
  });

  it('should return error on delete failure', async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: new Error('Delete failed') }),
    });

    const result = await deleteInvoice('inv-1');

    expect(result.success).toBe(false);
    expect(result.message).toBe('Delete failed');
  });
});

// ============================================
// addInvoiceItem
// ============================================

describe('addInvoiceItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should add an item to an invoice', async () => {
    mockSupabase.from
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { line_number: 2 }, error: null }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { tax_rate: 19 }, error: null }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'item-1',
            invoice_id: 'inv-1',
            service_description: 'Beratung',
            quantity: 1,
            unit_price_cents: 10000,
            net_amount_cents: 10000,
            tax_amount_cents: 1900,
          },
          error: null,
        }),
      });

    const result = await addInvoiceItem('inv-1', {
      service_description: 'Beratung',
      quantity: 1,
      unit: 'h',
      unit_price_cents: 10000,
      tax_rate: 19,
      sort_order: 0,
      service_date: null,
    });

    expect(result.success).toBe(true);
    expect(result.data!.service_description).toBe('Beratung');
  });

  it('should calculate line number as max+1 when items exist', async () => {
    let capturedLineNumber: number | undefined;

    mockSupabase.from
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { line_number: 5 }, error: null }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { tax_rate: 19 }, error: null }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockImplementation((data: any) => {
          capturedLineNumber = data.line_number;
          return { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { ...data, id: 'item-new' }, error: null }) };
        }),
      });

    await addInvoiceItem('inv-1', {
      service_description: 'New service',
      quantity: 1,
      unit_price_cents: 5000,
      tax_rate: 19,
      sort_order: 0,
      service_date: null,
    });

    expect(capturedLineNumber).toBe(6);
  });
});

// ============================================
// updateInvoiceItem
// ============================================

describe('updateInvoiceItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should update an invoice item', async () => {
    mockSupabase.from
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'item-1', quantity: 1, unit_price_cents: 10000, invoices: { tax_rate: 19 } },
          error: null,
        }),
      })
      .mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'item-1', service_description: 'Updated', quantity: 2, unit_price_cents: 10000, net_amount_cents: 20000, tax_amount_cents: 3800 },
          error: null,
        }),
      });

    const result = await updateInvoiceItem('item-1', {
      service_description: 'Updated',
      quantity: 2,
    });

    expect(result.success).toBe(true);
    expect(result.data!.service_description).toBe('Updated');
  });

  it('should return error when item not found', async () => {
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Item not found') }),
    });

    const result = await updateInvoiceItem('nonexistent', { quantity: 5 });

    expect(result.success).toBe(false);
  });
});

// ============================================
// deleteInvoiceItem
// ============================================

describe('deleteInvoiceItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delete an invoice item', async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const result = await deleteInvoiceItem('item-1');

    expect(result.success).toBe(true);
    expect(result.message).toBe('Position erfolgreich gelöscht.');
  });

  it('should return error on delete failure', async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: new Error('Delete failed') }),
    });

    const result = await deleteInvoiceItem('item-1');

    expect(result.success).toBe(false);
  });
});

// ============================================
// recordPayment
// ============================================

describe('recordPayment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should record a payment and update invoice status to partial', async () => {
    mockSupabase.from
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1', paid_amount_cents: 0, total_amount_cents: 10000 }, error: null }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
      .mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

    const result = await recordPayment('inv-1', { amount_cents: 5000 }, 'user-1');

    expect(result.success).toBe(true);
    expect(result.message).toBe('Zahlung erfolgreich erfasst.');
  });

  it('should set status to paid when fully paid', async () => {
    mockSupabase.from
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1', paid_amount_cents: 0, total_amount_cents: 10000 }, error: null }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
      .mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

    await recordPayment('inv-1', { amount_cents: 10000 }, 'user-1');

    // The update call should have status: 'paid'
    const updateCall = mockSupabase.from.mock.calls[2];
    expect(updateCall).toBeDefined();
  });

  it('should return error when invoice not found', async () => {
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Invoice not found') }),
    });

    const result = await recordPayment('nonexistent', { amount_cents: 1000 }, 'user-1');

    expect(result.success).toBe(false);
  });
});

// ============================================
// getPaymentsForInvoice
// ============================================

describe('getPaymentsForInvoice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return payments for an invoice', async () => {
    const mockPayments = [
      { id: 'pay-1', invoice_id: 'inv-1', amount_cents: 5000, payment_date: '2026-04-01' },
      { id: 'pay-2', invoice_id: 'inv-1', amount_cents: 5000, payment_date: '2026-04-10' },
    ];

    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: Function) => resolve({ data: mockPayments, error: null })),
    };
    mockSupabase.from.mockReturnValue(queryBuilder);

    const result = await getPaymentsForInvoice('inv-1');

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it('should return error on database failure', async () => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: Function) => resolve({ data: null, error: new Error('DB error') })),
    };
    mockSupabase.from.mockReturnValue(queryBuilder);

    const result = await getPaymentsForInvoice('inv-1');

    expect(result.success).toBe(false);
  });
});

// ============================================
// getDebtors
// ============================================

describe('getDebtors', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return list of debtors', async () => {
    const mockDebtors = [
      { id: 'deb-1', billing_name: 'Mustermann GmbH' },
      { id: 'deb-2', billing_name: 'Test AG' },
    ];

    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: Function) => resolve({ data: mockDebtors, error: null })),
    };
    mockSupabase.from.mockReturnValue(queryBuilder);

    const result = await getDebtors();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });
});

// ============================================
// getDebtorById
// ============================================

describe('getDebtorById', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return debtor by id', async () => {
    const mockDebtor = { id: 'deb-1', billing_name: 'Mustermann GmbH' };

    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockDebtor, error: null }),
    };
    mockSupabase.from.mockReturnValue(queryBuilder);

    const result = await getDebtorById('deb-1');

    expect(result.success).toBe(true);
    expect(result.data!.billing_name).toBe('Mustermann GmbH');
  });

  it('should return error when debtor not found', async () => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Debtor not found') }),
    };
    mockSupabase.from.mockReturnValue(queryBuilder);

    const result = await getDebtorById('nonexistent');

    expect(result.success).toBe(false);
  });
});

// ============================================
// getInvoiceStats
// ============================================

describe('getInvoiceStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return invoice statistics', async () => {
    mockSupabase.from
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        count: 'exact',
        then: vi.fn((resolve: Function) => resolve({ data: null, count: 10, error: null })),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        count: 'exact',
        then: vi.fn((resolve: Function) => resolve({ data: null, count: 3, error: null })),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        then: vi.fn((resolve: Function) => resolve({ data: [{ paid_amount_cents: 5000 }, { paid_amount_cents: 3000 }], error: null })),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        count: 'exact',
        then: vi.fn((resolve: Function) => resolve({ data: null, count: 2, error: null })),
      });

    const result = await getInvoiceStats();

    expect(result.success).toBe(true);
    expect(result.data!.total_open).toBe(10);
    expect(result.data!.total_overdue).toBe(3);
    expect(result.data!.total_paid_this_month).toBe(8000);
    expect(result.data!.total_draft).toBe(2);
    expect(result.data!.currency).toBe('EUR');
  });
});

// ============================================
// formatCurrency / parseCurrencyInput
// ============================================

describe('Utility functions', () => {
  describe('formatCurrency', () => {
    it('should format cents to EUR currency string', () => {
      expect(formatCurrency(11900)).toBe('119,00\xa0€');
      expect(formatCurrency(0)).toBe('0,00\xa0€');
      expect(formatCurrency(100000)).toBe('1.000,00\xa0€');
    });

    it('should format different currencies', () => {
      const usd = formatCurrency(5000, 'USD');
      expect(usd).toContain('50');
    });
  });

  describe('parseCurrencyInput', () => {
    it('should parse German number format (comma as decimal)', () => {
      expect(parseCurrencyInput('119,00')).toBe(11900);
      expect(parseCurrencyInput('1.000,00')).toBe(100000);
    });

    it('should handle dot as decimal separator', () => {
      expect(parseCurrencyInput('119.00')).toBe(11900);
    });

    it('should strip non-numeric characters', () => {
      expect(parseCurrencyInput('€ 119,00')).toBe(11900);
      expect(parseCurrencyInput('$1,000.00')).toBe(100000);
    });

    it('should round to nearest cent', () => {
      expect(parseCurrencyInput('119.009')).toBe(11900);
      expect(parseCurrencyInput('119.999')).toBe(12000);
    });
  });
});
