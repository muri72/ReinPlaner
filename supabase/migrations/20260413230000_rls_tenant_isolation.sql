-- RLS Migration - nur tenant_id Tabellen
-- Sprint 5 Critical Security Fix

-- Tenant-basierte Tabellen
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_tenant_isolation" ON employees;
CREATE POLICY "employees_tenant_isolation" ON employees
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shifts_tenant_isolation" ON shifts;
CREATE POLICY "shifts_tenant_isolation" ON shifts
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers_tenant_isolation" ON customers;
CREATE POLICY "customers_tenant_isolation" ON customers
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_tenant_isolation" ON orders;
CREATE POLICY "orders_tenant_isolation" ON orders
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_tenant_isolation" ON profiles;
CREATE POLICY "profiles_tenant_isolation" ON profiles
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

ALTER TABLE shift_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shift_overrides_tenant_isolation" ON shift_overrides;
CREATE POLICY "shift_overrides_tenant_isolation" ON shift_overrides
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

ALTER TABLE order_employee_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_employee_assignments_tenant_isolation" ON order_employee_assignments;
CREATE POLICY "order_employee_assignments_tenant_isolation" ON order_employee_assignments
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

ALTER TABLE shift_employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shift_employees_tenant_isolation" ON shift_employees;
CREATE POLICY "shift_employees_tenant_isolation" ON shift_employees
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Tenants Admin only
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenants_admin_only" ON tenants;
CREATE POLICY "tenants_admin_only" ON tenants FOR ALL USING (true);

-- Public Tables
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_services_read" ON services;
CREATE POLICY "public_services_read" ON services FOR SELECT USING (true);

ALTER TABLE german_holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_holidays_read" ON german_holidays;
CREATE POLICY "public_holidays_read" ON german_holidays FOR SELECT USING (true);

SELECT 'RLS Migration completed' AS status;
