-- =============================================================================
-- RLS COMPLETION v2 - Fill missing RLS policies (SCHEMA-AWARE)
-- Datum: 03.05.2026
-- =============================================================================

BEGIN;

-- =============================================================================
-- PROFILES: Replace old single policy with role-based policies
-- =============================================================================

DROP POLICY IF EXISTS profiles_tenant_isolation ON profiles;

CREATE POLICY profiles_admin ON profiles FOR ALL TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() = 'admin');

CREATE POLICY profiles_manager ON profiles FOR SELECT TO authenticated
  USING (tenant_id = user_tenant_id() AND user_tenant_role() IN ('admin', 'manager'));

CREATE POLICY profiles_own ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_update_own ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- =============================================================================
-- OBJECTS: Isolation via customer_id → customer's tenant
-- =============================================================================

ALTER TABLE objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY objects_admin ON objects FOR ALL TO authenticated
  USING (
    user_tenant_role() = 'admin'
    AND customer_id IN (SELECT id FROM customers WHERE tenant_id = user_tenant_id())
  );

CREATE POLICY objects_employee ON objects FOR SELECT TO authenticated
  USING (
    user_tenant_role() IN ('admin', 'manager', 'employee')
    AND customer_id IN (SELECT id FROM customers WHERE tenant_id = user_tenant_id())
  );

-- =============================================================================
-- CUSTOMER_CONTACTS: Isolation via customer_id
-- =============================================================================

ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY customer_contacts_admin ON customer_contacts FOR ALL TO authenticated
  USING (
    user_tenant_role() IN ('admin', 'manager')
    AND customer_id IN (SELECT id FROM customers WHERE tenant_id = user_tenant_id())
  );

CREATE POLICY customer_contacts_employee ON customer_contacts FOR SELECT TO authenticated
  USING (
    user_tenant_role() IN ('admin', 'manager', 'employee')
    AND customer_id IN (SELECT id FROM customers WHERE tenant_id = user_tenant_id())
  );

CREATE POLICY customer_contacts_insert ON customer_contacts FOR INSERT TO authenticated
  WITH CHECK (
    user_tenant_role() IN ('admin', 'manager')
    AND customer_id IN (SELECT id FROM customers WHERE tenant_id = user_tenant_id())
  );

-- =============================================================================
-- MANAGER_CUSTOMER_ASSIGNMENTS: Isolation via customers
-- =============================================================================

ALTER TABLE manager_customer_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY manager_customer_assignments_admin ON manager_customer_assignments FOR ALL TO authenticated
  USING (
    user_tenant_role() = 'admin'
    AND customer_id IN (SELECT id FROM customers WHERE tenant_id = user_tenant_id())
  );

CREATE POLICY manager_customer_assignments_manager ON manager_customer_assignments FOR SELECT TO authenticated
  USING (
    user_tenant_role() IN ('admin', 'manager')
    AND customer_id IN (SELECT id FROM customers WHERE tenant_id = user_tenant_id())
  );

CREATE POLICY manager_customer_assignments_insert ON manager_customer_assignments FOR INSERT TO authenticated
  WITH CHECK (
    user_tenant_role() = 'admin'
    AND customer_id IN (SELECT id FROM customers WHERE tenant_id = user_tenant_id())
  );

-- =============================================================================
-- NOTIFICATIONS: Own user data only
-- =============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_own ON notifications FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY notifications_admin ON notifications FOR SELECT TO authenticated
  USING (user_tenant_role() = 'admin');

-- =============================================================================
-- DOCUMENTS: Isolation via associated entities
-- =============================================================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_admin ON documents FOR ALL TO authenticated
  USING (
    user_tenant_role() = 'admin'
    AND (
      associated_customer_id IN (SELECT id FROM customers WHERE tenant_id = user_tenant_id())
      OR associated_object_id IN (SELECT id FROM objects WHERE customer_id IN (SELECT id FROM customers WHERE tenant_id = user_tenant_id()))
      OR associated_order_id IN (SELECT id FROM orders WHERE tenant_id = user_tenant_id())
      OR associated_employee_id IN (SELECT id FROM employees WHERE tenant_id = user_tenant_id())
    )
  );

