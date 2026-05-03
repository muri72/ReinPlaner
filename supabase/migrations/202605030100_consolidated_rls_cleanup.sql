-- =============================================================================
-- RLS Cleanup - Single Source of Truth: profiles.tenant_id via user_tenant_id()
-- 
-- Problem: Redundante Policies (worker vs employee), verwaiste tenant_users,
--          NULL tenant_id beim Manager.
--
-- Lösung: Alle Policies neu erstellen mit konsistentem user_tenant_id() Ansatz.
-- =============================================================================

-- Drop ALL existing RLS policies first (fresh start)
DROP POLICY IF EXISTS employees_tenant_all ON employees;
DROP POLICY IF EXISTS employees_tenant_select ON employees;
DROP POLICY IF EXISTS employees_tenant_isolation ON employees;
DROP POLICY IF EXISTS customers_tenant_all ON customers;
DROP POLICY IF EXISTS customers_tenant_insert ON customers;
DROP POLICY IF EXISTS customers_tenant_select ON customers;
DROP POLICY IF EXISTS customers_tenant_update ON customers;
DROP POLICY IF EXISTS customers_tenant_isolation ON customers;
DROP POLICY IF EXISTS orders_tenant_all ON orders;
DROP POLICY IF EXISTS orders_tenant_insert ON orders;
DROP POLICY IF EXISTS orders_tenant_select ON orders;
DROP POLICY IF EXISTS orders_tenant_update ON orders;
DROP POLICY IF EXISTS orders_tenant_isolation ON orders;
DROP POLICY IF EXISTS shifts_tenant_all ON shifts;
DROP POLICY IF EXISTS shifts_tenant_insert ON shifts;
DROP POLICY IF EXISTS shifts_tenant_select ON shifts;
DROP POLICY IF EXISTS shifts_tenant_update ON shifts;
DROP POLICY IF EXISTS shifts_tenant_isolation ON shifts;
DROP POLICY IF EXISTS time_entries_tenant_all ON time_entries;
DROP POLICY IF EXISTS time_entries_tenant_insert ON time_entries;
DROP POLICY IF EXISTS time_entries_tenant_select ON time_entries;
DROP POLICY IF EXISTS time_entries_tenant_update ON time_entries;
DROP POLICY IF EXISTS shift_employees_tenant_all ON shift_employees;
DROP POLICY IF EXISTS shift_employees_tenant_select ON shift_employees;
DROP POLICY IF EXISTS shift_employees_tenant_isolation ON shift_employees;
DROP POLICY IF EXISTS order_employee_assignments_tenant_all ON order_employee_assignments;
DROP POLICY IF EXISTS order_employee_assignments_tenant_select ON order_employee_assignments;
DROP POLICY IF EXISTS order_employee_assignments_tenant_isolation ON order_employee_assignments;
DROP POLICY IF EXISTS order_employee_assignments_tenant_manager_all ON order_employee_assignments;
DROP POLICY IF EXISTS profiles_tenant_isolation ON profiles;
DROP POLICY IF EXISTS shift_overrides_tenant_isolation ON shift_overrides;
DROP POLICY IF EXISTS time_entries_employee_insert ON time_entries;

-- =============================================================================
-- EMPLOYEES
-- =============================================================================
-- Admin: full access within tenant
CREATE POLICY employees_admin ON employees FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() = 'admin');

-- Manager: SELECT/UPDATE within tenant (not delete)
CREATE POLICY employees_manager ON employees FOR SELECT TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() IN ('admin', 'manager'));

CREATE POLICY employees_manager_update ON employees FOR UPDATE TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() IN ('admin', 'manager'));

-- Employee: SELECT (own record only via user_id match)
CREATE POLICY employees_employee ON employees FOR SELECT TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() = 'employee');

-- INSERT: Admin/Manager only
CREATE POLICY employees_insert ON employees FOR INSERT TO authenticated
  WITH CHECK (tenant_id = user_tenant_id() AND user_tenant_role() IN ('admin', 'manager'));

-- =============================================================================
-- CUSTOMERS
-- =============================================================================
-- Admin/Manager: full access
CREATE POLICY customers_admin ON customers FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() IN ('admin', 'manager'));

-- Employee: SELECT (read-only access to customer info)
CREATE POLICY customers_employee ON customers FOR SELECT TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() IN ('admin', 'manager', 'employee'));

-- Customer: SELECT (own customer record)
CREATE POLICY customers_customer ON customers FOR SELECT TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() = 'customer');

-- =============================================================================
-- ORDERS
-- =============================================================================
-- Admin: full access
CREATE POLICY orders_admin ON orders FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() = 'admin');

-- Manager: SELECT/UPDATE
CREATE POLICY orders_manager ON orders FOR SELECT TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() IN ('admin', 'manager'));

