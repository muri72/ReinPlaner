-- =============================================================================
-- Tenant Admin RPC Functions
-- These functions bypass RLS for platform admin operations
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- FUNCTION: get_tenants_admin
-- Returns all tenants ordered by creation date (newest first)
-- SECURITY DEFINER: Runs with elevated privileges
-- =============================================================================
CREATE OR REPLACE FUNCTION get_tenants_admin()
RETURNS SETOF tenants AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM tenants
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (admins will be checked in the server action)
GRANT EXECUTE ON FUNCTION get_tenants_admin() TO authenticated;

-- =============================================================================
-- FUNCTION: get_tenant_by_id
-- Returns a single tenant by ID
-- SECURITY DEFINER: Runs with elevated privileges
-- =============================================================================
CREATE OR REPLACE FUNCTION get_tenant_by_id(tenant_id UUID)
RETURNS SETOF tenants AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM tenants
  WHERE id = tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_tenant_by_id(UUID) TO authenticated;

-- =============================================================================
-- FUNCTION: get_tenant_by_slug
-- Returns a single tenant by slug
-- SECURITY DEFINER: Runs with elevated privileges
-- =============================================================================
CREATE OR REPLACE FUNCTION get_tenant_by_slug(tenant_slug VARCHAR)
RETURNS SETOF tenants AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM tenants
  WHERE slug = tenant_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_tenant_by_slug(VARCHAR) TO authenticated;

-- =============================================================================
-- RLS POLICIES FOR TENANT TABLES
-- These policies complement the RPC functions for direct table access
-- =============================================================================

-- Drop existing policies if they exist (for idempotent migration)
DROP POLICY IF EXISTS "Platform admins can view all tenants" ON tenants;
DROP POLICY IF EXISTS "Tenants can view own record" ON tenants;
DROP POLICY IF EXISTS "Admins can manage tenants" ON tenants;
DROP POLICY IF EXISTS "Platform admins can update tenants" ON tenants;
DROP POLICY IF EXISTS "Platform admins can delete tenants" ON tenants;

-- =============================================================================
-- TENANTS TABLE POLICIES
-- =============================================================================

-- Policy: Platform admins can view all tenants
-- Checks if user has admin role in profiles table
CREATE POLICY "Platform admins can view all tenants" ON tenants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Platform admins can update tenants
CREATE POLICY "Platform admins can update tenants" ON tenants
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Platform admins can insert tenants
CREATE POLICY "Platform admins can insert tenants" ON tenants
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Platform admins can delete tenants (soft delete preferred)
CREATE POLICY "Platform admins can delete tenants" ON tenants
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- =============================================================================
-- TENANT_DOMAINS TABLE POLICIES
-- =============================================================================

-- Policy: Anyone can view verified domains (for custom domain lookup)
CREATE POLICY "Anyone can view verified domains" ON tenant_domains
    FOR SELECT
    USING (verified_at IS NOT NULL);

-- Policy: Platform admins can manage tenant domains
DROP POLICY IF EXISTS "Platform admins can manage tenant domains" ON tenant_domains;
CREATE POLICY "Platform admins can manage tenant domains" ON tenant_domains
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- =============================================================================
-- TENANT_USERS TABLE POLICIES
-- =============================================================================

-- Policy: Platform admins can view all tenant users
DROP POLICY IF EXISTS "Platform admins can view tenant users" ON tenant_users;
CREATE POLICY "Platform admins can view tenant users" ON tenant_users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Platform admins can manage tenant users
DROP POLICY IF EXISTS "Platform admins can manage tenant users" ON tenant_users;
CREATE POLICY "Platform admins can manage tenant users" ON tenant_users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- =============================================================================
-- TENANT_AUDIT_LOG TABLE POLICIES
-- =============================================================================

-- Policy: Platform admins can view all audit logs
DROP POLICY IF EXISTS "Platform admins can view audit logs" ON tenant_audit_log;
CREATE POLICY "Platform admins can view audit logs" ON tenant_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: System can insert audit logs
DROP POLICY IF EXISTS "System can insert audit logs" ON tenant_audit_log;
CREATE POLICY "System can insert audit logs" ON tenant_audit_log
    FOR INSERT
    WITH CHECK (true); -- Service role can always insert

-- =============================================================================
-- HELPER FUNCTION: Check if user is platform admin
-- =============================================================================
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
BEGIN
  -- Verify functions were created
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_tenants_admin'
  ) THEN
    RAISE EXCEPTION 'Function get_tenants_admin was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_tenant_by_id'
  ) THEN
    RAISE EXCEPTION 'Function get_tenant_by_id was not created';
  END IF;

  -- Verify RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'tenants'
    AND rowsecurity = true
  ) THEN
    RAISE WARNING 'RLS is not enabled on tenants table';
  END IF;

  RAISE NOTICE 'Tenant admin RPC functions and RLS policies created successfully';
END $$;
