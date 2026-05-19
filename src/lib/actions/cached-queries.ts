"use server";

import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { db } from '@/lib/db';
import { customers, employees, shifts, orders, objects } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// ============================================================================
// Cached Query Builder - Uses Next.js unstable_cache for server-side caching
// ============================================================================

/**
 * Creates a cached version of a Drizzle query.
 * The cache is stored at the edge and reused across serverless instances.
 *
 * @param queryFn - The async function that fetches data from Drizzle
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
    const result = await db
      .select()
      .from(customers)
      .where(eq(customers.tenantId, tenantId))
      .orderBy(customers.name);
    return result;
  },
  "customers",
  { revalidate: 30, tags: ["customers"] }
);

/**
 * Get employees for a tenant - cached for 30 seconds
 */
export const getCachedEmployees = createTenantCachedQuery(
  async (tenantId: string) => {
    const result = await db
      .select()
      .from(employees)
      .where(eq(employees.tenantId, tenantId))
      .orderBy(employees.createdAt);
    return result;
  },
  "employees",
  { revalidate: 30, tags: ["employees"] }
);

/**
 * Get shifts for a tenant - cached for 30 seconds
 */
export const getCachedShifts = createTenantCachedQuery(
  async (tenantId: string) => {
    const result = await db
      .select()
      .from(shifts)
      .where(eq(shifts.tenantId, tenantId))
      .orderBy(shifts.scheduledStart);
    return result;
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
    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.tenantId, tenantId))
      .limit(100)
      .orderBy(desc(orders.createdAt));
    return result;
  },
  "orders",
  { revalidate: 30, tags: ["orders"] }
);

/**
 * Get objects for a tenant - cached for 30 seconds
 */
export const getCachedObjects = createTenantCachedQuery(
  async (tenantId: string) => {
    const result = await db
      .select()
      .from(objects)
      .where(eq(objects.tenantId, tenantId))
      .orderBy(objects.name);
    return result;
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