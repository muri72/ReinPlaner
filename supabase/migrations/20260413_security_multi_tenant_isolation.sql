-- ============================================================================
-- SECURITY FIX: Multi-Tenant Isolation
-- Adds tenant_id to all tables and fixes RLS policies to enforce isolation
-- 
-- PROBLEM: Current RLS policies only check role (admin/manager/worker)
--          but NOT tenant_id. A manager from Tenant A could see Tenant B's data!
-- 
-- FIX: All tables get tenant_id, all RLS policies filter by tenant_id
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- STEP 1: Add tenant_id to profiles table
-- =============================================================================
ALTER TABLE IF EXISTS profiles 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_role ON profiles(tenant_id, role);

-- =============================================================================
-- STEP 2: Add tenant_id to core business tables
-- =============================================================================

-- Employees
ALTER TABLE IF EXISTS employees 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);

-- Customers  
ALTER TABLE IF EXISTS customers
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);

-- Orders
ALTER TABLE IF EXISTS orders
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);

-- Time entries
ALTER TABLE IF EXISTS time_entries
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant ON time_entries(tenant_id);

-- Shifts
ALTER TABLE IF EXISTS shifts
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_shifts_tenant ON shifts(tenant_id);

-- Order employee assignments
ALTER TABLE IF EXISTS order_employee_assignments
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_order_employee_assignments_tenant ON order_employee_assignments(tenant_id);

-- Shift employees (junction table)
ALTER TABLE IF EXISTS shift_employees
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_shift_employees_tenant ON shift_employees(tenant_id);

-- =============================================================================
-- STEP 3: Drop old broken RLS policies
-- =============================================================================

-- Orders
DROP POLICY IF EXISTS "orders_admin_all" ON orders;
DROP POLICY IF EXISTS "orders_manager_select" ON orders;
DROP POLICY IF EXISTS "orders_manager_insert" ON orders;
DROP POLICY IF EXISTS "orders_manager_update" ON orders;
DROP POLICY IF EXISTS "orders_worker_select" ON orders;

-- Employees
DROP POLICY IF EXISTS "employees_admin_all" ON employees;
DROP POLICY IF EXISTS "employees_manager_select" ON employees;
DROP POLICY IF EXISTS "employees_worker_select" ON employees;

-- Customers
DROP POLICY IF EXISTS "customers_admin_all" ON customers;
DROP POLICY IF EXISTS "customers_manager_select" ON customers;
DROP POLICY IF EXISTS "customers_manager_insert" ON customers;
DROP POLICY IF EXISTS "customers_manager_update" ON customers;
DROP POLICY IF EXISTS "customers_worker_select" ON customers;

-- Time entries
DROP POLICY IF EXISTS "time_entries_admin_all" ON time_entries;
DROP POLICY IF EXISTS "time_entries_manager_select" ON time_entries;
DROP POLICY IF EXISTS "time_entries_manager_insert" ON time_entries;
DROP POLICY IF EXISTS "time_entries_manager_update" ON time_entries;
DROP POLICY IF EXISTS "time_entries_worker_select" ON time_entries;
DROP POLICY IF EXISTS "time_entries_worker_insert" ON time_entries;
DROP POLICY IF EXISTS "time_entries_worker_update" ON time_entries;
DROP POLICY IF EXISTS "time_entries_worker_delete" ON time_entries;

-- Shifts
DROP POLICY IF EXISTS "shifts_admin_all" ON shifts;
DROP POLICY IF EXISTS "shifts_manager_select" ON shifts;
DROP POLICY IF EXISTS "shifts_manager_insert" ON shifts;
DROP POLICY IF EXISTS "shifts_manager_update" ON shifts;
DROP POLICY IF EXISTS "shifts_worker_select" ON shifts;
DROP POLICY IF EXISTS "shifts_worker_update" ON shifts;

-- Assignments
DROP POLICY IF EXISTS "order_employee_assignments_admin_all" ON order_employee_assignments;
DROP POLICY IF EXISTS "order_employee_assignments_manager_all" ON order_employee_assignments;
DROP POLICY IF EXISTS "order_employee_assignments_worker_select" ON order_employee_assignments;

-- =============================================================================
-- STEP 4: Create FIXED RLS policies with tenant_id
-- =============================================================================

