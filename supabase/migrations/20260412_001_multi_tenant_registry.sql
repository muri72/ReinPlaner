-- Multi-Tenant Architecture: Tenant Registry
-- This migration creates the meta-database schema for managing tenants
-- In a production environment, this would be a separate Supabase project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TENANTS TABLE - Main tenant registry
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    plan VARCHAR(20) NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'enterprise')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'suspended', 'pending', 'cancelled')),
    
    -- Database connection (for dedicated tenant DBs)
    database_host VARCHAR(255),
    database_port INTEGER DEFAULT 5432,
    database_name VARCHAR(100),
    database_user VARCHAR(100),
    database_password_encrypted TEXT,
    
    -- Settings as JSONB for flexibility
    settings JSONB DEFAULT '{}',
    
    -- Subscription/Billing
    subscription_start DATE,
    subscription_end DATE,
    monthly_rate_cents INTEGER DEFAULT 2900, -- €29.00
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    suspended_at TIMESTAMPTZ,
    suspended_reason TEXT
);

-- Index for common lookups
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);

-- =============================================================================
-- TENANT DOMAINS - Custom domain mapping
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenant_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    verification_token VARCHAR(100),
    verification_method VARCHAR(20) DEFAULT 'dns_txt',
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(tenant_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_tenant_domains_tenant ON tenant_domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_domain ON tenant_domains(domain);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_verified ON tenant_domains(verified_at) WHERE verified_at IS NULL;

-- =============================================================================
-- TENANT USERS - Links users to tenants (for users in meta-DB)
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    
    -- Reference to Supabase Auth ID (if using centralized auth)
    auth_id UUID,
    
    -- User limits based on plan
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    invited_by UUID,
    joined_at TIMESTAMPTZ,
    
    UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_email ON tenant_users(email);
CREATE INDEX IF NOT EXISTS idx_tenant_users_auth ON tenant_users(auth_id);

-- =============================================================================
-- AUDIT LOG - Tenant-level audit trail
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenant_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_id UUID, -- User who performed the action
    actor_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_audit_tenant ON tenant_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_actor ON tenant_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_created ON tenant_audit_log(created_at DESC);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tenants table
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_audit_log ENABLE ROW LEVEL SECURITY;

-- Tenants: Only platform admins can view/edit all tenants
-- Tenants can view their own record
CREATE POLICY "Platform admins can view all tenants" ON tenants
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'platform_admin'
    );

CREATE POLICY "Tenants can view own record" ON tenants
    FOR SELECT USING (
        slug = auth.jwt() ->> 'tenant_slug'
    );

-- Tenant domains: Public read for verification, admin write
CREATE POLICY "Anyone can view verified domains" ON tenant_domains
    FOR SELECT USING (
        verified_at IS NOT NULL
    );

-- Tenant users: Tenant admins can manage their users
CREATE POLICY "Tenant admins can manage tenant users" ON tenant_users
    FOR ALL USING (
        tenant_id IN (
            SELECT id FROM tenants 
            WHERE slug = auth.jwt() ->> 'tenant_slug'
            AND EXISTS (
                SELECT 1 FROM tenant_users 
                WHERE tenant_id = tenants.id 
                AND email = auth.jwt() ->> 'email'
                AND role IN ('owner', 'admin')
            )
        )
    );

-- Audit log: Tenant users can view their tenant's logs
CREATE POLICY "Tenant users can view own tenant audit logs" ON tenant_audit_log
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- =============================================================================
-- SEED DATA - Default tenant for ReinPlaner
-- =============================================================================
INSERT INTO tenants (slug, name, domain, plan, status, settings) 
VALUES (
    'reinplaner',
    'ReinPlaner',
    'reinplaner.de',
    'starter',
    'active',
    '{
        "branding": {
            "logo_url": null,
            "primary_color": "#3B82F6",
            "company_name": "ReinPlaner"
        },
        "features": {
            "api_access": false,
            "sso": false,
            "custom_backup": false
        },
        "limits": {
            "max_users": 5,
            "max_orders_per_month": 1000,
            "storage_mb": 1000
        }
    }'::jsonb
) ON CONFLICT (slug) DO NOTHING;
