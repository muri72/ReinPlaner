/**
 * ReinPlaner Multi-Tenant Types
 * 
 * Core types for multi-tenant architecture using Database-per-Tenant pattern.
 */

export type TenantPlan = 'starter' | 'professional' | 'enterprise';

export type TenantStatus = 'active' | 'suspended' | 'pending' | 'cancelled';

export interface TenantSettings {
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
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  domain?: string | null;
  plan: TenantPlan;
  status: TenantStatus;
  settings: TenantSettings;
  database_url?: string; // Only available for enterprise/privileged tenants
  created_at: string;
  updated_at: string;
}

export interface TenantContext {
  tenant: Tenant;
  userId?: string;
  userRole?: string;
}

export interface TenantRegistry {
  getTenantBySlug(slug: string): Promise<Tenant | null>;
  getTenantByDomain(domain: string): Promise<Tenant | null>;
  getTenantById(id: string): Promise<Tenant | null>;
  createTenant(data: CreateTenantInput): Promise<Tenant>;
  updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant>;
}

export interface CreateTenantInput {
  slug: string;
  name: string;
  domain?: string;
  plan?: TenantPlan;
  settings?: TenantSettings;
}

export interface TenantDomain {
  id: string;
  tenant_id: string;
  domain: string;
  is_primary: boolean;
  verified_at: string | null;
}

/**
 * Extract tenant slug from subdomain
 * e.g., "firma1.reinplaner.de" -> "firma1"
 */
export function extractTenantFromSubdomain(hostname: string, baseDomain: string = 'reinplaner.de'): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];
  
  // Check if it's a subdomain of our base domain
  if (host.endsWith(`.${baseDomain}`)) {
    const subdomain = host.replace(`.${baseDomain}`, '');
    // Don't treat 'www' or 'app' as tenant
    if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
      return subdomain;
    }
  }
  
  // Check if it's the base domain itself (main tenant)
  if (host === baseDomain || host === `www.${baseDomain}`) {
    return 'reinplaner'; // Default tenant
  }
  
  return null;
}

/**
 * Check if a domain is a custom domain (not our base domain)
 */
export function isCustomDomain(hostname: string, baseDomain: string = 'reinplaner.de'): boolean {
  const host = hostname.split(':')[0];
  return !host.endsWith(`.${baseDomain}`) && host !== baseDomain;
}
