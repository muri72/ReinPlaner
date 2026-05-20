/**
 * Tenant Admin Server Actions
 * 
 * Server-side actions for managing tenants in the platform admin.
 * Uses Drizzle ORM for database operations and NextAuth for authentication.
 * Requires platform_admin role - accessible only via reinplaner.vercel.app
 */

'use server';

import { db } from '@/lib/db';
import { tenants, tenantDomains, profiles } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/session';

// =============================================================================
// AUTH HELPERS
// =============================================================================

/**
 * Get the current session and verify platform admin role
 */
async function getPlatformAdmin(): Promise<{ id: string; role: string; tenantId: string | null }> {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }
  
  const role = (session.user as any).role;
  if (role !== 'platform_admin') {
    throw new Error('Platform-Admin-Berechtigung erforderlich');
  }
  
  return {
    id: session.user.id,
    role,
    tenantId: (session.user as any).tenantId ?? null,
  };
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
  createdAt: Date;
  updatedAt: Date;
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
    await getPlatformAdmin();
    
    const result = await db
      .select({
        id: tenants.id,
        slug: tenants.slug,
        name: tenants.name,
        domain: tenants.customDomain,
        plan: tenants.plan ?? 'starter',
        status: tenants.status ?? 'pending',
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
      })
      .from(tenants)
      .orderBy(desc(tenants.createdAt));

    const data: TenantListItem[] = result.map(r => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      domain: r.domain ?? null,
      plan: r.plan ?? 'starter',
      status: r.status ?? 'pending',
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }));

    return { data, error: null };
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
    await getPlatformAdmin();
    
    const result = await db
      .select({
        id: tenants.id,
        slug: tenants.slug,
        name: tenants.name,
        domain: tenants.customDomain,
        plan: tenants.plan ?? 'starter',
        status: tenants.status ?? 'pending',
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
      })
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    if (result.length === 0) {
      return { data: null, error: 'Tenant not found' };
    }

    const r = result[0];
    return { 
      data: {
        id: r.id,
        slug: r.slug,
        name: r.name,
        domain: r.domain ?? null,
        plan: r.plan ?? 'starter',
        status: r.status ?? 'pending',
      createdAt: r.createdAt ?? new Date(),
      updatedAt: r.updatedAt ?? new Date(),
    }, 
    error: null
  };
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
    isPrimary: boolean;
    verifiedAt: Date | null;
    verificationToken: string | null;
  }>;
  error: string | null;
}> {
  try {
    await getPlatformAdmin();
    
    const result = (await db
      .select({
        id: tenantDomains.id,
        domain: tenantDomains.domain,
        isPrimary: tenantDomains.isPrimary,
        verifiedAt: tenantDomains.verifiedAt,
        verificationToken: tenantDomains.verificationToken,
      })
      .from(tenantDomains)
      .where(eq(tenantDomains.tenantId, tenantId))
      .orderBy(desc(tenantDomains.isPrimary))) as Array<{ id: string; domain: string; isPrimary: boolean; verifiedAt: Date | null; verificationToken: string | null }>;

    return { data: result, error: null };
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
    await getPlatformAdmin();
    
    // Generate verification token for custom domain
    const verificationToken = generateVerificationToken();
    
    const slug = input.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    const [newTenant] = await db
      .insert(tenants)
      .values({
        slug,
        name: input.name,
        customDomain: input.domain || null,
        plan: input.plan || 'starter',
        status: 'pending',
      })
      .returning({
        id: tenants.id,
        slug: tenants.slug,
        name: tenants.name,
        domain: tenants.customDomain,
        plan: tenants.plan!,
        status: tenants.status!,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
      });

// If domain provided, create tenant_domain entry
    if (input.domain && newTenant) {
      await db
        .insert(tenantDomains)
        .values({
          tenantId: newTenant.id,
          domain: input.domain,
          isPrimary: true,
          verificationToken,
          verificationMethod: 'dns_txt',
        });
    }

    revalidatePath('/dashboard/admin/tenants');
    const result: TenantListItem | null = newTenant ? {
      id: newTenant.id,
      slug: newTenant.slug,
      name: newTenant.name,
      domain: newTenant.domain ?? null,
      plan: newTenant.plan ?? 'starter',
      status: newTenant.status ?? 'pending',
      createdAt: newTenant.createdAt ?? new Date(),
      updatedAt: newTenant.updatedAt ?? new Date(),
    } : null;
    return { data: result, error: null };
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
    await getPlatformAdmin();
    
    const [updated] = await db
      .update(tenants)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning({
        id: tenants.id,
        slug: tenants.slug,
        name: tenants.name,
        domain: tenants.customDomain,
        plan: tenants.plan!,
        status: tenants.status!,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
      });

    if (!updated) {
      return { data: null, error: 'Tenant not found' };
    }

    revalidatePath('/dashboard/admin/tenants');
    const result: TenantListItem = {
      id: updated.id,
      slug: updated.slug,
      name: updated.name,
      domain: updated.domain ?? null,
      plan: updated.plan ?? 'starter',
      status: updated.status ?? 'pending',
      createdAt: updated.createdAt ?? new Date(),
      updatedAt: updated.updatedAt ?? new Date(),
    };
    return { data: result, error: null };
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
    await getPlatformAdmin();
    
    await db
      .update(tenants)
      .set({ 
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id));

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
    await getPlatformAdmin();
    
    await db
      .update(tenants)
      .set({ 
        status: 'suspended',
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id));

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
    await getPlatformAdmin();
    
    await db
      .update(tenants)
      .set({ 
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id));

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
  data: { verificationToken: string; verificationMethod: string } | null;
  error: string | null;
}> {
  try {
    await getPlatformAdmin();
    const verificationToken = generateVerificationToken();
    
    const [result] = await db
      .insert(tenantDomains)
      .values({
        tenantId,
        domain,
        isPrimary: false,
        verificationToken,
        verificationMethod: 'dns_txt',
      })
      .returning({
        verificationToken: tenantDomains.verificationToken,
        verificationMethod: tenantDomains.verificationMethod,
      });

    if (!result) {
      return { data: null, error: 'Failed to add domain' };
    }

    const data = {
      verificationToken: result.verificationToken!,
      verificationMethod: result.verificationMethod!,
    };
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
    await getPlatformAdmin();
    
    const [domainRecord] = await db
      .select({
        verificationToken: tenantDomains.verificationToken,
        verificationMethod: tenantDomains.verificationMethod,
      })
      .from(tenantDomains)
      .where(eq(tenantDomains.domain, domain))
      .limit(1);

    if (!domainRecord) {
      return { data: null, error: 'Domain not found or not pending verification' };
    }

    return {
      data: {
        token: domainRecord.verificationToken || '',
        method: domainRecord.verificationMethod || 'dns_txt',
        instructions: [
          `1. Log in to your DNS provider for ${domain}`,
          `2. Create a new TXT record`,
          `3. Set the name/host to: _reinplaner-verification.${domain.replace(/^www\./, '')}`,
          `4. Set the value to: ${domainRecord.verificationToken}`,
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
    await getPlatformAdmin();
    
    // In a real implementation, we would check DNS here
    // For now, we just mark it as verified
    await db
      .update(tenantDomains)
      .set({ verifiedAt: new Date() })
      .where(eq(tenantDomains.id, domainId));

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
    await getPlatformAdmin();
    
    const allTenants = await db
      .select({
        status: tenants.status,
        plan: tenants.plan,
      })
      .from(tenants);

    const allProfiles = await db
      .select({ id: profiles.id })
      .from(profiles);

    const stats = {
      totalTenants: allTenants.length,
      activeTenants: allTenants.filter(t => t.status === 'active').length,
      pendingTenants: allTenants.filter(t => t.status === 'pending').length,
      suspendedTenants: allTenants.filter(t => t.status === 'suspended').length,
      totalUsers: allProfiles.length,
      monthlyRevenue: allTenants
        .filter(t => t.status === 'active')
        .reduce((sum, t) => sum + 29, 0), // Default $29/month
    };

    return { data: stats, error: null };
  } catch (err) {
    console.error('getPlatformStats error:', err);
    return { data: null, error: (err as Error).message };
  }
}