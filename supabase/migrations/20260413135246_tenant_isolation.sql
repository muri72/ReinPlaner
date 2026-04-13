-- ============================================================================
-- TENANT ISOLATION MIGRATION - P0 SECURITY FIX
-- Created: 2026-04-13
-- Purpose: Add tenant_id filtering to ALL RLS policies
-- 
-- WARNING: This REPLACES the existing role-only policies with
-- tenant-aware policies. Admin/Manager/Worker roles now REQUIRE
-- tenant_id match via tenant_users table.
-- ============================================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS debtors ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Helper function: get_current_tenant_id()
-- Returns the tenant_id for the currently authenticated user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT tenant_id 
    FROM tenant_users 
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_current_tenant_id() TO authenticated;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- User may only see/edit their own profile
-- ============================================================================

DROP POLICY IF EXISTS "Profiles: users can view own profile" ON profiles;
CREATE POLICY "Profiles: users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles: users can update own profile" ON profiles;
CREATE POLICY "Profiles: users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- TENANT_USERS TABLE POLICIES
-- User may only see their own tenant memberships
-- ============================================================================

DROP POLICY IF EXISTS "TenantUsers: users see own memberships" ON tenant_users;
CREATE POLICY "TenantUsers: users see own memberships"
  ON tenant_users FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "TenantUsers: users can update own membership" ON tenant_users;
CREATE POLICY "TenantUsers: users can update own membership"
  ON tenant_users FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- CUSTOMERS TABLE POLICIES
-- Tenant isolation: users can only access customers of their own tenant
-- ============================================================================

DROP POLICY IF EXISTS "Customers: tenant isolation select" ON customers;
CREATE POLICY "Customers: tenant isolation select"
  ON customers FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Customers: tenant isolation insert" ON customers;
CREATE POLICY "Customers: tenant isolation insert"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Customers: tenant isolation update" ON customers;
CREATE POLICY "Customers: tenant isolation update"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Customers: tenant isolation delete" ON customers;
CREATE POLICY "Customers: tenant isolation delete"
  ON customers FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- OBJECTS TABLE POLICIES
-- Tenant isolation
-- ============================================================================

DROP POLICY IF EXISTS "Objects: tenant isolation select" ON objects;
CREATE POLICY "Objects: tenant isolation select"
  ON objects FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Objects: tenant isolation insert" ON objects;
CREATE POLICY "Objects: tenant isolation insert"
  ON objects FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Objects: tenant isolation update" ON objects;
CREATE POLICY "Objects: tenant isolation update"
  ON objects FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Objects: tenant isolation delete" ON objects;
CREATE POLICY "Objects: tenant isolation delete"
  ON objects FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- ORDERS TABLE POLICIES
-- Tenant isolation
-- ============================================================================

DROP POLICY IF EXISTS "Orders: tenant isolation select" ON orders;
CREATE POLICY "Orders: tenant isolation select"
  ON orders FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Orders: tenant isolation insert" ON orders;
CREATE POLICY "Orders: tenant isolation insert"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Orders: tenant isolation update" ON orders;
CREATE POLICY "Orders: tenant isolation update"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Orders: tenant isolation delete" ON orders;
CREATE POLICY "Orders: tenant isolation delete"
  ON orders FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- EMPLOYEES TABLE POLICIES
-- Tenant isolation
-- ============================================================================

DROP POLICY IF EXISTS "Employees: tenant isolation select" ON employees;
CREATE POLICY "Employees: tenant isolation select"
  ON employees FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Employees: tenant isolation insert" ON employees;
CREATE POLICY "Employees: tenant isolation insert"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Employees: tenant isolation update" ON employees;
CREATE POLICY "Employees: tenant isolation update"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Employees: tenant isolation delete" ON employees;
CREATE POLICY "Employees: tenant isolation delete"
  ON employees FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- INVOICES TABLE POLICIES
-- Tenant isolation
-- ============================================================================

DROP POLICY IF EXISTS "Invoices: tenant isolation select" ON invoices;
CREATE POLICY "Invoices: tenant isolation select"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Invoices: tenant isolation insert" ON invoices;
CREATE POLICY "Invoices: tenant isolation insert"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Invoices: tenant isolation update" ON invoices;
CREATE POLICY "Invoices: tenant isolation update"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Invoices: tenant isolation delete" ON invoices;
CREATE POLICY "Invoices: tenant isolation delete"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- INVOICE_ITEMS TABLE POLICIES
-- Tenant isolation via invoice's tenant_id
-- ============================================================================

DROP POLICY IF EXISTS "InvoiceItems: tenant isolation select" ON invoice_items;
CREATE POLICY "InvoiceItems: tenant isolation select"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE tenant_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "InvoiceItems: tenant isolation insert" ON invoice_items;
CREATE POLICY "InvoiceItems: tenant isolation insert"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices WHERE tenant_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "InvoiceItems: tenant isolation update" ON invoice_items;
CREATE POLICY "InvoiceItems: tenant isolation update"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE tenant_id = get_current_tenant_id()
    )
  )
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices WHERE tenant_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "InvoiceItems: tenant isolation delete" ON invoice_items;
CREATE POLICY "InvoiceItems: tenant isolation delete"
  ON invoice_items FOR DELETE
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE tenant_id = get_current_tenant_id()
    )
  );

-- ============================================================================
-- PAYMENTS TABLE POLICIES
-- Tenant isolation via invoice's tenant_id
-- ============================================================================