CREATE POLICY documents_employee ON documents FOR SELECT TO authenticated
  USING (
    user_tenant_role() IN ('admin', 'manager', 'employee')
    AND (
      associated_customer_id IN (SELECT id FROM customers WHERE tenant_id = user_tenant_id())
      OR associated_object_id IN (SELECT id FROM objects WHERE customer_id IN (SELECT id FROM customers WHERE tenant_id = user_tenant_id()))
      OR associated_order_id IN (SELECT id FROM orders WHERE tenant_id = user_tenant_id())
      OR associated_employee_id IN (SELECT id FROM employees WHERE tenant_id = user_tenant_id())
    )
  );

CREATE POLICY documents_insert ON documents FOR INSERT TO authenticated
  WITH CHECK (user_tenant_role() IN ('admin', 'manager'));

-- =============================================================================
-- TICKETS: Own user data + admin
-- =============================================================================

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tickets_admin ON tickets FOR ALL TO authenticated
  USING (
    user_tenant_role() = 'admin'
    AND (
      customer_id IN (SELECT id FROM customers WHERE tenant_id = user_tenant_id())
      OR user_id = auth.uid()
    )
  );

CREATE POLICY tickets_own ON tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY tickets_insert ON tickets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY tickets_update ON tickets FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR user_tenant_role() IN ('admin', 'manager')
  );

-- =============================================================================
-- SERVICES: Master data - admin write, all read
-- =============================================================================

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_services_read ON services;

CREATE POLICY services_admin ON services FOR ALL TO authenticated
  USING (user_tenant_role() = 'admin');

CREATE POLICY services_read ON services FOR SELECT TO authenticated
  USING (user_tenant_role() IN ('admin', 'manager', 'employee'));

-- =============================================================================
-- SERVICE_CATEGORIES
-- =============================================================================

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_categories_admin ON service_categories FOR ALL TO authenticated
  USING (user_tenant_role() = 'admin');

CREATE POLICY service_categories_read ON service_categories FOR SELECT TO authenticated
  USING (user_tenant_role() IN ('admin', 'manager', 'employee'));

-- =============================================================================
-- SERVICE_FEATURES
-- =============================================================================

ALTER TABLE service_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_features_admin ON service_features FOR ALL TO authenticated
  USING (user_tenant_role() = 'admin');

CREATE POLICY service_features_read ON service_features FOR SELECT TO authenticated
  USING (user_tenant_role() IN ('admin', 'manager', 'employee'));

-- =============================================================================
-- SERVICE_RATES
-- =============================================================================

ALTER TABLE service_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_rates_admin ON service_rates FOR ALL TO authenticated
  USING (user_tenant_role() = 'admin');

CREATE POLICY service_rates_read ON service_rates FOR SELECT TO authenticated
  USING (user_tenant_role() IN ('admin', 'manager', 'employee'));

-- =============================================================================
-- BUNDESLAENDER: Reference data - public read
-- =============================================================================

ALTER TABLE bundeslaender ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bundeslaender_read ON bundeslaender;
CREATE POLICY bundeslaender_read ON bundeslaender FOR SELECT TO authenticated
  USING (true);

-- =============================================================================
-- TIME_ACCOUNTS: Has employee_id (no tenant_id) - isolation via employee
-- =============================================================================

ALTER TABLE time_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY time_accounts_admin ON time_accounts FOR ALL TO authenticated
  USING (
    user_tenant_role() = 'admin'
    AND employee_id IN (SELECT id FROM employees WHERE tenant_id = user_tenant_id())
  );

CREATE POLICY time_accounts_manager ON time_accounts FOR SELECT TO authenticated
  USING (
    user_tenant_role() IN ('admin', 'manager')
    AND employee_id IN (SELECT id FROM employees WHERE tenant_id = user_tenant_id())
  );

