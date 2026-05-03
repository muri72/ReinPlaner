-- =============================================================================
-- Multi-Tenant RLS: Tenant Context via JWT Custom Claim
-- 
-- Problem: RLS Policies nutzen current_setting('app.current_tenant_id')
-- aber diese Variable wurde nie gesetzt.
-- 
-- Lösung: tenant_id als Custom Claim im JWT, gelesen via auth.jwt()->>'tenant_id'
-- 
-- A) JWT Custom Claim setzen: tenant_id muss in auth.users.metadata.tenant_id
--    und im JWT Template als custom claim konfiguriert sein.
-- B) RLS Policies nutzen: tenant_id = (auth.jwt()->>'tenant_id')::uuid
-- C) Fallback: current_setting() als backup wenn JWT nicht gesetzt
-- =============================================================================

-- =============================================================================
-- PART 1: Helper function to set tenant context (backup for RPC calls)
-- =============================================================================
CREATE OR REPLACE FUNCTION set_tenant_context_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant_id_val uuid;
BEGIN
  -- SECURITY DEFINER läuft als postgres, daher RLS-frei
  SELECT tenant_id INTO tenant_id_val
  FROM profiles
  WHERE id = p_user_id;
  
  IF tenant_id_val IS NOT NULL THEN
    PERFORM set_config('app.current_tenant_id', tenant_id_val::text, true);
  END IF;
END;
$$;

-- =============================================================================
-- PART 2: Update RLS policies to use COALESCE of JWT claim + current_setting
-- This gives TWO fallback layers:
-- 1. Primary: auth.jwt()->>'tenant_id' (Custom JWT Claim)
-- 2. Fallback: current_setting() (manuell gesetzt via set_tenant_context)
-- 3. Ultimate fallback: '00000000-0000-0000-0000-000000000000' (nie matcht)
-- =============================================================================

-- Employees
DROP POLICY IF EXISTS employees_tenant_isolation ON employees;
CREATE POLICY employees_tenant_isolation ON employees
  FOR ALL
  USING (
    tenant_id = COALESCE(
      nullif((auth.jwt()->>'tenant_id'), '')::uuid,
      nullif(current_setting('app.current_tenant_id', true), '')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  );

-- Orders
DROP POLICY IF EXISTS orders_tenant_isolation ON orders;
CREATE POLICY orders_tenant_isolation ON orders
  FOR ALL
  USING (
    tenant_id = COALESCE(
      nullif((auth.jwt()->>'tenant_id'), '')::uuid,
      nullif(current_setting('app.current_tenant_id', true), '')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  );

-- Customers
DROP POLICY IF EXISTS customers_tenant_isolation ON customers;
CREATE POLICY customers_tenant_isolation ON customers
  FOR ALL
  USING (
    tenant_id = COALESCE(
      nullif((auth.jwt()->>'tenant_id'), '')::uuid,
      nullif(current_setting('app.current_tenant_id', true), '')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  );

-- Profiles
DROP POLICY IF EXISTS profiles_tenant_isolation ON profiles;
CREATE POLICY profiles_tenant_isolation ON profiles
  FOR ALL
  USING (
    tenant_id = COALESCE(
      nullif((auth.jwt()->>'tenant_id'), '')::uuid,
      nullif(current_setting('app.current_tenant_id', true), '')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  );

-- Shifts
DROP POLICY IF EXISTS shifts_tenant_isolation ON shifts;
CREATE POLICY shifts_tenant_isolation ON shifts
  FOR ALL
  USING (
    tenant_id = COALESCE(
      nullif((auth.jwt()->>'tenant_id'), '')::uuid,
      nullif(current_setting('app.current_tenant_id', true), '')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  );

-- Shift Overrides
DROP POLICY IF EXISTS shift_overrides_tenant_isolation ON shift_overrides;
CREATE POLICY shift_overrides_tenant_isolation ON shift_overrides
  FOR ALL
  USING (
    tenant_id = COALESCE(
      nullif((auth.jwt()->>'tenant_id'), '')::uuid,
      nullif(current_setting('app.current_tenant_id', true), '')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  );

-- Order Employee Assignments
DROP POLICY IF EXISTS order_employee_assignments_tenant_isolation ON order_employee_assignments;
CREATE POLICY order_employee_assignments_tenant_isolation ON order_employee_assignments
  FOR ALL
  USING (
    tenant_id = COALESCE(
      nullif((auth.jwt()->>'tenant_id'), '')::uuid,
      nullif(current_setting('app.current_tenant_id', true), '')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  );

-- Shift Employees
DROP POLICY IF EXISTS shift_employees_tenant_isolation ON shift_employees;
CREATE POLICY shift_employees_tenant_isolation ON shift_employees
  FOR ALL
  USING (
    tenant_id = COALESCE(
      nullif((auth.jwt()->>'tenant_id'), '')::uuid,
      nullif(current_setting('app.current_tenant_id', true), '')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  );

-- =============================================================================
-- PART 3: Trigger to set tenant_id in auth.users metadata
-- This enables the JWT custom claim (if JWT template is configured)
-- =============================================================================
CREATE OR REPLACE FUNCTION sync_tenant_id_to_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Wenn sich tenant_id in profiles ändert, auth.users.metadata aktualisieren
  IF NEW.tenant_id IS NOT NULL THEN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'),
      '{tenant_id}',
      to_jsonb(NEW.tenant_id::text)
    )
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_tenant_metadata ON profiles;
CREATE TRIGGER sync_tenant_metadata
  AFTER INSERT OR UPDATE OF tenant_id ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_tenant_id_to_metadata();

-- =============================================================================
-- PART 4: Login trigger to set current_setting on session start
-- Fires when a user signs in (last_sign_in_at changes)
-- =============================================================================
CREATE OR REPLACE FUNCTION on_auth_user_login_set_context()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant_id_val uuid;
BEGIN
  -- Get tenant_id from the user's profile
  SELECT tenant_id INTO tenant_id_val
  FROM profiles
  WHERE id = NEW.id;
  
  -- Set the session variable for RLS
  IF tenant_id_val IS NOT NULL THEN
    PERFORM set_config('app.current_tenant_id', tenant_id_val::text, true);
  ELSE
    PERFORM set_config('app.current_tenant_id', '00000000-0000-0000-0000-000000000000', true);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger fires when last_sign_in_at is updated (i.e., user logs in)
DROP TRIGGER IF EXISTS set_tenant_context_on_login ON auth.users;
CREATE TRIGGER set_tenant_context_on_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at)
  EXECUTE FUNCTION on_auth_user_login_set_context();

SELECT 'RLS tenant context setup complete' AS status;
