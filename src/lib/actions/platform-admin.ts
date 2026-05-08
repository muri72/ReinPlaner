/**
 * Platform Admin Server Actions
 * 
 * Server-side actions for platform administration including KPIs, revenue,
 * tenant management, and impersonation system.
 * These functions bypass RLS using SERVICE ROLE key.
 */

'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { requirePlatformAdmin } from '@/lib/services-rbac';

// =============================================================================
// TYPES
// =============================================================================

export interface PlatformKPI {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  total_orders: number;
  monthly_revenue: number;
  mrr: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  tenants: number;
}

export interface RevenueForecast {
  month: string;
  predicted_revenue: number;
  confidence: number;
}

export interface TenantListItem {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'pending' | 'cancelled';
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PlatformRevenueStats {
  total_revenue: number;
  mrr: number;
  arr: number;
  churn_rate: number;
  growth_rate: number;
}

export interface ImpersonationSession {
  id: string;
  platform_admin_id: string;
  tenant_id: string;
  user_id: string | null;
  reason: string | null;
  started_at: string;
  ended_at: string | null;
  tenant_name?: string;
  tenant_slug?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// =============================================================================
// ADMIN CLIENT
// =============================================================================

function getAdminClient() {
  const supabaseUrl = process.env.META_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.META_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Admin database credentials not configured');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

async function verifyPlatformAdmin(): Promise<void> {
  await requirePlatformAdmin();
}

// =============================================================================
// KPI & REVENUE QUERIES
// =============================================================================

/**
 * Get platform KPIs from the get_platform_kpis() RPC function
 */
export async function getPlatformKPIs(): Promise<{
  data: PlatformKPI | null;
  error: string | null;
}> {
  await verifyPlatformAdmin();
  try {
    const supabase = getAdminClient();
    
    const { data, error } = await supabase.rpc('get_platform_kpis');

    if (error) {
      console.error('getPlatformKPIs error:', error);
      return { data: null, error: error.message };
    }

    return { data: data as PlatformKPI, error: null };
  } catch (err) {
    console.error('getPlatformKPIs error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Get monthly revenue history
 * @param months Number of months to retrieve (default: 12)
 */
export async function getMonthlyRevenueHistory(months: number = 12): Promise<{
  data: MonthlyRevenue[];
  error: string | null;
}> {
  await verifyPlatformAdmin();
  try {
    const supabase = getAdminClient();
    
    const { data, error } = await supabase.rpc('get_monthly_revenue_history', {
      months_count: months
    });

    if (error) {
      console.error('getMonthlyRevenueHistory error:', error);
      return { data: [], error: error.message };
    }

    return { data: (data as MonthlyRevenue[]) || [], error: null };
  } catch (err) {
    console.error('getMonthlyRevenueHistory error:', err);
    return { data: [], error: (err as Error).message };
  }
}

/**
 * Get revenue forecast
 * @param months Number of months to forecast (default: 6)
 */
export async function getRevenueForecast(months: number = 6): Promise<{
  data: RevenueForecast[];
  error: string | null;
}> {
  await verifyPlatformAdmin();
  try {
    const supabase = getAdminClient();
    
    const { data, error } = await supabase.rpc('get_revenue_forecast', {
      forecast_months: months
    });

    if (error) {
      console.error('getRevenueForecast error:', error);
      return { data: [], error: error.message };
    }

    return { data: (data as RevenueForecast[]) || [], error: null };
  } catch (err) {
    console.error('getRevenueForecast error:', err);
    return { data: [], error: (err as Error).message };
  }
}

/**
 * Get platform revenue statistics
 */
export async function getPlatformRevenueStats(): Promise<{
  data: PlatformRevenueStats | null;
  error: string | null;
}> {
  await verifyPlatformAdmin();
  try {
    const supabase = getAdminClient();
    
    const { data, error } = await supabase
      .from('platform_revenue_stats')
      .select('*')
      .single();

    if (error) {
      console.error('getPlatformRevenueStats error:', error);
      return { data: null, error: error.message };
    }

    return { data: data as PlatformRevenueStats, error: null };
  } catch (err) {
    console.error('getPlatformRevenueStats error:', err);
    return { data: null, error: (err as Error).message };
  }
}

// =============================================================================
// TENANT QUERIES
// =============================================================================

/**
 * Get all tenants for admin dashboard
 */
export async function getAllTenants(): Promise<{
  data: TenantListItem[];
  error: string | null;
}> {
  await verifyPlatformAdmin();
  try {
    const supabase = getAdminClient();
    
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('getAllTenants error:', err);
    return { data: [], error: (err as Error).message };
  }
}

/**
 * Get a single tenant by ID
 */
export async function getTenantById(id: string): Promise<{
  data: TenantListItem | null;
  error: string | null;
}> {
  await verifyPlatformAdmin();
  try {
    const supabase = getAdminClient();
    
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('getTenantById error:', err);
    return { data: null, error: (err as Error).message };
  }
}

// =============================================================================
// IMPERSONATION
// =============================================================================

/**
 * Start an impersonation session for a tenant
 * @param tenantId The tenant to impersonate
 * @param userId Optional specific user to impersonate within the tenant
 * @param reason Reason for impersonation (for audit purposes)
 */
export async function impersonateTenant(
  tenantId: string,
  userId?: string,
  reason?: string
): Promise<{
  data: ImpersonationSession | null;
  error: string | null;
}> {
  await verifyPlatformAdmin();
  try {
    const supabase = getAdminClient();
    
    const { data, error } = await supabase.rpc('start_impersonation_session', {
      p_tenant_id: tenantId,
      p_user_id: userId || null,
      p_reason: reason || null
    });

    if (error) {
      console.error('impersonateTenant error:', error);
      return { data: null, error: error.message };
    }

    return { data: data as ImpersonationSession, error: null };
  } catch (err) {
    console.error('impersonateTenant error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * End the current impersonation session
 * @param sessionId Optional specific session to end (defaults to active session)
 */
export async function endImpersonation(sessionId?: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  await verifyPlatformAdmin();
  try {
    const supabase = getAdminClient();
    
    const { error } = await supabase.rpc('end_impersonation_session', {
      p_session_id: sessionId || null
    });

    if (error) {
      console.error('endImpersonation error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/dashboard');
    return { success: true, error: null };
  } catch (err) {
    console.error('endImpersonation error:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Get active impersonation sessions for the current platform admin
 */
export async function getActiveImpersonationSessions(): Promise<{
  data: ImpersonationSession[];
  error: string | null;
}> {
  await verifyPlatformAdmin();
  try {
    const supabase = getAdminClient();
    
    const { data: sessionData, error } = await supabase
      .from('impersonation_sessions')
      .select('*')
      .is('ended_at', null)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('getActiveImpersonationSessions error:', error);
      return { data: [], error: error.message };
    }

    // Fetch tenant names for each session
    const sessions = sessionData || [];
    const tenantIds = sessions.map(s => s.tenant_id);
    
    if (tenantIds.length === 0) {
      return { data: [], error: null };
    }

    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .in('id', tenantIds);

    const tenantMap = new Map(tenants?.map(t => [t.id, t]) || []);

    const sessionsWithTenant = sessions.map(session => ({
      ...session,
      tenant_name: tenantMap.get(session.tenant_id)?.name || 'Unknown',
      tenant_slug: tenantMap.get(session.tenant_id)?.slug || 'unknown'
    }));

    return { data: sessionsWithTenant as ImpersonationSession[], error: null };
  } catch (err) {
    console.error('getActiveImpersonationSessions error:', err);
    return { data: [], error: (err as Error).message };
  }
}

// =============================================================================
// AUDIT LOGS
// =============================================================================

/**
 * Get platform audit logs
 * @param limit Number of logs to retrieve (default: 50)
 */
export async function getPlatformAuditLogs(limit: number = 50): Promise<{
  data: AuditLogEntry[];
  error: string | null;
}> {
  await verifyPlatformAdmin();
  try {
    const supabase = getAdminClient();
    
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('getPlatformAuditLogs error:', error);
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('getPlatformAuditLogs error:', err);
    return { data: [], error: (err as Error).message };
  }
}

// =============================================================================
// USER MANAGEMENT
// =============================================================================

/**
 * Update a user's role (for SUPPORT role assignment)
 * @param userId User ID to update
 * @param newRole New role to assign
 */
export async function updateUserRole(
  userId: string,
  newRole: 'admin' | 'manager' | 'employee' | 'customer' | 'platform_admin' | 'support'
): Promise<{
  success: boolean;
  error: string | null;
}> {
  await verifyPlatformAdmin();
  try {
    const supabase = getAdminClient();
    
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      console.error('updateUserRole error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/users');
    return { success: true, error: null };
  } catch (err) {
    console.error('updateUserRole error:', err);
    return { success: false, error: (err as Error).message };
  }
}