CREATE POLICY time_accounts_employee ON time_accounts FOR SELECT TO authenticated
  USING (
    user_tenant_role() = 'employee'
    AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY time_accounts_insert ON time_accounts FOR INSERT TO authenticated
  WITH CHECK (
    user_tenant_role() IN ('admin', 'manager')
    AND employee_id IN (SELECT id FROM employees WHERE tenant_id = user_tenant_id())
  );

-- =============================================================================
-- TIME_ACCOUNT_TRANSACTIONS: No tenant_id/employee_id - isolation via time_account
-- =============================================================================

ALTER TABLE time_account_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY time_account_transactions_admin ON time_account_transactions FOR ALL TO authenticated
  USING (
    user_tenant_role() = 'admin'
    AND time_account_id IN (
      SELECT ta.id FROM time_accounts ta
      JOIN employees e ON e.id = ta.employee_id
      WHERE e.tenant_id = user_tenant_id()
    )
  );

CREATE POLICY time_account_transactions_manager ON time_account_transactions FOR SELECT TO authenticated
  USING (
    user_tenant_role() IN ('admin', 'manager')
    AND time_account_id IN (
      SELECT ta.id FROM time_accounts ta
      JOIN employees e ON e.id = ta.employee_id
      WHERE e.tenant_id = user_tenant_id()
    )
  );

CREATE POLICY time_account_transactions_employee ON time_account_transactions FOR SELECT TO authenticated
  USING (
    user_tenant_role() = 'employee'
    AND time_account_id IN (
      SELECT ta.id FROM time_accounts ta
      JOIN employees e ON e.id = ta.employee_id
      WHERE e.user_id = auth.uid()
    )
  );

CREATE POLICY time_account_transactions_insert ON time_account_transactions FOR INSERT TO authenticated
  WITH CHECK (
    user_tenant_role() IN ('admin', 'manager', 'employee')
    AND time_account_id IN (
      SELECT ta.id FROM time_accounts ta
      JOIN employees e ON e.id = ta.employee_id
      WHERE e.tenant_id = user_tenant_id()
    )
  );

-- =============================================================================
-- ABSENCE_REQUESTS: Has employee_id (no tenant_id) - isolation via employee
-- =============================================================================

ALTER TABLE absence_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY absence_requests_admin ON absence_requests FOR ALL TO authenticated
  USING (
    user_tenant_role() = 'admin'
    AND employee_id IN (SELECT id FROM employees WHERE tenant_id = user_tenant_id())
  );

CREATE POLICY absence_requests_manager ON absence_requests FOR SELECT TO authenticated
  USING (
    user_tenant_role() IN ('admin', 'manager')
    AND employee_id IN (SELECT id FROM employees WHERE tenant_id = user_tenant_id())
  );

CREATE POLICY absence_requests_employee ON absence_requests FOR SELECT TO authenticated
  USING (
    user_tenant_role() = 'employee'
    AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY absence_requests_insert ON absence_requests FOR INSERT TO authenticated
  WITH CHECK (
    (
      user_tenant_role() = 'employee'
      AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    )
    OR user_tenant_role() IN ('admin', 'manager')
  );

CREATE POLICY absence_requests_update ON absence_requests FOR UPDATE TO authenticated
  USING (
    (
      user_tenant_role() = 'employee'
      AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
      AND status = 'pending'
    )
    OR user_tenant_role() IN ('admin', 'manager')
  );

-- =============================================================================
-- APP_SETTINGS: Has user_id - admin write, all read
-- =============================================================================

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_settings_admin ON app_settings FOR ALL TO authenticated
  USING (user_tenant_role() = 'admin');

CREATE POLICY app_settings_read ON app_settings FOR SELECT TO authenticated
  USING (user_tenant_role() IN ('admin', 'manager'));

-- =============================================================================
-- INVOICE_SETTINGS: Has user_id - admin write, all read
-- =============================================================================

ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_settings_admin ON invoice_settings FOR ALL TO authenticated
  USING (user_tenant_role() = 'admin');

CREATE POLICY invoice_settings_read ON invoice_settings FOR SELECT TO authenticated
  USING (user_tenant_role() IN ('admin', 'manager'));

-- =============================================================================
-- TAX_SETTINGS: Has user_id - admin write, all read
-- =============================================================================

ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tax_settings_admin ON tax_settings FOR ALL TO authenticated
  USING (user_tenant_role() = 'admin');

CREATE POLICY tax_settings_read ON tax_settings FOR SELECT TO authenticated
  USING (user_tenant_role() IN ('admin', 'manager'));

-- =============================================================================
-- BANK_CONNECTIONS: Has user_id - admin only
-- =============================================================================

ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY bank_connections_admin ON bank_connections FOR ALL TO authenticated
  USING (user_tenant_role() = 'admin');

CREATE POLICY bank_connections_read ON bank_connections FOR SELECT TO authenticated
  USING (user_tenant_role() IN ('admin', 'manager'));

-- =============================================================================
-- AUDIT_LOGS: Has user_id - admin read
-- =============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_admin ON audit_logs FOR ALL TO authenticated
  USING (user_tenant_role() = 'admin');

CREATE POLICY audit_logs_read ON audit_logs FOR SELECT TO authenticated
  USING (user_tenant_role() IN ('admin', 'manager'));

-- =============================================================================
-- GENERAL_FEEDBACK: Own user data
-- =============================================================================

ALTER TABLE general_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY general_feedback_own ON general_feedback FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY general_feedback_admin ON general_feedback FOR ALL TO authenticated
  USING (user_tenant_role() = 'admin');

-- =============================================================================
-- ORDER_FEEDBACK: Has user_id - isolation via order assignment
-- =============================================================================

ALTER TABLE order_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_feedback_admin ON order_feedback;
DROP POLICY IF EXISTS order_feedback_employee ON order_feedback;
DROP POLICY IF EXISTS order_feedback_insert ON order_feedback;

CREATE POLICY order_feedback_admin ON order_feedback FOR ALL TO authenticated
  USING (user_tenant_role() = 'admin');

CREATE POLICY order_feedback_employee ON order_feedback FOR SELECT TO authenticated
  USING (
    user_tenant_role() IN ('admin', 'manager', 'employee')
    AND order_id IN (
      SELECT o.id FROM orders o
      JOIN order_employee_assignments oea ON oea.order_id = o.id
      JOIN employees e ON e.id = oea.employee_id
      WHERE e.user_id = auth.uid()
    )
  );

CREATE POLICY order_feedback_insert ON order_feedback FOR INSERT TO authenticated
  WITH CHECK (
    user_tenant_role() IN ('admin', 'manager', 'employee', 'customer')
    AND (user_tenant_role() IN ('admin', 'manager') OR order_id IN (
      SELECT o.id FROM orders o
      JOIN order_employee_assignments oea ON oea.order_id = o.id
      JOIN employees e ON e.id = oea.employee_id
      WHERE e.user_id = auth.uid()
    ))
  );

-- =============================================================================
-- DOCUMENT_TEMPLATES: Has user_id - admin write, all read
-- =============================================================================

ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY document_templates_admin ON document_templates FOR ALL TO authenticated
  USING (user_tenant_role() = 'admin');

CREATE POLICY document_templates_read ON document_templates FOR SELECT TO authenticated
  USING (user_tenant_role() IN ('admin', 'manager'));

-- =============================================================================
-- TEMPLATE_PLACEHOLDERS: Admin only
-- =============================================================================

ALTER TABLE template_placeholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY template_placeholders_admin ON template_placeholders FOR ALL TO authenticated
  USING (user_tenant_role() = 'admin');

CREATE POLICY template_placeholders_read ON template_placeholders FOR SELECT TO authenticated
  USING (user_tenant_role() IN ('admin', 'manager'));

-- =============================================================================
-- IMPERSONATION_SESSIONS: Uses admin_user_id and impersonated_user_id
-- =============================================================================

ALTER TABLE impersonation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY impersonation_sessions_admin ON impersonation_sessions FOR ALL TO authenticated
  USING (user_tenant_role() = 'admin');

CREATE POLICY impersonation_sessions_own ON impersonation_sessions FOR SELECT TO authenticated
  USING (
    admin_user_id = auth.uid()
    OR impersonated_user_id = auth.uid()
    OR user_tenant_role() = 'admin'
  );

COMMIT;
