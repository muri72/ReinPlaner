/**
 * Tenant Registry - Core multi-tenant functionality
 * 
 * This module provides functions to manage tenant data.
 * In a production environment, this would connect to a shared Meta-DB.
 * For now, it provides the foundation for multi-tenant support.
 */

import { createClient } from '@supabase/supabase-js';
import type { Tenant, TenantPlan, TenantStatus, TenantSettings, CreateTenantInput } from './types';

// Meta-database client (shared across all tenants)
const META_SUPABASE_URL = process.env.META_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const META_SUPABASE_SERVICE_KEY = process.env.META_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

let metaClient: ReturnType<typeof createClient> | null = null;

function getMetaClient() {
  if (!metaClient && META_SUPABASE_URL && META_SUPABASE_SERVICE_KEY) {
    metaClient = createClient(META_SUPABASE_URL, META_SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false }
    });
  }
  return metaClient;
}

// In-memory cache for tenant data (to reduce DB calls)
const tenantCache = new Map<string, { tenant: Tenant; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

/**
 * Get tenant by slug
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const cached = tenantCache.get(`slug:${slug}`);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tenant;
  }

  const client = getMetaClient();
  if (!client) {
    // Fallback: return current tenant from environment
    return getDefaultTenant();
  }

  // Direct query approach
  const { data: rowData } = await client
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .limit(1);
  
  if (!rowData || rowData.length === 0) {
    return null;
  }
  
  const tenant = mapRowToTenant(rowData[0] as Record<string, unknown>);
  tenantCache.set(`slug:${slug}`, { tenant, expiresAt: Date.now() + CACHE_TTL_MS });
  return tenant;
}

/**
 * Get tenant by domain (including custom domains)
 */
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  const cached = tenantCache.get(`domain:${domain}`);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tenant;
  }

  const client = getMetaClient();
  if (!client) {
    return getDefaultTenant();
  }

  // Direct query approach with raw SQL to avoid type issues
  const { data: tenantData } = await client
    .from('tenants')
    .select('*')
    .eq('domain', domain)
    .limit(1);

  if (tenantData && tenantData.length > 0) {
    const tenant = mapRowToTenant(tenantData[0] as Record<string, unknown>);
    tenantCache.set(`domain:${domain}`, { tenant, expiresAt: Date.now() + CACHE_TTL_MS });
    return tenant;
  }

  // Check tenant_domains table for custom domains
  const { data: domainRows } = await client
    .from('tenant_domains')
    .select('tenant_id')
    .eq('domain', domain)
    .limit(1) as { data: Array<{ tenant_id: string }> | null };

  if (!domainRows || domainRows.length === 0) {
    return null;
  }

  const tenantId = domainRows[0]?.tenant_id;
  if (!tenantId) {
    return null;
  }

  const tenant = await getTenantById(tenantId as string);
  if (tenant) {
    tenantCache.set(`domain:${domain}`, { tenant, expiresAt: Date.now() + CACHE_TTL_MS });
  }
  return tenant;
}

/**
 * Get tenant by ID
 */
export async function getTenantById(id: string): Promise<Tenant | null> {
  const cached = tenantCache.get(`id:${id}`);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tenant;
  }

  const client = getMetaClient();
  if (!client) {
    return getDefaultTenant();
  }

  const { data: rows } = await client
    .from('tenants')
    .select('*')
    .eq('id', id)
    .limit(1);

  if (!rows || rows.length === 0) {
    return null;
  }

  const tenant = mapRowToTenant(rows[0] as Record<string, unknown>);
  tenantCache.set(`id:${id}`, { tenant, expiresAt: Date.now() + CACHE_TTL_MS });
  return tenant;
}

/**
 * Create a new tenant
 */
export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const client = getMetaClient();
  if (!client) {
    throw new Error('Meta database not configured');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('tenants')
    .insert({
      slug: input.slug,
      name: input.name,
      domain: input.domain || null,
      plan: input.plan || 'starter',
      status: 'pending',
      settings: input.settings || {},
    })
    .select()
    .limit(1);

  if (error || !data || data.length === 0) {
    throw new Error(`Failed to create tenant: ${error?.message}`);
  }

  return mapRowToTenant(data[0] as Record<string, unknown>);
}

/**
 * Update tenant
 */
export async function updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant> {
  const client = getMetaClient();
  if (!client) {
    throw new Error('Meta database not configured');
  }

  const updateData: Record<string, unknown> = {};
  if (updates.name) updateData.name = updates.name;
  if (updates.domain) updateData.domain = updates.domain;
  if (updates.plan) updateData.plan = updates.plan;
  if (updates.status) updateData.status = updates.status;
  if (updates.settings) updateData.settings = updates.settings;
  updateData.updated_at = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('tenants')
    .update(updateData)
    .eq('id', id)
    .select()
    .limit(1);

  if (error || !data || data.length === 0) {
    throw new Error(`Failed to update tenant: ${error?.message}`);
  }

  // Invalidate cache
  tenantCache.delete(`id:${id}`);
  
  return mapRowToTenant(data[0] as Record<string, unknown>);
}

/**
 * Get default tenant from environment (for single-tenant mode / migration)
 */
function getDefaultTenant(): Tenant {
  return {
    id: process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001',
    slug: 'reinplaner',
    name: 'ReinPlaner',
    domain: 'reinplaner.de',
    plan: 'starter',
    status: 'active',
    settings: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

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

/**
 * Clear tenant cache (useful for testing or manual invalidation)
 */
export function clearTenantCache(): void {
  tenantCache.clear();
}
