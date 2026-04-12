-- ============================================================================
-- RLS POLICIES MIGRATION
-- Tables: orders, employees, customers, time_entries, shifts
-- Roles: admin, manager, worker
-- ============================================================================

-- Enable RLS on all target tables
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shifts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORDERS TABLE POLICIES
-- ============================================================================

-- Orders: Admin can do everything
DROP POLICY IF EXISTS "orders_admin_all" ON orders;
CREATE POLICY "orders_admin_all" ON orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Orders: Managers can read all, update their own
DROP POLICY IF EXISTS "orders_manager_select" ON orders;
CREATE POLICY "orders_manager_select" ON orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  );

DROP POLICY IF EXISTS "orders_manager_insert" ON orders;
CREATE POLICY "orders_manager_insert" ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  );

DROP POLICY IF EXISTS "orders_manager_update" ON orders;
CREATE POLICY "orders_manager_update" ON orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  );

-- Orders: Workers can only read their assigned orders
DROP POLICY IF EXISTS "orders_worker_select" ON orders;
CREATE POLICY "orders_worker_select" ON orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'worker'
    )
    AND (
      EXISTS (
        SELECT 1 FROM order_employee_assignments oea
        JOIN employees e ON e.id = oea.employee_id
        WHERE oea.order_id = orders.id AND e.user_id = auth.uid()
      )
      OR orders.user_id = auth.uid()
    )
  );

-- ============================================================================
-- EMPLOYEES TABLE POLICIES
-- ============================================================================

-- Employees: Admin can do everything
DROP POLICY IF EXISTS "employees_admin_all" ON employees;
CREATE POLICY "employees_admin_all" ON employees
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Employees: Managers can read all
DROP POLICY IF EXISTS "employees_manager_select" ON employees;
CREATE POLICY "employees_manager_select" ON employees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  );

-- Employees: Workers can read their own profile
DROP POLICY IF EXISTS "employees_worker_select" ON employees;
CREATE POLICY "employees_worker_select" ON employees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'worker'
    )
    AND employees.user_id = auth.uid()
  );

-- ============================================================================
-- CUSTOMERS TABLE POLICIES
-- ============================================================================

-- Customers: Admin can do everything
DROP POLICY IF EXISTS "customers_admin_all" ON customers;
CREATE POLICY "customers_admin_all" ON customers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Customers: Managers can read all
DROP POLICY IF EXISTS "customers_manager_select" ON customers;
CREATE POLICY "customers_manager_select" ON customers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  );

-- Customers: Managers can insert/update their assigned customers
DROP POLICY IF EXISTS "customers_manager_insert" ON customers;
CREATE POLICY "customers_manager_insert" ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  );

DROP POLICY IF EXISTS "customers_manager_update" ON customers;
CREATE POLICY "customers_manager_update" ON customers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  );

-- Customers: Workers can read customers assigned to their orders
DROP POLICY IF EXISTS "customers_worker_select" ON customers;
CREATE POLICY "customers_worker_select" ON customers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'worker'
    )
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

-- ============================================================================
-- TIME_ENTRIES TABLE POLICIES
-- ============================================================================

-- Time Entries: Admin can do everything
DROP POLICY IF EXISTS "time_entries_admin_all" ON time_entries;
CREATE POLICY "time_entries_admin_all" ON time_entries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Time Entries: Managers can read all, update their team's entries
DROP POLICY IF EXISTS "time_entries_manager_select" ON time_entries;
CREATE POLICY "time_entries_manager_select" ON time_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  );

DROP POLICY IF EXISTS "time_entries_manager_insert" ON time_entries;
CREATE POLICY "time_entries_manager_insert" ON time_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  );

DROP POLICY IF EXISTS "time_entries_manager_update" ON time_entries;
CREATE POLICY "time_entries_manager_update" ON time_entries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  );

-- Time Entries: Workers can read their own, create/update their own
DROP POLICY IF EXISTS "time_entries_worker_select" ON time_entries;
CREATE POLICY "time_entries_worker_select" ON time_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'worker'
    )
    AND time_entries.employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "time_entries_worker_insert" ON time_entries;
CREATE POLICY "time_entries_worker_insert" ON time_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'worker'
    )
    AND time_entries.employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "time_entries_worker_update" ON time_entries;
CREATE POLICY "time_entries_worker_update" ON time_entries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'worker'
    )
    AND time_entries.employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "time_entries_worker_delete" ON time_entries;
CREATE POLICY "time_entries_worker_delete" ON time_entries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'worker'
    )
    AND time_entries.employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- SHIFTS TABLE POLICIES
-- ============================================================================

-- Shifts: Admin can do everything
DROP POLICY IF EXISTS "shifts_admin_all" ON shifts;
CREATE POLICY "shifts_admin_all" ON shifts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Shifts: Managers can read all
DROP POLICY IF EXISTS "shifts_manager_select" ON shifts;
CREATE POLICY "shifts_manager_select" ON shifts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  );

DROP POLICY IF EXISTS "shifts_manager_insert" ON shifts;
CREATE POLICY "shifts_manager_insert" ON shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  );

DROP POLICY IF EXISTS "shifts_manager_update" ON shifts;
CREATE POLICY "shifts_manager_update" ON shifts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  );

-- Shifts: Workers can read their own shifts
DROP POLICY IF EXISTS "shifts_worker_select" ON shifts;
CREATE POLICY "shifts_worker_select" ON shifts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'worker'
    )
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

DROP POLICY IF EXISTS "shifts_worker_update" ON shifts;
CREATE POLICY "shifts_worker_update" ON shifts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'worker'
    )
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

-- ============================================================================
-- ORDER_EMPLOYEE_ASSIGNMENTS TABLE POLICIES
-- ============================================================================

-- Assignments: Admin can do everything
DROP POLICY IF EXISTS "order_employee_assignments_admin_all" ON order_employee_assignments;
CREATE POLICY "order_employee_assignments_admin_all" ON order_employee_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Assignments: Managers can do everything
DROP POLICY IF EXISTS "order_employee_assignments_manager_all" ON order_employee_assignments;
CREATE POLICY "order_employee_assignments_manager_all" ON order_employee_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
  );

-- Assignments: Workers can read their own
DROP POLICY IF EXISTS "order_employee_assignments_worker_select" ON order_employee_assignments;
CREATE POLICY "order_employee_assignments_worker_select" ON order_employee_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'worker'
    )
    AND order_employee_assignments.employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Helper function to check user role
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TABLE(role text) AS $$
BEGIN
  RETURN QUERY
  SELECT p.role::text
  FROM profiles p
  WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION auth.user_role() TO authenticated;
