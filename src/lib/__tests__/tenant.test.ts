import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractTenantFromSubdomain,
  isCustomDomain,
  type TenantPlan,
  type TenantStatus,
  type TenantSettings,
  type Tenant,
  type CreateTenantInput,
} from '@/lib/tenant/types';

describe('Tenant Types', () => {
  describe('extractTenantFromSubdomain', () => {
    it('should extract tenant from standard subdomain', () => {
      expect(extractTenantFromSubdomain('firma1.reinplaner.de')).toBe('firma1');
      expect(extractTenantFromSubdomain('firma2.reinplaner.de')).toBe('firma2');
      expect(extractTenantFromSubdomain('mycompany.reinplaner.de')).toBe('mycompany');
    });

    it('should extract tenant from subdomain with port', () => {
      expect(extractTenantFromSubdomain('firma1.reinplaner.de:3000')).toBe('firma1');
      expect(extractTenantFromSubdomain('test.reinplaner.de:8080')).toBe('test');
    });

    it('should return default tenant for www subdomain', () => {
      // Note: 'www' is rejected as a tenant subdomain, but www.reinplaner.de returns default tenant
      expect(extractTenantFromSubdomain('www.reinplaner.de')).toBe('reinplaner');
      expect(extractTenantFromSubdomain('www.reinplaner.de:3000')).toBe('reinplaner');
    });

    it('should return null for app subdomain', () => {
      expect(extractTenantFromSubdomain('app.reinplaner.de')).toBeNull();
    });

    it('should return default tenant for base domain', () => {
      expect(extractTenantFromSubdomain('reinplaner.de')).toBe('reinplaner');
      expect(extractTenantFromSubdomain('reinplaner.de:3000')).toBe('reinplaner');
    });

    it('should return null for unrelated domains', () => {
      expect(extractTenantFromSubdomain('example.com')).toBeNull();
      expect(extractTenantFromSubdomain('notasubdomain.de')).toBeNull();
      expect(extractTenantFromSubdomain('firma1.different-domain.de')).toBeNull();
    });

    it('should handle custom base domain', () => {
      expect(extractTenantFromSubdomain('firma1.custom-domain.com', 'custom-domain.com')).toBe('firma1');
      expect(extractTenantFromSubdomain('custom-domain.com', 'custom-domain.com')).toBe('reinplaner');
    });

    it('should handle subdomain with multiple dots', () => {
      expect(extractTenantFromSubdomain('sub.firma1.reinplaner.de')).toBe('sub.firma1');
    });

    it('should return null for empty subdomain prefix', () => {
      expect(extractTenantFromSubdomain('.reinplaner.de')).toBeNull();
    });
  });

  describe('isCustomDomain', () => {
    it('should return true for custom domains', () => {
      expect(isCustomDomain('firma1.de')).toBe(true);
      expect(isCustomDomain('reinplaner.company.com')).toBe(true);
      expect(isCustomDomain('custom.domain.io')).toBe(true);
    });

    it('should return false for subdomains of base domain', () => {
      expect(isCustomDomain('firma1.reinplaner.de')).toBe(false);
      expect(isCustomDomain('test.reinplaner.de')).toBe(false);
      expect(isCustomDomain('app.reinplaner.de')).toBe(false);
    });

    it('should return false for base domain itself', () => {
      expect(isCustomDomain('reinplaner.de')).toBe(false);
      expect(isCustomDomain('reinplaner.de:3000')).toBe(false);
    });

    it('should handle custom base domain', () => {
      expect(isCustomDomain('firma1.custom-domain.com', 'custom-domain.com')).toBe(false);
      expect(isCustomDomain('custom-domain.com', 'custom-domain.com')).toBe(false);
      expect(isCustomDomain('other.com', 'custom-domain.com')).toBe(true);
    });

    it('should handle domains with port', () => {
      expect(isCustomDomain('firma1.reinplaner.de:3000')).toBe(false);
      expect(isCustomDomain('custom.com:8080')).toBe(true);
    });
  });

  describe('Tenant type definitions', () => {
    it('should accept valid tenant plans', () => {
      const plans: TenantPlan[] = ['starter', 'professional', 'enterprise'];
      plans.forEach(plan => {
        const tenant: Tenant = {
          id: '123',
          slug: 'test',
          name: 'Test Tenant',
          plan,
          status: 'active',
          settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        expect(tenant.plan).toBe(plan);
      });
    });

    it('should accept valid tenant statuses', () => {
      const statuses: TenantStatus[] = ['active', 'suspended', 'pending', 'cancelled'];
      statuses.forEach(status => {
        const tenant: Tenant = {
          id: '123',
          slug: 'test',
          name: 'Test Tenant',
          plan: 'starter',
          status,
          settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        expect(tenant.status).toBe(status);
      });
    });

    it('should accept tenant with full settings', () => {
      const settings: TenantSettings = {
        branding: {
          logo_url: 'https://example.com/logo.png',
          primary_color: '#0066CC',
          company_name: 'Test Company',
        },
        features: {
          api_access: true,
          sso: false,
          custom_backup: true,
        },
        limits: {
          max_users: 100,
          max_orders_per_month: 5000,
          storage_mb: 10240,
        },
      };

      const tenant: Tenant = {
        id: '123',
        slug: 'test',
        name: 'Test Tenant',
        plan: 'enterprise',
        status: 'active',
        settings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(tenant.settings.branding?.logo_url).toBe('https://example.com/logo.png');
      expect(tenant.settings.features?.api_access).toBe(true);
      expect(tenant.settings.limits?.max_users).toBe(100);
    });

    it('should accept CreateTenantInput with minimal fields', () => {
      const input: CreateTenantInput = {
        slug: 'new-tenant',
        name: 'New Tenant',
      };
      expect(input.slug).toBe('new-tenant');
      expect(input.name).toBe('New Tenant');
      expect(input.plan).toBeUndefined();
      expect(input.settings).toBeUndefined();
    });

    it('should accept CreateTenantInput with all fields', () => {
      const input: CreateTenantInput = {
        slug: 'new-tenant',
        name: 'New Tenant',
        domain: 'example.com',
        plan: 'professional',
        settings: {
          branding: {
            company_name: 'Example',
          },
        },
      };
      expect(input.domain).toBe('example.com');
      expect(input.plan).toBe('professional');
      expect(input.settings?.branding?.company_name).toBe('Example');
    });
  });
});
