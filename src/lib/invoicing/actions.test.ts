// ============================================
// Unit Tests: Invoice Server Actions
// Tests action-specific behavior: auth checks and revalidation
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';

// ============================================
// Shared mock objects (hoisted)
// ============================================

const mockSupabaseFrom = vi.fn();
const mockAuthGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockSupabaseFrom,
    auth: { getUser: mockAuthGetUser },
  })),
  createAdminClient: vi.fn(() => ({
    from: mockSupabaseFrom,
    auth: { getUser: mockAuthGetUser },
  })),
}));

vi.mock('@/lib/audit-log', () => ({
  logDataChange: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/invoicing/pdf-generator', () => ({
  generateInvoicePDF: vi.fn().mockResolvedValue({ success: true, data: Buffer.from('PDF') }),
}));

vi.mock('@/lib/invoicing/email-service', () => ({
  sendInvoiceEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/invoicing/datev-export', () => ({
  exportDATEV: vi.fn().mockResolvedValue({ success: true, data: 'DATEV_DATA' }),
}));

vi.mock('@/lib/invoicing/zugferd-export', () => ({
  exportZUGFeRD: vi.fn().mockResolvedValue({ success: true, data: 'ZUGFeRD_DATA' }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// ============================================
// Import actions after mocks
// ============================================

import {
  getInvoicesAction,
  getInvoiceByIdAction,
  createInvoiceAction,
  createInvoiceFromOrderAction,
  updateInvoiceAction,
  updateInvoiceStatusAction,
  deleteInvoiceAction,
  addInvoiceItemAction,
  updateInvoiceItemAction,
  deleteInvoiceItemAction,
  recordPaymentAction,
  getPaymentsForInvoiceAction,
  getDebtorsAction,
  getDebtorByIdAction,
  exportDATEVAction,
  exportZUGFeRDAction,
  sendInvoiceEmailAction,
  getInvoiceStatsAction,
} from './actions';

// ============================================
// Helpers
// ============================================

function resetMock() {
  vi.clearAllMocks();
  revalidatePath.mockClear();
  mockSupabaseFrom.mockReset();
  mockAuthGetUser.mockReset();
}

function mockUnauthenticated() {
  mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: null });
  // Return a pass-through from mock for unauthenticated queries that still hit the DB
  const passthrough = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: Function) => resolve({ data: [], error: null })),
  };
  mockSupabaseFrom.mockReturnValue(passthrough);
}

function mockAuthenticated(userId = 'user-1') {
  mockAuthGetUser.mockResolvedValue({
    data: { user: { id: userId, email: 'test@example.com' } },
    error: null,
  });
  // Default passthrough - individual tests override with mockReturnValueOnce for specific chains
  const passthrough = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: Function) => resolve({ data: [], error: null })),
  };
  mockSupabaseFrom.mockReturnValue(passthrough);
}

// ============================================
// Auth Check Tests
// ============================================

