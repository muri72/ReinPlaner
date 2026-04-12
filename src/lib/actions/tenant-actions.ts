'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Check if user has admin role in profiles
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single();

  if (error || !profile || profile.role !== 'admin') {
    return null;
  }

  return { userId: user.id, email: profile.email || user.email || '' };
}

/**
 * Map database row to Tenant type
 */
function mapRowToTenant(data: Record<string, unknown>): Tenant {
  return {
    id: data.id as string,
    slug: data.slug as string,
    name: data.name as string,
    domain: data.domain as string | null,
    plan: (data.plan as TenantPlan) || 'starter',
    status: (data.status as TenantStatus) || 'active',
    settings: (data.settings as TenantSettings) || {},
    database_url: data.database_url as string | undefined,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

// =============================================================================
// SERVER ACTIONS
// =============================================================================

/**
 * Admin-only: List all tenants with pagination
 * Uses the get_tenants_admin() RPC function to bypass RLS
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

  const supabase = createAdminClient();

  let query = supabase
    .from('tenants')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status) {
    query = query.eq('status', status);
  }

  if (plan) {
    query = query.eq('plan', plan);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[tenant-admin] Error fetching tenants:', error);
    throw new Error(`Failed to fetch tenants: ${error.message}`);
  }

  const tenants = (data || []).map(row => mapRowToTenant(row as Record<string, unknown>));

  return {
    tenants,
    total: count || 0,
  };
}

/**
 * Admin-only: Get a single tenant by ID
 * Uses the get_tenants_admin() RPC function to bypass RLS
 */
export async function getTenantById(id: string): Promise<Tenant> {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    throw new Error('Unauthorized: Platform admin access required');
  }

  const supabase = createAdminClient();

  // Try RPC first (bypasses RLS)
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_tenant_by_id', { tenant_id: id });

  if (rpcError) {
    // Fallback to direct query
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new Error(`Tenant not found: ${id}`);
    }

    return mapRowToTenant(data as Record<string, unknown>);
  }

  if (!rpcData) {
    throw new Error(`Tenant not found: ${id}`);
  }

  return mapRowToTenant(rpcData as Record<string, unknown>);
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
    const supabase = createAdminClient();

    const { data: tenantData, error } = await supabase
      .from('tenants')
      .insert({
        slug: data.slug,
        name: data.name,
        domain: data.domain || null,
        plan: data.plan || 'starter',
        status: 'pending',
        settings: data.settings || {},
        created_by: admin.userId,
      })
      .select()
      .single();

    if (error) {
      console.error('[tenant-admin] Error creating tenant:', error);
      
      // Handle unique constraint violation
      if (error.code === '23505') {
        return { success: false, error: 'Ein Tenant mit diesem Slug existiert bereits' };
      }
      
      return { success: false, error: `Fehler beim Erstellen: ${error.message}` };
    }

    const tenant = mapRowToTenant(tenantData as Record<string, unknown>);

    // Audit log
    await logCriticalAction(
      admin.userId,
      'TENANT_CREATED',
      'success',
      `Created tenant: ${tenant.name} (${tenant.slug})`,
      undefined,
      tenantData
    );

    // Revalidate admin pages
    revalidatePath('/admin/tenants');

    return { success: true, tenant };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[tenant-admin] Error creating tenant:', message);
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
    const { data: currentTenant } = await createAdminClient()
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.domain !== undefined) updateData.domain = data.domain;
    if (data.plan !== undefined) updateData.plan = data.plan;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.settings !== undefined) updateData.settings = data.settings;

    const { data: tenantData, error } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[tenant-admin] Error updating tenant:', error);
      return { success: false, error: `Fehler beim Aktualisieren: ${error.message}` };
    }

    const tenant = mapRowToTenant(tenantData as Record<string, unknown>);

    // Audit log
    await logCriticalAction(
      admin.userId,
      'TENANT_UPDATED',
      'success',
      `Updated tenant: ${tenant.name} (${tenant.slug})`,
      currentTenant,
      tenantData
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
    const { data: currentTenant } = await createAdminClient()
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentTenant) {
      return { success: false, error: 'Tenant nicht gefunden' };
    }

    const supabase = createAdminClient();

    const { data: tenantData, error } = await supabase
      .from('tenants')
      .update({
        status: 'suspended',
        suspended_at: new Date().toISOString(),
        suspended_reason: reason || 'Admin suspended',
        updated_at: new Date().toISOString(),
        // Clear sensitive database credentials when suspending
        database_password_encrypted: null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[tenant-admin] Error suspending tenant:', error);
      return { success: false, error: `Fehler beim Suspendieren: ${error.message}` };
    }

    const tenant = mapRowToTenant(tenantData as Record<string, unknown>);

    // Audit log
    await logCriticalAction(
      admin.userId,
      'TENANT_SUSPENDED',
      'success',
      `Suspended tenant: ${tenant.name} (${tenant.slug}). Reason: ${reason || 'No reason provided'}`,
      currentTenant,
      tenantData
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
    const { data: currentTenant } = await createAdminClient()
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentTenant) {
      return { success: false, error: 'Tenant nicht gefunden' };
    }

    const supabase = createAdminClient();

    const { data: tenantData, error } = await supabase
      .from('tenants')
      .update({
        status: 'active',
        suspended_at: null,
        suspended_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[tenant-admin] Error reactivating tenant:', error);
      return { success: false, error: `Fehler beim Reaktivieren: ${error.message}` };
    }

    const tenant = mapRowToTenant(tenantData as Record<string, unknown>);

    // Audit log
    await logCriticalAction(
      admin.userId,
      'TENANT_REACTIVATED',
      'success',
      `Reactivated tenant: ${tenant.name} (${tenant.slug})`,
      currentTenant,
      tenantData
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
    const { data: currentTenant } = await createAdminClient()
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentTenant) {
      return { success: false, error: 'Tenant nicht gefunden' };
    }

    // Don't allow deleting the default tenant
    if (currentTenant.slug === 'reinplaner') {
      return { success: false, error: 'Der Standard-Tenant kann nicht gelöscht werden' };
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[tenant-admin] Error deleting tenant:', error);
      return { success: false, error: `Fehler beim Löschen: ${error.message}` };
    }

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

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('tenants')
    .select('status, plan');

  if (error) {
    console.error('[tenant-admin] Error fetching tenant stats:', error);
    throw new Error(`Failed to fetch stats: ${error.message}`);
  }

  const stats = {
    total: data?.length || 0,
    active: 0,
    suspended: 0,
    pending: 0,
    byPlan: {
      starter: 0,
      professional: 0,
      enterprise: 0,
    } as Record<TenantPlan, number>,
  };

  (data || []).forEach((row: { status: string; plan: string }) => {
    if (row.status === 'active') stats.active++;
    if (row.status === 'suspended') stats.suspended++;
    if (row.status === 'pending') stats.pending++;
    if (row.plan in stats.byPlan) {
      stats.byPlan[row.plan as TenantPlan]++;
    }
  });

  return stats;
}
