-- Migration: Add platform_admin role for cross-tenant platform administration
-- This role is for Murat only - enables access to /dashboard/admin/* routes
-- that manage the entire platform (all tenants).

-- Step 1: Add CHECK constraint to restrict role to valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'profiles'::regclass
    AND conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('admin', 'manager', 'employee', 'customer', 'platform_admin'));
  END IF;
END $$;

-- Step 2: Create helper function to check if current user is platform_admin
-- SECURITY DEFINER so it bypasses RLS when called
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
STABLE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'platform_admin'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Step 3: Create function to check platform_admin status for any user
CREATE OR REPLACE FUNCTION user_is_platform_admin(user_id UUID)
RETURNS BOOLEAN
STABLE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role = 'platform_admin'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Step 4: Grant execute on new functions
GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION user_is_platform_admin(UUID) TO authenticated;