DROP POLICY IF EXISTS "Payments: tenant isolation select" ON payments;
CREATE POLICY "Payments: tenant isolation select"
  ON payments FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE tenant_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "Payments: tenant isolation insert" ON payments;
CREATE POLICY "Payments: tenant isolation insert"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices WHERE tenant_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "Payments: tenant isolation update" ON payments;
CREATE POLICY "Payments: tenant isolation update"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE tenant_id = get_current_tenant_id()
    )
  )
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices WHERE tenant_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "Payments: tenant isolation delete" ON payments;
CREATE POLICY "Payments: tenant isolation delete"
  ON payments FOR DELETE
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE tenant_id = get_current_tenant_id()
    )
  );

-- ============================================================================
-- DEBTORS TABLE POLICIES
-- Tenant isolation
-- ============================================================================

DROP POLICY IF EXISTS "Debtors: tenant isolation select" ON debtors;
CREATE POLICY "Debtors: tenant isolation select"
  ON debtors FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Debtors: tenant isolation insert" ON debtors;
CREATE POLICY "Debtors: tenant isolation insert"
  ON debtors FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Debtors: tenant isolation update" ON debtors;
CREATE POLICY "Debtors: tenant isolation update"
  ON debtors FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Debtors: tenant isolation delete" ON debtors;
CREATE POLICY "Debtors: tenant isolation delete"
  ON debtors FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- TIME_ENTRIES TABLE POLICIES
-- Tenant isolation via employees table
-- ============================================================================

DROP POLICY IF EXISTS "TimeEntries: tenant isolation select" ON time_entries;
CREATE POLICY "TimeEntries: tenant isolation select"
  ON time_entries FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE tenant_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "TimeEntries: tenant isolation insert" ON time_entries;
CREATE POLICY "TimeEntries: tenant isolation insert"
  ON time_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE tenant_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "TimeEntries: tenant isolation update" ON time_entries;
CREATE POLICY "TimeEntries: tenant isolation update"
  ON time_entries FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE tenant_id = get_current_tenant_id()
    )
  )
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE tenant_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "TimeEntries: tenant isolation delete" ON time_entries;
CREATE POLICY "TimeEntries: tenant isolation delete"
  ON time_entries FOR DELETE
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE tenant_id = get_current_tenant_id()
    )
  );

-- ============================================================================
-- SHIFTS TABLE POLICIES
-- Tenant isolation
-- ============================================================================

DROP POLICY IF EXISTS "Shifts: tenant isolation select" ON shifts;
CREATE POLICY "Shifts: tenant isolation select"
  ON shifts FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Shifts: tenant isolation insert" ON shifts;
CREATE POLICY "Shifts: tenant isolation insert"
  ON shifts FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Shifts: tenant isolation update" ON shifts;
CREATE POLICY "Shifts: tenant isolation update"
  ON shifts FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Shifts: tenant isolation delete" ON shifts;
CREATE POLICY "Shifts: tenant isolation delete"
  ON shifts FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- ORDER_EMPLOYEE_ASSIGNMENTS TABLE POLICIES
-- Tenant isolation via orders table
-- ============================================================================

DROP POLICY IF EXISTS "OrderAssignments: tenant isolation select" ON order_employee_assignments;
CREATE POLICY "OrderAssignments: tenant isolation select"
  ON order_employee_assignments FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE tenant_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "OrderAssignments: tenant isolation insert" ON order_employee_assignments;
CREATE POLICY "OrderAssignments: tenant isolation insert"
  ON order_employee_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE tenant_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "OrderAssignments: tenant isolation update" ON order_employee_assignments;
CREATE POLICY "OrderAssignments: tenant isolation update"
  ON order_employee_assignments FOR UPDATE
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE tenant_id = get_current_tenant_id()
    )
  )
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE tenant_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "OrderAssignments: tenant isolation delete" ON order_employee_assignments;
CREATE POLICY "OrderAssignments: tenant isolation delete"
  ON order_employee_assignments FOR DELETE
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE tenant_id = get_current_tenant_id()
    )
  );

-- ============================================================================
-- SHIFT_EMPLOYEES TABLE POLICIES
-- Tenant isolation via shifts table
-- ============================================================================

DROP POLICY IF EXISTS "ShiftEmployees: tenant isolation select" ON shift_employees;
CREATE POLICY "ShiftEmployees: tenant isolation select"
  ON shift_employees FOR SELECT
  TO authenticated
  USING (
    shift_id IN (
      SELECT id FROM shifts WHERE tenant_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "ShiftEmployees: tenant isolation insert" ON shift_employees;
CREATE POLICY "ShiftEmployees: tenant isolation insert"
  ON shift_employees FOR INSERT
  TO authenticated
  WITH CHECK (
    shift_id IN (
      SELECT id FROM shifts WHERE tenant_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "ShiftEmployees: tenant isolation update" ON shift_employees;
CREATE POLICY "ShiftEmployees: tenant isolation update"
  ON shift_employees FOR UPDATE
  TO authenticated
  USING (
    shift_id IN (
      SELECT id FROM shifts WHERE tenant_id = get_current_tenant_id()
    )
  )
  WITH CHECK (
    shift_id IN (
      SELECT id FROM shifts WHERE tenant_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "ShiftEmployees: tenant isolation delete" ON shift_employees;
CREATE POLICY "ShiftEmployees: tenant isolation delete"
  ON shift_employees FOR DELETE
  TO authenticated
  USING (
    shift_id IN (
      SELECT id FROM shifts WHERE tenant_id = get_current_tenant_id()
    )
  );

-- ============================================================================
-- Verify policies were created
-- ============================================================================

SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
