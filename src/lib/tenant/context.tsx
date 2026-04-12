/**
 * Tenant Context Provider
 * 
 * React context for accessing tenant information in components.
 * This is the client-side interface for multi-tenant data.
 */

'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { Tenant, TenantPlan, TenantSettings, TenantStatus } from './types';

// Re-export types for convenience
export type { Tenant, TenantPlan, TenantSettings, TenantStatus } from './types';

// Context shape
interface TenantContextValue {
  tenant: Tenant | null;
  isLoading: boolean;
  error: Error | null;
}

// Default empty tenant context
const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  isLoading: false,
  error: null,
});

// Provider props
interface TenantProviderProps {
  children: ReactNode;
  initialTenant?: Tenant | null;
}

// Provider component (for future dynamic tenant loading)
export function TenantProvider({ children, initialTenant = null }: TenantProviderProps) {
  // In a full implementation, this would fetch tenant data based on
  // the x-tenant-slug header set by middleware
  return (
    <TenantContext.Provider value={{
      tenant: initialTenant,
      isLoading: false,
      error: null,
    }}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook to access current tenant context
 */
export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

/**
 * Hook to check if current tenant has a specific feature
 */
export function useTenantHasFeature(feature: keyof TenantSettings['features']): boolean {
  const { tenant } = useTenant();
  if (!tenant?.settings?.features) return false;
  return tenant.settings.features[feature] ?? false;
}

/**
 * Hook to get tenant plan limits
 */
export function useTenantLimits() {
  const { tenant } = useTenant();
  
  const defaultLimits = {
    maxUsers: 5,
    maxOrdersPerMonth: 1000,
    storageMb: 1000,
  };
  
  if (!tenant?.settings?.limits) {
    return defaultLimits;
  }
  
  return {
    maxUsers: tenant.settings.limits.max_users ?? defaultLimits.maxUsers,
    maxOrdersPerMonth: tenant.settings.limits.max_orders_per_month ?? defaultLimits.maxOrdersPerMonth,
    storageMb: tenant.settings.limits.storage_mb ?? defaultLimits.storageMb,
  };
}

/**
 * Check if a feature is available for a given plan
 */
export function isFeatureAvailableForPlan(
  feature: string,
  plan: TenantPlan
): boolean {
  const featureMatrix: Record<string, TenantPlan[]> = {
    api_access: ['professional', 'enterprise'],
    sso: ['enterprise'],
    custom_backup: ['enterprise'],
    unlimited_users: ['enterprise'],
    priority_support: ['professional', 'enterprise'],
    custom_domain: ['professional', 'enterprise'],
    white_labeling: ['enterprise'],
    audit_logs: ['professional', 'enterprise'],
    advanced_reporting: ['professional', 'enterprise'],
  };
  
  return featureMatrix[feature]?.includes(plan) ?? false;
}
