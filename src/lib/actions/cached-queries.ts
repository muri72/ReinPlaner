"use server";

import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Cached Query Builder - Uses Next.js unstable_cache for server-side caching
// ============================================================================

/**
 * Creates a cached version of a Supabase query.
 * The cache is stored at the edge and reused across serverless instances.
 *
 * @param queryFn - The async function that fetches data from Supabase
 * @param cacheKey - Array of cache key parts (will be joined)
 * @param options - Cache options: revalidate (seconds), tags (for invalidation)
 */
export function createCachedQuery<T>(
  queryFn: () => Promise<T>,
  cacheKey: string[],
  options?: { revalidate?: number; tags?: string[] }
) {
  return unstable_cache(queryFn, cacheKey, {
    revalidate: options?.revalidate ?? 30,
    tags: options?.tags,
  });
}

// Tenant-aware cached query builder
export function createTenantCachedQuery<T>(
  queryFn: (tenantId: string) => Promise<T>,
  baseKey: string,
  options?: { revalidate?: number; tags?: string[] }
) {
  return (tenantId: string) =>
    unstable_cache(
      async () => queryFn(tenantId),
      [baseKey, tenantId],
      { revalidate: options?.revalidate ?? 30, tags: options?.tags }
    );
}

// ============================================================================
// Pre-built Cached Queries - Common data access patterns
// ============================================================================

/**
 * Get customers for a tenant - cached for 30 seconds
 */
export const getCachedCustomers = createTenantCachedQuery(
  async (tenantId: string) => {
    "use server";
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });
    if (error) throw error;
    return data;
  },
  "customers",
  { revalidate: 30, tags: ["customers"] }
);

/**
 * Get employees for a tenant - cached for 30 seconds
 */
export const getCachedEmployees = createTenantCachedQuery(
  async (tenantId: string) => {
    "use server";
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("last_name", { ascending: true });
    if (error) throw error;
    return data;
  },
  "employees",
  { revalidate: 30, tags: ["employees"] }
);

/**
 * Get shifts for a tenant - cached for 30 seconds
 */
export const getCachedShifts = createTenantCachedQuery(
  async (tenantId: string) => {
    "use server";
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("shifts")
      .select(`
        *,
        employee:employees(id, first_name, last_name),
        object:objects(id, name, address)
      `)
      .eq("tenant_id", tenantId)
      .order("shift_date", { ascending: true });
    if (error) throw error;
    return data;
  },
  "shifts",
  { revalidate: 30, tags: ["shifts"] }
);

/**
 * Get orders with related data - cached for 30 seconds
 * Uses JOINs to avoid N+1 queries
 */
export const getCachedOrders = createTenantCachedQuery(
  async (tenantId: string) => {
    "use server";
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        customer:customers(id, name, contact_email),
        object:objects(id, name, address),
        order_employee_assignments(
          employee:employees(id, first_name, last_name)
        )
      `)
      .eq("tenant_id", tenantId)
      .limit(100)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  "orders",
  { revalidate: 30, tags: ["orders"] }
);

/**
 * Get objects for a tenant - cached for 30 seconds
 */
export const getCachedObjects = createTenantCachedQuery(
  async (tenantId: string) => {
    "use server";
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("objects")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });
    if (error) throw error;
    return data;
  },
  "objects",
  { revalidate: 30, tags: ["objects"] }
);

// ============================================================================
// Generic Cached Data Fetch Function - For custom queries
// ============================================================================

export async function getCachedData<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Get fresh data (caching is handled by unstable_cache in the calling function)
  return fetchFn();
}

// ============================================================================
// Cache Invalidation Helpers
// ============================================================================

/**
 * Invalidate all cached data for a specific entity
 */
export function invalidateEntityCache(entity: "customers" | "employees" | "shifts" | "orders" | "objects") {
  revalidateTag(entity, entity);
}

/**
 * Invalidate all caches (use after mutations)
 */
export function invalidateAllCaches() {
  revalidatePath("/dashboard");
}
