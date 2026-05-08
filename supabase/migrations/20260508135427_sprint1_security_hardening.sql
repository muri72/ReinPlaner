-- Sprint 1 — P0 Security Hardening
-- 1. Harden tenant-context functions (search_path lockdown)
-- 2. Drop broken set_config session-var fallback (transaction-local, never read)
-- 3. Add idempotency UNIQUE indexes for cron-generated artifacts

BEGIN;

-- =====================================================================
-- 1. Tenant context helpers — pin search_path, keep SECURITY DEFINER STABLE
-- =====================================================================

-- Canonical helper: tenant_id of the currently authenticated user.
-- Reads JWT custom claim first (zero round-trips), falls back to profiles.
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  claim_tenant uuid;
BEGIN
  -- Prefer JWT claim (no DB hit, no recursion risk on profiles RLS)
  BEGIN
    claim_tenant := NULLIF(auth.jwt() ->> 'tenant_id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    claim_tenant := NULL;
  END;

  IF claim_tenant IS NOT NULL THEN
    RETURN claim_tenant;
  END IF;

  RETURN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1);
END;
$$;

-- Backward-compat alias (existing RLS policies reference user_tenant_id())
CREATE OR REPLACE FUNCTION public.user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.current_tenant_id();
$$;

-- Hardened user_tenant_role() — pins search_path
CREATE OR REPLACE FUNCTION public.user_tenant_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- =====================================================================
-- 2. Drop broken transaction-local set_config fallback
-- The trigger on auth.users (if any) and helper function used
-- set_config('app.current_tenant_id', ..., true) which is local
-- to the txn and never readable from a subsequent query.
-- =====================================================================

DROP TRIGGER IF EXISTS on_auth_user_login_set_context ON auth.users;
DROP FUNCTION IF EXISTS public.set_tenant_context_for_user(uuid);

-- =====================================================================
-- 3. Idempotency guards for recurring-invoices cron
-- Prevent duplicate generation when cron runs twice in same window.
-- =====================================================================

-- Unique generated invoice per template per period (if columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices'
      AND column_name = 'recurring_template_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices'
      AND column_name = 'period_start'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_invoices_recurring_period
      ON public.invoices (recurring_template_id, period_start)
      WHERE recurring_template_id IS NOT NULL;
  END IF;
END $$;

COMMIT;
