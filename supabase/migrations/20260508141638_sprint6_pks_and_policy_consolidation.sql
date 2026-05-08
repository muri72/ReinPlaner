-- Sprint 6 — primary keys + consolidate multiple_permissive_policies
-- Idempotent. Replaces overlapping per-role policies with a single permissive
-- policy per (table, action). RLS-helper functions wrapped in (select ...)
-- to keep auth_rls_initplan clean.

-- ============================================================================
-- 1. Add missing PRIMARY KEY constraints (verified zero duplicates on `id`)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.customers'::regclass AND contype='p') THEN
    ALTER TABLE public.customers ADD CONSTRAINT customers_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.shifts'::regclass AND contype='p') THEN
    ALTER TABLE public.shifts ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.time_entries'::regclass AND contype='p') THEN
    ALTER TABLE public.time_entries ADD CONSTRAINT time_entries_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.shift_employees'::regclass AND contype='p') THEN
    ALTER TABLE public.shift_employees ADD CONSTRAINT shift_employees_pkey PRIMARY KEY (id);
  END IF;
END$$;

-- ============================================================================
-- 2. Consolidate overlapping policies for core multi-tenant tables.
-- One permissive policy per (table, action) covering all roles.
-- ============================================================================

-- ---------- tenants ----------
DROP POLICY IF EXISTS tenants_platform_admin_all ON public.tenants;
DROP POLICY IF EXISTS "Platform admins can view all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Tenants can view own record" ON public.tenants;

CREATE POLICY tenants_select ON public.tenants
  FOR SELECT USING (
    (select is_platform_admin())
    OR (slug)::text = ((select auth.jwt()) ->> 'tenant_slug')
  );

CREATE POLICY tenants_modify ON public.tenants
  FOR ALL USING ((select is_platform_admin()))
  WITH CHECK ((select is_platform_admin()));

-- ---------- customers ----------
DROP POLICY IF EXISTS customers_admin ON public.customers;
DROP POLICY IF EXISTS customers_employee ON public.customers;
DROP POLICY IF EXISTS customers_customer ON public.customers;

CREATE POLICY customers_select ON public.customers
  FOR SELECT USING (
    (select has_tenant_access(tenant_id))
    AND (
      (select is_platform_admin())
      OR (select user_tenant_role()) = ANY (ARRAY['admin','manager','employee','customer'])
    )
  );