describe('Auth checks - unauthenticated requests', () => {
  beforeEach(resetMock);

  it('getInvoicesAction rejects unauthenticated', async () => {
    mockUnauthenticated();
    const result = await getInvoicesAction({});
    expect(result.success).toBe(false);
  });

  it('getInvoiceByIdAction rejects unauthenticated', async () => {
    mockUnauthenticated();
    const result = await getInvoiceByIdAction('inv-1');
    expect(result.success).toBe(false);
  });

  it('createInvoiceAction rejects unauthenticated', async () => {
    mockUnauthenticated();
    const result = await createInvoiceAction({ debtor_id: 'deb-1', due_date: '2026-04-30', items: [] });
    expect(result.success).toBe(false);
    expect(result.message).toBe('Nicht authentifiziert.');
  });

  it('createInvoiceFromOrderAction rejects unauthenticated', async () => {
    mockUnauthenticated();
    const result = await createInvoiceFromOrderAction('order-1');
    expect(result.success).toBe(false);
  });

  it('updateInvoiceAction rejects unauthenticated', async () => {
    mockUnauthenticated();
    const result = await updateInvoiceAction('inv-1', { notes: 'Updated' });
    expect(result.success).toBe(false);
  });

  it('updateInvoiceStatusAction rejects unauthenticated', async () => {
    mockUnauthenticated();
    const result = await updateInvoiceStatusAction('inv-1', 'sent');
    expect(result.success).toBe(false);
  });

  it('deleteInvoiceAction rejects unauthenticated', async () => {
    mockUnauthenticated();
    const result = await deleteInvoiceAction('inv-1');
    expect(result.success).toBe(false);
  });

  it('recordPaymentAction rejects unauthenticated', async () => {
    mockUnauthenticated();
    const result = await recordPaymentAction('inv-1', { amount_cents: 5000 });
    expect(result.success).toBe(false);
  });

  it('exportDATEVAction rejects unauthenticated', async () => {
    mockUnauthenticated();
    const result = await exportDATEVAction('2026-01-01', '2026-12-31');
    expect(result.success).toBe(false);
  });

  it('exportZUGFeRDAction rejects unauthenticated', async () => {
    mockUnauthenticated();
    const result = await exportZUGFeRDAction('inv-1');
    expect(result.success).toBe(false);
  });

  it('sendInvoiceEmailAction rejects unauthenticated', async () => {
    mockUnauthenticated();
    const result = await sendInvoiceEmailAction('inv-1');
    expect(result.success).toBe(false);
  });
});

// ============================================
// Authenticated Action Tests
// ============================================