-- Helper function to get user's tenant_id
CREATE OR REPLACE FUNCTION auth.user_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT tenant_id FROM profiles 
    WHERE id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION auth.user_tenant_id() TO authenticated;

-- Helper function to check user role WITHIN their tenant
CREATE OR REPLACE FUNCTION auth.user_tenant_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM profiles 
    WHERE id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION auth.user_tenant_role() TO authenticated;

-- =============================================================================
-- ORDERS: Fixed policies with tenant isolation
-- =============================================================================

CREATE POLICY "orders_tenant_all" ON orders
  FOR ALL
  TO authenticated
  USING (
    orders.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'admin'
  )
  WITH CHECK (
    orders.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'admin'
  );

CREATE POLICY "orders_tenant_select" ON orders
  FOR SELECT
  TO authenticated
  USING (
    orders.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() IN ('admin', 'manager')
  );

CREATE POLICY "orders_tenant_insert" ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    orders.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() IN ('admin', 'manager')
  );

CREATE POLICY "orders_tenant_update" ON orders
  FOR UPDATE
  TO authenticated
  USING (
    orders.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() IN ('admin', 'manager')
  );

CREATE POLICY "orders_tenant_worker_select" ON orders
  FOR SELECT
  TO authenticated
  USING (
    orders.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'worker'
    AND (
      EXISTS (
        SELECT 1 FROM order_employee_assignments oea
        JOIN employees e ON e.id = oea.employee_id
        WHERE oea.order_id = orders.id AND e.user_id = auth.uid()
      )
      OR orders.user_id = auth.uid()
    )
  );

-- =============================================================================
-- EMPLOYEES: Fixed policies with tenant isolation
-- =============================================================================

CREATE POLICY "employees_tenant_all" ON employees
  FOR ALL
  TO authenticated
  USING (
    employees.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'admin'
  )
  WITH CHECK (
    employees.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'admin'
  );

CREATE POLICY "employees_tenant_select" ON employees
  FOR SELECT
  TO authenticated
  USING (
    employees.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() IN ('admin', 'manager')
  );

CREATE POLICY "employees_tenant_worker_select" ON employees
  FOR SELECT
  TO authenticated
  USING (
    employees.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'worker'
    AND employees.user_id = auth.uid()
  );

-- =============================================================================
-- CUSTOMERS: Fixed policies with tenant isolation
-- =============================================================================

CREATE POLICY "customers_tenant_all" ON customers
  FOR ALL
  TO authenticated
  USING (
    customers.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'admin'
  )
  WITH CHECK (
    customers.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'admin'
  );

CREATE POLICY "customers_tenant_select" ON customers
  FOR SELECT
  TO authenticated
  USING (
    customers.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() IN ('admin', 'manager')
  );

CREATE POLICY "customers_tenant_insert" ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customers.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() IN ('admin', 'manager')
  );

CREATE POLICY "customers_tenant_update" ON customers
  FOR UPDATE
  TO authenticated
  USING (
    customers.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() IN ('admin', 'manager')
  );

CREATE POLICY "customers_tenant_worker_select" ON customers
  FOR SELECT
  TO authenticated
  USING (
    customers.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'worker'
    AND (
      EXISTS (
        SELECT 1 FROM order_employee_assignments oea
        JOIN orders o ON o.id = oea.order_id
        JOIN employees e ON e.id = oea.employee_id
        WHERE o.customer_id = customers.id AND e.user_id = auth.uid()
      )
      OR customers.user_id = auth.uid()
    )
  );

-- =============================================================================
-- TIME ENTRIES: Fixed policies with tenant isolation
-- =============================================================================

CREATE POLICY "time_entries_tenant_all" ON time_entries
  FOR ALL
  TO authenticated
  USING (
    time_entries.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'admin'
  )
  WITH CHECK (
    time_entries.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'admin'
  );

CREATE POLICY "time_entries_tenant_select" ON time_entries
  FOR SELECT
  TO authenticated
  USING (
    time_entries.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() IN ('admin', 'manager')
  );

CREATE POLICY "time_entries_tenant_insert" ON time_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    time_entries.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() IN ('admin', 'manager')
  );