CREATE POLICY customers_modify ON public.customers
  FOR ALL USING (
    (select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager']))
  )
  WITH CHECK (
    (select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager']))
  );

-- ---------- employees ----------
DROP POLICY IF EXISTS employees_admin ON public.employees;
DROP POLICY IF EXISTS employees_employee ON public.employees;
DROP POLICY IF EXISTS employees_manager ON public.employees;
DROP POLICY IF EXISTS employees_manager_update ON public.employees;
DROP POLICY IF EXISTS employees_insert ON public.employees;

CREATE POLICY employees_select ON public.employees
  FOR SELECT USING (
    (select has_tenant_access(tenant_id))
    AND (
      (select is_platform_admin())
      OR (select user_tenant_role()) = ANY (ARRAY['admin','manager','employee'])
    )
  );

CREATE POLICY employees_insert ON public.employees
  FOR INSERT WITH CHECK (
    (select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager']))
  );

CREATE POLICY employees_update ON public.employees
  FOR UPDATE USING (
    (select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager']))
  )
  WITH CHECK (
    (select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager']))
  );

CREATE POLICY employees_delete ON public.employees
  FOR DELETE USING (
    (select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = 'admin')
  );

-- ---------- orders ----------
DROP POLICY IF EXISTS orders_admin ON public.orders;
DROP POLICY IF EXISTS orders_employee ON public.orders;
DROP POLICY IF EXISTS orders_manager ON public.orders;
DROP POLICY IF EXISTS orders_manager_update ON public.orders;
DROP POLICY IF EXISTS orders_insert ON public.orders;

CREATE POLICY orders_select ON public.orders
  FOR SELECT USING (
    (select has_tenant_access(tenant_id))
    AND (
      (select is_platform_admin())
      OR (select user_tenant_role()) = ANY (ARRAY['admin','manager'])
      OR (
        (select user_tenant_role()) = 'employee'
        AND id IN (
          SELECT oea.order_id FROM public.order_employee_assignments oea
          WHERE oea.employee_id IN (SELECT e.id FROM public.employees e WHERE e.user_id = (select auth.uid()))
        )
      )
    )
  );

CREATE POLICY orders_insert ON public.orders
  FOR INSERT WITH CHECK (
    (select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager']))
  );

CREATE POLICY orders_update ON public.orders
  FOR UPDATE USING (
    (select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager']))
  )
  WITH CHECK (
    (select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager']))
  );

CREATE POLICY orders_delete ON public.orders
  FOR DELETE USING (
    (select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = 'admin')
  );

-- ---------- shifts ----------
DROP POLICY IF EXISTS shifts_admin ON public.shifts;
DROP POLICY IF EXISTS shifts_employee ON public.shifts;
DROP POLICY IF EXISTS shifts_manager ON public.shifts;
DROP POLICY IF EXISTS shifts_manager_update ON public.shifts;
DROP POLICY IF EXISTS shifts_insert ON public.shifts;

CREATE POLICY shifts_select ON public.shifts
  FOR SELECT USING (
    (select has_tenant_access(tenant_id))
    AND (
      (select is_platform_admin())
      OR (select user_tenant_role()) = ANY (ARRAY['admin','manager'])
      OR (
        (select user_tenant_role()) = 'employee'
        AND id IN (
          SELECT se.shift_id FROM public.shift_employees se
          WHERE se.employee_id IN (SELECT e.id FROM public.employees e WHERE e.user_id = (select auth.uid()))
        )
      )
    )
  );

CREATE POLICY shifts_insert ON public.shifts
  FOR INSERT WITH CHECK (
    (select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager']))
  );

CREATE POLICY shifts_update ON public.shifts
  FOR UPDATE USING (
    (select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager']))
  )
  WITH CHECK (
    (select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager']))
  );

CREATE POLICY shifts_delete ON public.shifts
  FOR DELETE USING (
    (select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = 'admin')
  );

-- ---------- shift_employees ----------
DROP POLICY IF EXISTS shift_employees_admin ON public.shift_employees;
DROP POLICY IF EXISTS shift_employees_employee ON public.shift_employees;
DROP POLICY IF EXISTS shift_employees_manager ON public.shift_employees;

CREATE POLICY shift_employees_select ON public.shift_employees
  FOR SELECT USING (
    (select has_tenant_access(tenant_id))
    AND (
      (select is_platform_admin())
      OR (select user_tenant_role()) = ANY (ARRAY['admin','manager'])
      OR (
        (select user_tenant_role()) = 'employee'
        AND employee_id IN (SELECT e.id FROM public.employees e WHERE e.user_id = (select auth.uid()))
      )
    )
  );

CREATE POLICY shift_employees_modify ON public.shift_employees
  FOR ALL USING (
    (select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager']))
  )
  WITH CHECK (
    (select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager']))
  );

-- ---------- order_employee_assignments ----------
DROP POLICY IF EXISTS order_employee_assignments_admin ON public.order_employee_assignments;
DROP POLICY IF EXISTS order_employee_assignments_employee ON public.order_employee_assignments;
DROP POLICY IF EXISTS order_employee_assignments_manager ON public.order_employee_assignments;

CREATE POLICY order_employee_assignments_select ON public.order_employee_assignments
  FOR SELECT USING (
    (select has_tenant_access(tenant_id))
    AND (
      (select is_platform_admin())
      OR (select user_tenant_role()) = ANY (ARRAY['admin','manager'])
      OR (
        (select user_tenant_role()) = 'employee'
        AND employee_id IN (SELECT e.id FROM public.employees e WHERE e.user_id = (select auth.uid()))
      )
    )
  );

CREATE POLICY order_employee_assignments_modify ON public.order_employee_assignments
  FOR ALL USING (
    (select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager']))
  )
  WITH CHECK (
    (select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager']))
  );

-- ---------- time_entries ----------
DROP POLICY IF EXISTS time_entries_admin ON public.time_entries;
DROP POLICY IF EXISTS time_entries_employee ON public.time_entries;
DROP POLICY IF EXISTS time_entries_manager ON public.time_entries;
DROP POLICY IF EXISTS time_entries_employee_insert ON public.time_entries;
DROP POLICY IF EXISTS time_entries_employee_update ON public.time_entries;

CREATE POLICY time_entries_select ON public.time_entries
  FOR SELECT USING (
    (select has_tenant_access(tenant_id))
    AND (
      (select is_platform_admin())
      OR (select user_tenant_role()) = ANY (ARRAY['admin','manager'])
      OR (
        (select user_tenant_role()) = 'employee'
        AND employee_id IN (SELECT e.id FROM public.employees e WHERE e.user_id = (select auth.uid()))
      )
    )
  );

CREATE POLICY time_entries_insert ON public.time_entries
  FOR INSERT WITH CHECK (
    (select has_tenant_access(tenant_id))
    AND (
      (select is_platform_admin())
      OR (select user_tenant_role()) = 'admin'
      OR (
        (select user_tenant_role()) = 'employee'
        AND employee_id IN (SELECT e.id FROM public.employees e WHERE e.user_id = (select auth.uid()))
      )
    )
  );

CREATE POLICY time_entries_update ON public.time_entries
  FOR UPDATE USING (
    (select has_tenant_access(tenant_id))
    AND (
      (select is_platform_admin())
      OR (select user_tenant_role()) = 'admin'
      OR (
        (select user_tenant_role()) = 'employee'
        AND employee_id IN (SELECT e.id FROM public.employees e WHERE e.user_id = (select auth.uid()))
      )
    )
  )
  WITH CHECK (
    (select has_tenant_access(tenant_id))
    AND (
      (select is_platform_admin())
      OR (select user_tenant_role()) = 'admin'
      OR (
        (select user_tenant_role()) = 'employee'
        AND employee_id IN (SELECT e.id FROM public.employees e WHERE e.user_id = (select auth.uid()))
      )
    )
  );

CREATE POLICY time_entries_delete ON public.time_entries
  FOR DELETE USING (
    (select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = 'admin')
  );

-- ---------- impersonation_sessions ----------
DROP POLICY IF EXISTS impersonation_sessions_actor_select ON public.impersonation_sessions;
DROP POLICY IF EXISTS impersonation_sessions_platform_admin_all ON public.impersonation_sessions;

CREATE POLICY impersonation_sessions_select ON public.impersonation_sessions
  FOR SELECT USING (
    (select is_platform_admin())
    OR platform_admin_id = (select auth.uid())
  );

CREATE POLICY impersonation_sessions_modify ON public.impersonation_sessions
  FOR ALL USING ((select is_platform_admin()))
  WITH CHECK ((select is_platform_admin()));