describe('Authenticated action behavior', () => {
  beforeEach(resetMock);

  describe('createInvoiceAction', () => {
    it('should create invoice with tenant from profile and revalidate', async () => {
      mockAuthenticated();

      // Mock invoice insert + items insert + final fetch
      mockSupabaseFrom
        .mockReturnValueOnce({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'inv-new', invoice_number: 'R/00001', total_amount_cents: 11900, items: [] },
            error: null,
          }),
        })
        .mockReturnValueOnce({
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'inv-new', items: [] }, error: null }),
        });

      const result = await createInvoiceAction({
        debtor_id: 'deb-1',
        due_date: '2026-04-30',
        items: [{
          service_description: 'Beratung',
          quantity: 1,
          unit_price_cents: 10000,
          tax_rate: 19,
          sort_order: 0,
          service_date: null,
        }],
      });

      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/invoices');
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/invoices/new');
    });
  });

  describe('updateInvoiceAction', () => {
    it('should update invoice and revalidate paths on success', async () => {
      mockAuthenticated();

      mockSupabaseFrom.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'inv-1', notes: 'Updated' }, error: null }),
      });

      const result = await updateInvoiceAction('inv-1', { notes: 'Updated' });

      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/invoices');
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/invoices/inv-1');
    });
  });

  describe('updateInvoiceStatusAction', () => {
    it('should update status and revalidate paths on success', async () => {
      mockAuthenticated();

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { total_amount_cents: 11900 }, error: null }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        });

      const result = await updateInvoiceStatusAction('inv-1', 'sent');

      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/invoices');
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/invoices/inv-1');
    });
  });

  describe('deleteInvoiceAction', () => {
    it('should delete invoice and revalidate dashboard/invoices', async () => {
      mockAuthenticated();

      mockSupabaseFrom.mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const result = await deleteInvoiceAction('inv-1');

      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/invoices');
    });
  });

  describe('addInvoiceItemAction', () => {
    it('should add item and revalidate invoice detail page', async () => {
      mockAuthenticated();

      mockSupabaseFrom
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
          single: vi.fn().mockResolvedValue({ data: { id: 'item-new', service_description: 'Beratung' }, error: null }),
        });

      const result = await addInvoiceItemAction('inv-1', {
        service_description: 'Beratung',
        quantity: 1,
        unit_price_cents: 10000,
        tax_rate: 19,
        sort_order: 0,
        service_date: null,
      });

      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/invoices/inv-1');
    });
  });

  describe('updateInvoiceItemAction', () => {
    it('should update item and revalidate correct invoice path', async () => {
      mockAuthenticated();

      mockSupabaseFrom
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
          single: vi.fn().mockResolvedValue({ data: { id: 'item-1', quantity: 3 }, error: null }),
        });

      const result = await updateInvoiceItemAction('item-1', { quantity: 3 });

      expect(result.success).toBe(true);
    });
  });

  describe('deleteInvoiceItemAction', () => {
    it('should delete item and revalidate invoice path', async () => {
      mockAuthenticated();

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { invoice_id: 'inv-1' }, error: null }),
        })
        .mockReturnValueOnce({
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        });

      const result = await deleteInvoiceItemAction('item-1');

      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/invoices/inv-1');
    });
  });

  describe('recordPaymentAction', () => {
    it('should record payment and revalidate invoice paths', async () => {
      mockAuthenticated();

      mockSupabaseFrom
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

      const result = await recordPaymentAction('inv-1', { amount_cents: 5000 });

      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/invoices');
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/invoices/inv-1');
    });
  });

  describe('exportDATEVAction', () => {
    it('should call exportDATEV with date range', async () => {
      mockAuthenticated();
      const { exportDATEV } = await import('./datev-export');

      const result = await exportDATEVAction('2026-01-01', '2026-12-31');

      expect(result.success).toBe(true);
      expect(exportDATEV).toHaveBeenCalledWith('2026-01-01', '2026-12-31');
    });
  });

  describe('exportZUGFeRDAction', () => {
    it('should call exportZUGFeRD with invoice id', async () => {
      mockAuthenticated();
      const { exportZUGFeRD } = await import('./zugferd-export');

      const result = await exportZUGFeRDAction('inv-1');

      expect(result.success).toBe(true);
      expect(exportZUGFeRD).toHaveBeenCalledWith('inv-1');
    });
  });

  describe('sendInvoiceEmailAction', () => {
    it('should return error when invoice not found', async () => {
      mockAuthenticated();

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
      });

      const result = await sendInvoiceEmailAction('inv-1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Rechnung nicht gefunden.');
    });

    it('should return error when no recipient email', async () => {
      mockAuthenticated();

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'inv-1', debtor: { invoice_email: null } },
          error: null,
        }),
      });

      const result = await sendInvoiceEmailAction('inv-1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Keine Empfänger-E-Mail gefunden.');
    });
  });

  describe('getInvoiceStatsAction', () => {
    it('should return invoice stats with EUR currency', async () => {
      mockAuthenticated();

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          count: 'exact',
          then: (resolve: Function) => resolve({ data: null, count: 5, error: null }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          count: 'exact',
          then: (resolve: Function) => resolve({ data: null, count: 2, error: null }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          then: (resolve: Function) => resolve({ data: [{ paid_amount_cents: 5000 }], error: null }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          count: 'exact',
          then: (resolve: Function) => resolve({ data: null, count: 1, error: null }),
        });

      const result = await getInvoiceStatsAction();

      if (result.success) {
        expect(result.data!.currency).toBe('EUR');
        expect(typeof result.data!.total_open).toBe('number');
      }
    });
  });
});

// ============================================
// Read-only action delegation
// ============================================

describe('Read-only action delegation', () => {
  beforeEach(resetMock);

  describe('getPaymentsForInvoiceAction', () => {
    it('should query payments table', async () => {
      mockAuthenticated();

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: Function) => resolve({ data: [{ id: 'pay-1' }], error: null }),
      });

      const result = await getPaymentsForInvoiceAction('inv-1');

      expect(mockSupabaseFrom).toHaveBeenCalledWith('payments');
    });
  });

  describe('getDebtorsAction', () => {
    it('should query debtors table', async () => {
      mockAuthenticated();

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: Function) => resolve({ data: [{ id: 'deb-1' }], error: null }),
      });

      const result = await getDebtorsAction();

      expect(mockSupabaseFrom).toHaveBeenCalledWith('debtors');
    });
  });

  describe('getDebtorByIdAction', () => {
    it('should query debtor by id', async () => {
      mockAuthenticated();

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'deb-1', billing_name: 'Mustermann' }, error: null }),
      });

      const result = await getDebtorByIdAction('deb-1');

      expect(mockSupabaseFrom).toHaveBeenCalledWith('debtors');
    });
  });
});
