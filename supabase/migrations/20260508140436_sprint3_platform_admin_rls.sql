-- Sprint 3 — Add platform_admin to RLS policies (cross-tenant access)
--
-- platform_admin is a superset of admin: it bypasses the tenant_id
-- filter to support cross-tenant operations (used for /dashboard/admin/*).
-- All other roles remain strictly tenant-scoped.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.user_tenant_role() = 'platform_admin';
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_access(target_tenant uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_platform_admin()
      OR target_tenant = public.user_tenant_id();
$$;

-- customers
DROP POLICY IF EXISTS customers_admin    ON public.customers;
DROP POLICY IF EXISTS customers_employee ON public.customers;
DROP POLICY IF EXISTS customers_customer ON public.customers;

CREATE POLICY customers_admin ON public.customers FOR ALL
  USING (public.has_tenant_access(tenant_id)
         AND (public.is_platform_admin()
              OR public.user_tenant_role() = ANY (ARRAY['admin','manager'])))
  WITH CHECK (public.has_tenant_access(tenant_id)
              AND (public.is_platform_admin()
                   OR public.user_tenant_role() = ANY (ARRAY['admin','manager'])));

CREATE POLICY customers_employee ON public.customers FOR SELECT
  USING (tenant_id = public.user_tenant_id()
         AND public.user_tenant_role() = ANY (ARRAY['admin','manager','employee']));

CREATE POLICY customers_customer ON public.customers FOR SELECT
  USING (tenant_id = public.user_tenant_id()
         AND public.user_tenant_role() = 'customer');

-- employees
DROP POLICY IF EXISTS employees_admin          ON public.employees;
DROP POLICY IF EXISTS employees_manager        ON public.employees;
DROP POLICY IF EXISTS employees_manager_update ON public.employees;
DROP POLICY IF EXISTS employees_employee       ON public.employees;
DROP POLICY IF EXISTS employees_insert         ON public.employees;

CREATE POLICY employees_admin ON public.employees FOR ALL
  USING (public.has_tenant_access(tenant_id)
         AND (public.is_platform_admin()
              OR public.user_tenant_role() = 'admin'))
  WITH CHECK (public.has_tenant_access(tenant_id)
              AND (public.is_platform_admin()
                   OR public.user_tenant_role() = 'admin'));

CREATE POLICY employees_manager ON public.employees FOR SELECT
  USING (tenant_id = public.user_tenant_id()
         AND public.user_tenant_role() = ANY (ARRAY['admin','manager']));

CREATE POLICY employees_manager_update ON public.employees FOR UPDATE
  USING (tenant_id = public.user_tenant_id()
         AND public.user_tenant_role() = ANY (ARRAY['admin','manager']));

CREATE POLICY employees_employee ON public.employees FOR SELECT
  USING (tenant_id = public.user_tenant_id()
         AND public.user_tenant_role() = 'employee');

CREATE POLICY employees_insert ON public.employees FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id)
              AND (public.is_platform_admin()
                   OR public.user_tenant_role() = ANY (ARRAY['admin','manager'])));

-- orders
DROP POLICY IF EXISTS orders_admin          ON public.orders;
DROP POLICY IF EXISTS orders_manager        ON public.orders;
DROP POLICY IF EXISTS orders_manager_update ON public.orders;
DROP POLICY IF EXISTS orders_employee       ON public.orders;
DROP POLICY IF EXISTS orders_insert         ON public.orders;

CREATE POLICY orders_admin ON public.orders FOR ALL
  USING (public.has_tenant_access(tenant_id)
         AND (public.is_platform_admin()
              OR public.user_tenant_role() = 'admin'))
  WITH CHECK (public.has_tenant_access(tenant_id)
              AND (public.is_platform_admin()
                   OR public.user_tenant_role() = 'admin'));

CREATE POLICY orders_manager ON public.orders FOR SELECT
  USING (tenant_id = public.user_tenant_id()
         AND public.user_tenant_role() = ANY (ARRAY['admin','manager']));

CREATE POLICY orders_manager_update ON public.orders FOR UPDATE
  USING (tenant_id = public.user_tenant_id()
         AND public.user_tenant_role() = ANY (ARRAY['admin','manager']));

CREATE POLICY orders_employee ON public.orders FOR SELECT
  USING (
    tenant_id = public.user_tenant_id()
    AND public.user_tenant_role() = 'employee'
    AND id IN (
      SELECT order_id FROM public.order_employee_assignments
      WHERE employee_id IN (
        SELECT id FROM public.employees WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY orders_insert ON public.orders FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id)
              AND (public.is_platform_admin()
                   OR public.user_tenant_role() = ANY (ARRAY['admin','manager'])));

-- shifts
DROP POLICY IF EXISTS shifts_admin          ON public.shifts;
DROP POLICY IF EXISTS shifts_manager        ON public.shifts;
DROP POLICY IF EXISTS shifts_manager_update ON public.shifts;
DROP POLICY IF EXISTS shifts_employee       ON public.shifts;
DROP POLICY IF EXISTS shifts_insert         ON public.shifts;

CREATE POLICY shifts_admin ON public.shifts FOR ALL
  USING (public.has_tenant_access(tenant_id)
         AND (public.is_platform_admin()
              OR public.user_tenant_role() = 'admin'))
  WITH CHECK (public.has_tenant_access(tenant_id)
              AND (public.is_platform_admin()
                   OR public.user_tenant_role() = 'admin'));

CREATE POLICY shifts_manager ON public.shifts FOR SELECT
  USING (tenant_id = public.user_tenant_id()
         AND public.user_tenant_role() = ANY (ARRAY['admin','manager']));

CREATE POLICY shifts_manager_update ON public.shifts FOR UPDATE
  USING (tenant_id = public.user_tenant_id()
         AND public.user_tenant_role() = ANY (ARRAY['admin','manager']));

CREATE POLICY shifts_employee ON public.shifts FOR SELECT
  USING (
    tenant_id = public.user_tenant_id()
    AND public.user_tenant_role() = 'employee'
    AND id IN (
      SELECT shift_id FROM public.shift_employees
      WHERE employee_id IN (
        SELECT id FROM public.employees WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY shifts_insert ON public.shifts FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id)
              AND (public.is_platform_admin()
                   OR public.user_tenant_role() = ANY (ARRAY['admin','manager'])));

-- shift_employees
DROP POLICY IF EXISTS shift_employees_admin    ON public.shift_employees;
DROP POLICY IF EXISTS shift_employees_manager  ON public.shift_employees;
DROP POLICY IF EXISTS shift_employees_employee ON public.shift_employees;

CREATE POLICY shift_employees_admin ON public.shift_employees FOR ALL
  USING (public.has_tenant_access(tenant_id)
         AND (public.is_platform_admin()
              OR public.user_tenant_role() = 'admin'))
  WITH CHECK (public.has_tenant_access(tenant_id)
              AND (public.is_platform_admin()
                   OR public.user_tenant_role() = 'admin'));

CREATE POLICY shift_employees_manager ON public.shift_employees FOR SELECT
  USING (tenant_id = public.user_tenant_id()
         AND public.user_tenant_role() = ANY (ARRAY['admin','manager']));

CREATE POLICY shift_employees_employee ON public.shift_employees FOR SELECT
  USING (
    tenant_id = public.user_tenant_id()
    AND public.user_tenant_role() = 'employee'
    AND employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- order_employee_assignments
DROP POLICY IF EXISTS order_employee_assignments_admin    ON public.order_employee_assignments;
DROP POLICY IF EXISTS order_employee_assignments_manager  ON public.order_employee_assignments;
DROP POLICY IF EXISTS order_employee_assignments_employee ON public.order_employee_assignments;

CREATE POLICY order_employee_assignments_admin ON public.order_employee_assignments FOR ALL
  USING (public.has_tenant_access(tenant_id)
         AND (public.is_platform_admin()
              OR public.user_tenant_role() = 'admin'))
  WITH CHECK (public.has_tenant_access(tenant_id)
              AND (public.is_platform_admin()
                   OR public.user_tenant_role() = 'admin'));

CREATE POLICY order_employee_assignments_manager ON public.order_employee_assignments FOR SELECT
  USING (tenant_id = public.user_tenant_id()
         AND public.user_tenant_role() = ANY (ARRAY['admin','manager']));

CREATE POLICY order_employee_assignments_employee ON public.order_employee_assignments FOR SELECT
  USING (
    tenant_id = public.user_tenant_id()
    AND public.user_tenant_role() = 'employee'
    AND employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- time_entries
DROP POLICY IF EXISTS time_entries_admin           ON public.time_entries;
DROP POLICY IF EXISTS time_entries_manager         ON public.time_entries;
DROP POLICY IF EXISTS time_entries_employee        ON public.time_entries;
DROP POLICY IF EXISTS time_entries_employee_insert ON public.time_entries;
DROP POLICY IF EXISTS time_entries_employee_update ON public.time_entries;

CREATE POLICY time_entries_admin ON public.time_entries FOR ALL
  USING (public.has_tenant_access(tenant_id)
         AND (public.is_platform_admin()
              OR public.user_tenant_role() = 'admin'))
  WITH CHECK (public.has_tenant_access(tenant_id)
              AND (public.is_platform_admin()
                   OR public.user_tenant_role() = 'admin'));

CREATE POLICY time_entries_manager ON public.time_entries FOR SELECT
  USING (tenant_id = public.user_tenant_id()
         AND public.user_tenant_role() = ANY (ARRAY['admin','manager']));

CREATE POLICY time_entries_employee ON public.time_entries FOR SELECT
  USING (
    tenant_id = public.user_tenant_id()
    AND public.user_tenant_role() = 'employee'
    AND employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY time_entries_employee_insert ON public.time_entries FOR INSERT
  WITH CHECK (
    tenant_id = public.user_tenant_id()
    AND public.user_tenant_role() = 'employee'
    AND employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY time_entries_employee_update ON public.time_entries FOR UPDATE
  USING (
    tenant_id = public.user_tenant_id()
    AND public.user_tenant_role() = 'employee'
    AND employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

COMMIT;
