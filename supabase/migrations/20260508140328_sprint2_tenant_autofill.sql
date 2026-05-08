-- Sprint 2 — Tenant-id auto-fill triggers + NOT NULL hardening
--
-- 1. Generic SECURITY DEFINER trigger function `fill_tenant_id_default`
--    populates NEW.tenant_id from `current_tenant_id()` whenever a row
--    is inserted without one. If no tenant context exists, the insert
--    is rejected — eliminating the silent-NULL footgun.
--
-- 2. Backfills shift_employees.tenant_id from shifts.tenant_id
--    (production had 100 NULL rows).
--
-- 3. Applies the trigger to all existing tenant-scoped tables and
--    enforces NOT NULL once no remaining nulls exist.

BEGIN;

CREATE OR REPLACE FUNCTION public.fill_tenant_id_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  ctx_tenant uuid;
BEGIN
  IF NEW.tenant_id IS NULL THEN
    ctx_tenant := public.current_tenant_id();
    IF ctx_tenant IS NULL THEN
      RAISE EXCEPTION 'tenant_id required: no tenant context (JWT/profile) available';
    END IF;
    NEW.tenant_id := ctx_tenant;
  END IF;
  RETURN NEW;
END;
$fn$;

UPDATE public.shift_employees se
SET tenant_id = s.tenant_id
FROM public.shifts s
WHERE se.shift_id = s.id
  AND se.tenant_id IS NULL
  AND s.tenant_id IS NOT NULL;

DO $apply$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'customers',
    'employees',
    'orders',
    'shifts',
    'shift_employees',
    'shift_overrides',
    'time_entries',
    'order_employee_assignments',
    'tenant_audit_log',
    'tenant_domains',
    'tenant_users'
  ];
  null_count bigint;
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_fill_tenant_id ON public.%I',
      tbl
    );
    EXECUTE format(
      'CREATE TRIGGER trg_fill_tenant_id
         BEFORE INSERT ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.fill_tenant_id_default()',
      tbl
    );

    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id IS NULL', tbl)
      INTO null_count;
    IF null_count = 0 THEN
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL',
        tbl
      );
    ELSE
      RAISE NOTICE 'skipping NOT NULL on %: % rows still null', tbl, null_count;
    END IF;
  END LOOP;
END;
$apply$;

COMMIT;
