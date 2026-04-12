import { describe, it, expect, vi } from 'vitest';
const mockSupabase = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockSupabase,
  createClient: () => mockSupabase,
}));
// Test relative import
import { getInvoices, createInvoice, updateInvoice } from '../invoicing/invoice-service';
console.log('getInvoices:', typeof getInvoices, 'createInvoice:', typeof createInvoice, 'updateInvoice:', typeof updateInvoice);
describe('relative import test', () => {
  it('should import service functions', () => {
    expect(typeof getInvoices).toBe('function');
    expect(typeof createInvoice).toBe('function');
    expect(typeof updateInvoice).toBe('function');
  });
});