CREATE POLICY "time_entries_tenant_update" ON time_entries
  FOR UPDATE
  TO authenticated
  USING (
    time_entries.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() IN ('admin', 'manager')
  );

CREATE POLICY "time_entries_tenant_worker_select" ON time_entries
  FOR SELECT
  TO authenticated
  USING (
    time_entries.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'worker'
    AND time_entries.employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "time_entries_tenant_worker_insert" ON time_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    time_entries.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'worker'
    AND time_entries.employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "time_entries_tenant_worker_update" ON time_entries
  FOR UPDATE
  TO authenticated
  USING (
    time_entries.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'worker'
    AND time_entries.employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "time_entries_tenant_worker_delete" ON time_entries
  FOR DELETE
  TO authenticated
  USING (
    time_entries.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'worker'
    AND time_entries.employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- SHIFTS: Fixed policies with tenant isolation
-- =============================================================================

CREATE POLICY "shifts_tenant_all" ON shifts
  FOR ALL
  TO authenticated
  USING (
    shifts.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'admin'
  )
  WITH CHECK (
    shifts.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'admin'
  );

CREATE POLICY "shifts_tenant_select" ON shifts
  FOR SELECT
  TO authenticated
  USING (
    shifts.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() IN ('admin', 'manager')
  );

CREATE POLICY "shifts_tenant_insert" ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    shifts.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() IN ('admin', 'manager')
  );

CREATE POLICY "shifts_tenant_update" ON shifts
  FOR UPDATE
  TO authenticated
  USING (
    shifts.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() IN ('admin', 'manager')
  );

CREATE POLICY "shifts_tenant_worker_select" ON shifts
  FOR SELECT
  TO authenticated
  USING (
    shifts.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'worker'
    AND (
      EXISTS (
        SELECT 1 FROM shift_employees se
        JOIN employees e ON e.id = se.employee_id
        WHERE se.shift_id = shifts.id AND e.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM order_employee_assignments oea
        JOIN employees e ON e.id = oea.employee_id
        WHERE oea.id = shifts.assignment_id AND e.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "shifts_tenant_worker_update" ON shifts
  FOR UPDATE
  TO authenticated
  USING (
    shifts.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'worker'
    AND (
      EXISTS (
        SELECT 1 FROM shift_employees se
        JOIN employees e ON e.id = se.employee_id
        WHERE se.shift_id = shifts.id AND e.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM order_employee_assignments oea
        JOIN employees e ON e.id = oea.employee_id
        WHERE oea.id = shifts.assignment_id AND e.user_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- ORDER_EMPLOYEE_ASSIGNMENTS: Fixed policies with tenant isolation
-- =============================================================================

CREATE POLICY "order_employee_assignments_tenant_all" ON order_employee_assignments
  FOR ALL
  TO authenticated
  USING (
    order_employee_assignments.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'admin'
  )
  WITH CHECK (
    order_employee_assignments.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'admin'
  );

CREATE POLICY "order_employee_assignments_tenant_manager_all" ON order_employee_assignments
  FOR ALL
  TO authenticated
  USING (
    order_employee_assignments.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'manager'
  )
  WITH CHECK (
    order_employee_assignments.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'manager'
  );

CREATE POLICY "order_employee_assignments_tenant_worker_select" ON order_employee_assignments
  FOR SELECT
  TO authenticated
  USING (
    order_employee_assignments.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'worker'
    AND order_employee_assignments.employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- SHIFT_EMPLOYEES: Fixed policies with tenant isolation
-- =============================================================================

CREATE POLICY "shift_employees_tenant_all" ON shift_employees
  FOR ALL
  TO authenticated
  USING (
    shift_employees.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'admin'
  )
  WITH CHECK (
    shift_employees.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() = 'admin'
  );

CREATE POLICY "shift_employees_tenant_select" ON shift_employees
  FOR SELECT
  TO authenticated
  USING (
    shift_employees.tenant_id = auth.user_tenant_id()
    AND auth.user_tenant_role() IN ('admin', 'manager', 'worker')
  );

-- =============================================================================
-- STEP 5: Update services-rls.ts to use tenant-safe queries
-- =============================================================================

-- This migration does NOT touch application code.
-- Application code updates come in a separate commit after this migration is applied.
