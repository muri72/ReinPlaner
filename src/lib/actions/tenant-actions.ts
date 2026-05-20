'use server';

import { auth } from '@/lib/auth/options';
import { db } from '@/lib/db';
import { tenants, profiles, auditLogs } from '@/lib/db/schema';
import { eq, desc, and, count, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { Tenant, TenantPlan, TenantStatus, TenantSettings, CreateTenantInput } from '@/lib/tenant/types';
import { logCriticalAction } from '@/lib/audit-log';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface TenantAdminListResult {
  tenants: Tenant[];
  total: number;
}

export interface TenantAdminResult {
  success: boolean;
  tenant?: Tenant;
  error?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if the current user has platform admin role
 */
async function requirePlatformAdmin(): Promise<{ userId: string; email: string } | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const userId = session.user.id;
  const email = session.user.email || '';

  // Check if user has platform_admin role via NextAuth token
  const role = (session.user as any).role;
  if (role !== 'platform_admin') {
    return null;
  }

  return { userId, email };
}

/**
 * Map database row to Tenant type
 */
function mapRowToTenant(data: typeof tenants.$inferSelect): Tenant {
  return {
    id: data.id as string,
    slug: data.slug,
    name: data.name,
    domain: data.customDomain || null,
    plan: (data.plan as TenantPlan) || 'starter',
    status: (data.status as TenantStatus) || 'active',
    created_at: data.createdAt?.toISOString() || new Date().toISOString(),
    updated_at: data.updatedAt?.toISOString() || new Date().toISOString(),
  };
}

// =============================================================================
// SERVER ACTIONS
// =============================================================================

/**
 * Admin-only: List all tenants with pagination
 */
export async function getAllTenants(
  page: number = 1,
  pageSize: number = 20,
  status?: TenantStatus,
  plan?: TenantPlan
): Promise<TenantAdminListResult> {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    throw new Error('Unauthorized: Platform admin access required');
  }

  try {
    const conditions = [];
    if (status) {
      conditions.push(eq(tenants.status, status));
    }
    if (plan) {
      conditions.push(eq(tenants.plan, plan));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(tenants)
      .where(whereClause);

    // Get paginated results
    const results = await db
      .select()
      .from(tenants)
      .where(whereClause)
      .orderBy(desc(tenants.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const tenantList = results.map(row => mapRowToTenant(row));

    return {
      tenants: tenantList,
      total: Number(total) || 0,
    };
  } catch (err) {
    console.error('[tenant-admin] Error fetching tenants:', err);
    throw new Error(`Failed to fetch tenants: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

/**
 * Admin-only: Get a single tenant by ID
 */
export async function getTenantById(id: string): Promise<Tenant> {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    throw new Error('Unauthorized: Platform admin access required');
  }

  const result = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1);

  if (!result || result.length === 0) {
    throw new Error(`Tenant not found: ${id}`);
  }

  return mapRowToTenant(result[0]);
}

/**
 * Admin-only: Create a new tenant
 * Creates tenant in the meta-database
 */
export async function createTenant(data: CreateTenantInput): Promise<TenantAdminResult> {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    throw new Error('Unauthorized: Platform admin access required');
  }

  try {
    const now = new Date();

    const [newTenant] = await db
      .insert(tenants)
      .values({
        slug: data.slug,
        name: data.name,
        customDomain: data.domain || null,
        plan: data.plan || 'starter',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!newTenant) {
      return { success: false, error: 'Failed to create tenant' };
    }

    const tenant = mapRowToTenant(newTenant);

    // Audit log
    await logCriticalAction(
      admin.userId,
      'TENANT_CREATED',
      'success',
      `Created tenant: ${tenant.name} (${tenant.slug})`,
      undefined,
      newTenant
    );

    // Revalidate admin pages
    revalidatePath('/admin/tenants');

    return { success: true, tenant };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[tenant-admin] Error creating tenant:', message);

    // Handle unique constraint violation (Postgres error code 23505)
    if (message.includes('23505') || message.includes('unique') || message.includes('duplicate')) {
      return { success: false, error: 'Ein Tenant mit diesem Slug existiert bereits' };
    }

    return { success: false, error: message };
  }
}

/**
 * Admin-only: Update a tenant
 * Updates tenant in the meta-database
 */
export async function updateTenant(
  id: string,
  data: Partial<Tenant>
): Promise<TenantAdminResult> {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    throw new Error('Unauthorized: Platform admin access required');
  }

  try {
    // Get current tenant for audit log
    const [currentTenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    if (!currentTenant) {
      return { success: false, error: 'Tenant nicht gefunden' };
    }

    const updateData: Partial<typeof tenants.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.domain !== undefined) updateData.customDomain = data.domain;
    if (data.plan !== undefined) updateData.plan = data.plan;
    if (data.status !== undefined) updateData.status = data.status;

    const [updatedTenant] = await db
      .update(tenants)
      .set(updateData)
      .where(eq(tenants.id, id))
      .returning();

    if (!updatedTenant) {
      return { success: false, error: 'Failed to update tenant' };
    }

    const tenant = mapRowToTenant(updatedTenant);

    // Audit log
    await logCriticalAction(
      admin.userId,
      'TENANT_UPDATED',
      'success',
      `Updated tenant: ${tenant.name} (${tenant.slug})`,
      currentTenant,
      updatedTenant
    );

    // Revalidate admin pages
    revalidatePath('/admin/tenants');
    revalidatePath(`/admin/tenants/${id}`);

    return { success: true, tenant };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[tenant-admin] Error updating tenant:', message);
    return { success: false, error: message };
  }
}

/**
 * Admin-only: Suspend a tenant
 * Sets status to 'suspended' and optionally clears database credentials
 */
export async function suspendTenant(id: string, reason?: string): Promise<TenantAdminResult> {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    throw new Error('Unauthorized: Platform admin access required');
  }

  try {
    // Get current tenant for audit log
    const [currentTenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    if (!currentTenant) {
      return { success: false, error: 'Tenant nicht gefunden' };
    }

    const [suspendedTenant] = await db
      .update(tenants)
      .set({
        status: 'suspended',
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning();

    if (!suspendedTenant) {
      return { success: false, error: 'Failed to suspend tenant' };
    }

    const tenant = mapRowToTenant(suspendedTenant);

    // Audit log
    await logCriticalAction(
      admin.userId,
      'TENANT_SUSPENDED',
      'success',
      `Suspended tenant: ${tenant.name} (${tenant.slug}). Reason: ${reason || 'No reason provided'}`,
      currentTenant,
      suspendedTenant
    );

    // Revalidate admin pages
    revalidatePath('/admin/tenants');
    revalidatePath(`/admin/tenants/${id}`);

    return { success: true, tenant };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[tenant-admin] Error suspending tenant:', message);
    return { success: false, error: message };
  }
}

/**
 * Admin-only: Reactivate a suspended tenant
 */
export async function reactivateTenant(id: string): Promise<TenantAdminResult> {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    throw new Error('Unauthorized: Platform admin access required');
  }

  try {
    // Get current tenant for audit log
    const [currentTenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    if (!currentTenant) {
      return { success: false, error: 'Tenant nicht gefunden' };
    }

    const [reactivatedTenant] = await db
      .update(tenants)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning();

    if (!reactivatedTenant) {
      return { success: false, error: 'Failed to reactivate tenant' };
    }

    const tenant = mapRowToTenant(reactivatedTenant);

    // Audit log
    await logCriticalAction(
      admin.userId,
      'TENANT_REACTIVATED',
      'success',
      `Reactivated tenant: ${tenant.name} (${tenant.slug})`,
      currentTenant,
      reactivatedTenant
    );

    // Revalidate admin pages
    revalidatePath('/admin/tenants');
    revalidatePath(`/admin/tenants/${id}`);

    return { success: true, tenant };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[tenant-admin] Error reactivating tenant:', message);
    return { success: false, error: message };
  }
}

/**
 * Admin-only: Delete a tenant permanently (soft delete recommended)
 */
export async function deleteTenant(id: string): Promise<TenantAdminResult> {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    throw new Error('Unauthorized: Platform admin access required');
  }

  try {
    // Get current tenant for audit log
    const [currentTenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    if (!currentTenant) {
      return { success: false, error: 'Tenant nicht gefunden' };
    }

    // Don't allow deleting the default tenant
    if (currentTenant.slug === 'reinplaner') {
      return { success: false, error: 'Der Standard-Tenant kann nicht gelöscht werden' };
    }

    await db
      .delete(tenants)
      .where(eq(tenants.id, id));

    // Audit log
    await logCriticalAction(
      admin.userId,
      'TENANT_DELETED',
      'success',
      `Deleted tenant: ${currentTenant.name} (${currentTenant.slug})`,
      currentTenant,
      undefined
    );

    // Revalidate admin pages
    revalidatePath('/admin/tenants');

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[tenant-admin] Error deleting tenant:', message);
    return { success: false, error: message };
  }
}

/**
 * Admin-only: Get tenant statistics
 */
export async function getTenantStats(): Promise<{
  total: number;
  active: number;
  suspended: number;
  pending: number;
  byPlan: Record<TenantPlan, number>;
}> {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    throw new Error('Unauthorized: Platform admin access required');
  }

  try {
    const results = await db
      .select({
        status: tenants.status,
        plan: tenants.plan,
      })
      .from(tenants);

    const stats = {
      total: results.length,
      active: 0,
      suspended: 0,
      pending: 0,
      byPlan: {
        starter: 0,
        professional: 0,
        enterprise: 0,
      } as Record<TenantPlan, number>,
    };

    results.forEach((row) => {
      if (row.status === 'active') stats.active++;
      if (row.status === 'suspended') stats.suspended++;
      if (row.status === 'pending') stats.pending++;
      if (row.plan && row.plan in stats.byPlan) {
        stats.byPlan[row.plan as TenantPlan]++;
      }
    });

    return stats;
  } catch (err) {
    console.error('[tenant-admin] Error fetching tenant stats:', err);
    throw new Error(`Failed to fetch stats: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