CREATE POLICY orders_manager_update ON orders FOR UPDATE TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() IN ('admin', 'manager'));

-- Employee: SELECT (via assigned orders)
CREATE POLICY orders_employee ON orders FOR SELECT TO authenticated
  USING (
    tenant_id = user_tenant_id() 
    AND user_tenant_role() = 'employee'
    AND id IN (
      SELECT order_id FROM order_employee_assignments 
      WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    )
  );

-- INSERT: Admin/Manager
CREATE POLICY orders_insert ON orders FOR INSERT TO authenticated
  WITH CHECK (tenant_id = user_tenant_id() AND user_tenant_role() IN ('admin', 'manager'));

-- =============================================================================
-- SHIFTS
-- =============================================================================
-- Admin: full access
CREATE POLICY shifts_admin ON shifts FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() = 'admin');

-- Manager: SELECT/UPDATE
CREATE POLICY shifts_manager ON shifts FOR SELECT TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() IN ('admin', 'manager'));

CREATE POLICY shifts_manager_update ON shifts FOR UPDATE TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() IN ('admin', 'manager'));

-- Employee: SELECT (own shifts)
CREATE POLICY shifts_employee ON shifts FOR SELECT TO authenticated
  USING (
    tenant_id = user_tenant_id()
    AND user_tenant_role() = 'employee'
    AND id IN (
      SELECT shift_id FROM shift_employees
      WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    )
  );

-- INSERT: Admin/Manager
CREATE POLICY shifts_insert ON shifts FOR INSERT TO authenticated
  WITH CHECK (tenant_id = user_tenant_id() AND user_tenant_role() IN ('admin', 'manager'));

-- =============================================================================
-- TIME_ENTRIES
-- =============================================================================
-- Admin: full access
CREATE POLICY time_entries_admin ON time_entries FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() = 'admin');

-- Manager: SELECT
CREATE POLICY time_entries_manager ON time_entries FOR SELECT TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() IN ('admin', 'manager'));

-- Employee: INSERT own time_entries
CREATE POLICY time_entries_employee_insert ON time_entries FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = user_tenant_id()
    AND user_tenant_role() = 'employee'
    AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Employee: UPDATE own time_entries
CREATE POLICY time_entries_employee_update ON time_entries FOR UPDATE TO authenticated
  USING (
    tenant_id = user_tenant_id()
    AND user_tenant_role() = 'employee'
    AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- Employee: SELECT own time_entries
CREATE POLICY time_entries_employee ON time_entries FOR SELECT TO authenticated
  USING (
    tenant_id = user_tenant_id()
    AND user_tenant_role() = 'employee'
    AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- =============================================================================
-- SHIFT_EMPLOYEES (join table for shifts <-> employees)
-- =============================================================================
-- Admin: full
CREATE POLICY shift_employees_admin ON shift_employees FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() = 'admin');

-- Manager: SELECT
CREATE POLICY shift_employees_manager ON shift_employees FOR SELECT TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() IN ('admin', 'manager'));

-- Employee: SELECT (own assignments)
CREATE POLICY shift_employees_employee ON shift_employees FOR SELECT TO authenticated
  USING (
    tenant_id = user_tenant_id()
    AND user_tenant_role() = 'employee'
    AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- =============================================================================
-- ORDER_EMPLOYEE_ASSIGNMENTS
-- =============================================================================
-- Admin: full
CREATE POLICY order_employee_assignments_admin ON order_employee_assignments FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() = 'admin');

-- Manager: SELECT
CREATE POLICY order_employee_assignments_manager ON order_employee_assignments FOR SELECT TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() IN ('admin', 'manager'));

-- Employee: SELECT (own assignments)
CREATE POLICY order_employee_assignments_employee ON order_employee_assignments FOR SELECT TO authenticated
  USING (
    tenant_id = user_tenant_id()
    AND user_tenant_role() = 'employee'
    AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- =============================================================================
-- SHIFT_OVERRIDES
-- =============================================================================
CREATE POLICY shift_overrides_admin ON shift_overrides FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() = 'admin');

CREATE POLICY shift_overrides_manager ON shift_overrides FOR SELECT TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() IN ('admin', 'manager'));

-- =============================================================================
-- PROFILES (RLS via tenant isolation)
-- =============================================================================
CREATE POLICY profiles_tenant_isolation ON profiles FOR ALL TO authenticated
  USING (
    tenant_id = COALESCE(
      nullif((auth.jwt()->>'tenant_id'), '')::uuid,
      nullif(current_setting('app.current_tenant_id', true), '')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    )
  );

-- =============================================================================
-- VERIFY
-- =============================================================================
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname = 'public' ORDER BY tablename, policyname;
