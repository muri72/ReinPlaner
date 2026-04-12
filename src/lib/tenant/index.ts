/**
 * ReinPlaner Multi-Tenant Module
 * 
 * Export all tenant-related types and utilities
 */

// Types
export type {
  Tenant,
  TenantPlan,
  TenantStatus,
  TenantSettings,
  TenantContext,
  TenantRegistry,
  CreateTenantInput,
  TenantDomain,
} from './types';

export {
  extractTenantFromSubdomain,
  isCustomDomain,
} from './types';

// Registry functions
export {
  getTenantBySlug,
  getTenantByDomain,
  getTenantById,
  createTenant,
  updateTenant,
  clearTenantCache,
} from './registry';

// React context
export {
  TenantProvider,
  useTenant,
  useTenantHasFeature,
  useTenantLimits,
  isFeatureAvailableForPlan,
} from './context';
