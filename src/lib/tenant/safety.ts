/**
 * Tenant-Safe Query Builder
 * 
 * All Supabase queries MUST go through these helpers to ensure tenant isolation.
 * This is a DEFENSE-IN-DEPTH measure alongside RLS policies.
 * 
 * Usage:
 *   const { data } = await supabase
 *     .from('orders')
 *     .select('*')
 *     .tenantFilter()  // <-- Automatically adds WHERE tenant_id = currentTenant
 */

import { createClient } from '@/lib/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQuery = { eq: (col: string, val: string) => any };

/**
 * Get the current tenant ID from the user's profile
 * Returns null if user is not authenticated or has no tenant
 */
export async function getCurrentTenantId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();
  
  return profile?.tenant_id || null;
}

/**
 * Require a valid tenant context - throws if not found
 */
export async function requireTenantId(): Promise<string> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    throw new Error('TENANT_CONTEXT_REQUIRED: No tenant context found for user');
  }
  return tenantId;
}

/**
 * Assert that a record belongs to the current tenant
 * Use this when you fetch a record and need to verify it's yours
 */
export function assertRecordTenant<T extends { tenant_id?: string | null }>(
  record: T,
  tenantId: string
): void {
  if (record.tenant_id !== tenantId) {
    throw new Error('TENANT_ACCESS_DENIED: Record does not belong to current tenant');
  }
}

/**
 * Adds tenant_id filter to any query builder
 */
export function addTenantFilter<Q extends AnyQuery>(query: Q, tenantId: string): Q {
  return query.eq('tenant_id', tenantId) as Q;
}

/**
 * Wrapper for all authenticated queries
 * Use this pattern in server actions and API routes:
 * 
 * ```ts
 * async function getOrders() {
 *   const tenantId = await requireTenantId();
 *   return tenantScopedQuery('orders', tenantId).select('*');
 * }
 * ```
 */
// Note: tenant_id must be added at insert time via addTenantToPayload
export async function tenantScopedQuery(tableName: string) {
  const tenantId = await requireTenantId();
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.from(tableName) as any).eq('tenant_id', tenantId);
}

/**
 * Decorator-style helper for server actions
 * Automatically injects tenant_id into insert/update data
 * 
 * ```ts
 * async function createOrder(data: InsertPayload<Orders>) {
 *   const tid = await requireTenantId();
 *   return supabase.from('orders').insert(addTenantToPayload(data, tid));
 * }
 * ```
 */
export function addTenantToPayload<T extends Record<string, unknown>>(
  payload: T,
  tenantId: string
): T & { tenant_id: string } {
  return {
    ...payload,
    tenant_id: tenantId,
  };
}
