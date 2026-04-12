import { describe, it, expect, vi } from 'vitest';
const mockSupabase = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockSupabase,
  createClient: () => mockSupabase,
}));
import { getInvoices } from '@/lib/invoicing/invoice-service';
console.log('getInvoices type:', typeof getInvoices);
describe('simple', () => {
  it('should work', () => {
    expect(typeof getInvoices).toBe('function');
  });
});
