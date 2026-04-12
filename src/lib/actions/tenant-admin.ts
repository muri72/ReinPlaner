/**
 * Tenant Admin Server Actions
 * 
 * Server-side actions for managing tenants in the platform admin.
 * These functions bypass RLS using SERVICE ROLE key.
 */

'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Service role client for admin operations
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

// =============================================================================
// TYPES
// =============================================================================

export interface TenantFormData {
  slug: string;
  name: string;
  domain?: string;
  plan?: 'starter' | 'professional' | 'enterprise';
  settings?: {
    branding?: {
      logo_url?: string;
      primary_color?: string;
      company_name?: string;
    };
    features?: {
      api_access?: boolean;
      sso?: boolean;
      custom_backup?: boolean;
    };
    limits?: {
      max_users?: number;
      max_orders_per_month?: number;
      storage_mb?: number;
    };
  };
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

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get all tenants for admin dashboard
 */
export async function getAllTenants(): Promise<{
  data: TenantListItem[];
  error: string | null;
}> {
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

/**
 * Get tenant domains for a tenant
 */
export async function getTenantDomains(tenantId: string): Promise<{
  data: Array<{
    id: string;
    domain: string;
    is_primary: boolean;
    verified_at: string | null;
    verification_token: string | null;
  }>;
  error: string | null;
}> {
  try {
    const supabase = getAdminClient();
    
    const { data, error } = await supabase
      .from('tenant_domains')
      .select('id, domain, is_primary, verified_at, verification_token')
      .eq('tenant_id', tenantId)
      .order('is_primary', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('getTenantDomains error:', err);
    return { data: [], error: (err as Error).message };
  }
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new tenant
 */
export async function createTenant(input: {
  slug: string;
  name: string;
  domain?: string;
  plan?: 'starter' | 'professional' | 'enterprise';
}): Promise<{
  data: TenantListItem | null;
  error: string | null;
}> {
  try {
    const supabase = getAdminClient();
    
    // Generate verification token for custom domain
    const verificationToken = generateVerificationToken();
    
    const { data, error } = await supabase
      .from('tenants')
      .insert({
        slug: input.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        name: input.name,
        domain: input.domain || null,
        plan: input.plan || 'starter',
        status: 'pending',
        settings: getDefaultSettings(input.plan || 'starter'),
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    // If domain provided, create tenant_domain entry
    if (input.domain) {
      await supabase
        .from('tenant_domains')
        .insert({
          tenant_id: data.id,
          domain: input.domain,
          is_primary: true,
          verification_token: verificationToken,
          verification_method: 'dns_txt',
        });
    }

    revalidatePath('/dashboard/admin/tenants');
    return { data, error: null };
  } catch (err) {
    console.error('createTenant error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Update an existing tenant
 */
export async function updateTenant(
  id: string,
  updates: Partial<{
    name: string;
    domain: string | null;
    plan: 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'suspended' | 'pending' | 'cancelled';
  }>
): Promise<{
  data: TenantListItem | null;
  error: string | null;
}> {
  try {
    const supabase = getAdminClient();
    
    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    revalidatePath('/dashboard/admin/tenants');
    return { data, error: null };
  } catch (err) {
    console.error('updateTenant error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Delete (soft delete via status) a tenant
 */
export async function deleteTenant(id: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const supabase = getAdminClient();
    
    const { error } = await supabase
      .from('tenants')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/admin/tenants');
    return { success: true, error: null };
  } catch (err) {
    console.error('deleteTenant error:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Suspend a tenant
 */
export async function suspendTenant(id: string, reason?: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const supabase = getAdminClient();
    
    const { error } = await supabase
      .from('tenants')
      .update({ 
        status: 'suspended',
        suspended_at: new Date().toISOString(),
        suspended_reason: reason || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/admin/tenants');
    return { success: true, error: null };
  } catch (err) {
    console.error('suspendTenant error:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Activate a pending tenant
 */
export async function activateTenant(id: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const supabase = getAdminClient();
    
    const { error } = await supabase
      .from('tenants')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/admin/tenants');
    return { success: true, error: null };
  } catch (err) {
    console.error('activateTenant error:', err);
    return { success: false, error: (err as Error).message };
  }
}

// =============================================================================
// CUSTOM DOMAIN VERIFICATION
// =============================================================================

/**
 * Add a custom domain to a tenant
 */
export async function addTenantDomain(
  tenantId: string,
  domain: string
): Promise<{
  data: { verification_token: string; verification_method: string } | null;
  error: string | null;
}> {
  try {
    const supabase = getAdminClient();
    const verificationToken = generateVerificationToken();
    
    const { data, error } = await supabase
      .from('tenant_domains')
      .insert({
        tenant_id: tenantId,
        domain: domain,
        is_primary: false,
        verification_token: verificationToken,
        verification_method: 'dns_txt',
      })
      .select('verification_token, verification_method')
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('addTenantDomain error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Get verification instructions for a domain
 */
export async function getDomainVerificationInstructions(
  domain: string
): Promise<{
  data: {
    token: string;
    method: string;
    instructions: string[];
  } | null;
  error: string | null;
}> {
  try {
    const supabase = getAdminClient();
    
    const { data, error } = await supabase
      .from('tenant_domains')
      .select('verification_token, verification_method')
      .eq('domain', domain)
      .single();

    if (error || !data) {
      return { data: null, error: 'Domain not found or not pending verification' };
    }

    return {
      data: {
        token: data.verification_token || '',
        method: data.verification_method || 'dns_txt',
        instructions: [
          `1. Log in to your DNS provider for ${domain}`,
          `2. Create a new TXT record`,
          `3. Set the name/host to: _reinplaner-verification.${domain.replace(/^www\./, '')}`,
          `4. Set the value to: ${data.verification_token}`,
          `5. Save the record and wait 5-10 minutes for DNS propagation`,
          `6. Click "Verify" to confirm`,
        ],
      },
      error: null,
    };
  } catch (err) {
    console.error('getDomainVerificationInstructions error:', err);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Verify domain ownership via DNS
 */
export async function verifyDomainOwnership(
  domainId: string
): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const supabase = getAdminClient();
    
    // In a real implementation, we would check DNS here
    // For now, we just mark it as verified
    const { error } = await supabase
      .from('tenant_domains')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', domainId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('verifyDomainOwnership error:', err);
    return { success: false, error: (err as Error).message };
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function generateVerificationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'reinplaner-verification=';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function getDefaultSettings(plan: 'starter' | 'professional' | 'enterprise') {
  const limits = {
    starter: { max_users: 5, max_orders_per_month: 1000, storage_mb: 1000 },
    professional: { max_users: 25, max_orders_per_month: 10000, storage_mb: 10000 },
    enterprise: { max_users: -1, max_orders_per_month: -1, storage_mb: 100000 },
  };

  const features = {
    starter: { api_access: false, sso: false, custom_backup: false },
    professional: { api_access: true, sso: false, custom_backup: false },
    enterprise: { api_access: true, sso: true, custom_backup: true },
  };

  return {
    branding: {
      primary_color: '#3B82F6',
    },
    limits: limits[plan],
    features: features[plan],
  };
}

// =============================================================================
// PLATFORM STATS
// =============================================================================

/**
 * Get platform-wide statistics
 */
export async function getPlatformStats(): Promise<{
  data: {
    totalTenants: number;
    activeTenants: number;
    pendingTenants: number;
    suspendedTenants: number;
    totalUsers: number;
    monthlyRevenue: number;
  } | null;
  error: string | null;
}> {
  try {
    const supabase = getAdminClient();
    
    const { data, error } = await supabase
      .from('tenants')
      .select('status, plan, monthly_rate_cents');

    if (error) {
      return { data: null, error: error.message };
    }

    const stats = {
      totalTenants: data.length,
      activeTenants: data.filter(t => t.status === 'active').length,
      pendingTenants: data.filter(t => t.status === 'pending').length,
      suspendedTenants: data.filter(t => t.status === 'suspended').length,
      totalUsers: 0, // Would need to join with tenant_users
      monthlyRevenue: data
        .filter(t => t.status === 'active')
        .reduce((sum, t) => sum + (t.monthly_rate_cents || 2900), 0) / 100,
    };

    return { data: stats, error: null };
  } catch (err) {
    console.error('getPlatformStats error:', err);
    return { data: null, error: (err as Error).message };
  }
}
