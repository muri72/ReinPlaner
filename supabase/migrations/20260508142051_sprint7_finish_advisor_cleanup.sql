-- Sprint 7 — finish advisor cleanup
-- 1. PRIMARY KEY on remaining 23 tables (all have id uuid/bigint NOT NULL DEFAULT)
-- 2. Re-create FK indexes that the unindexed_foreign_keys lint now requires
-- 3. Consolidate remaining multiple_permissive_policies on 24 tables

-- ============================================================================
-- 1. Add PRIMARY KEY constraints
-- ============================================================================
DO $$
DECLARE
  pk record;
BEGIN
  FOR pk IN
    SELECT * FROM (VALUES
      ('absence_requests','id'),('app_settings','id'),('audit_logs','id'),('bank_connections','id'),
      ('bundeslaender','code'),('customer_contacts','id'),('document_templates','id'),('documents','id'),
      ('general_feedback','id'),('german_holidays','id'),('invoice_settings','id'),
      ('manager_customer_assignments','id'),('notifications','id'),('order_feedback','id'),
      ('service_categories','id'),('service_features','id'),('service_rates','id'),('services','id'),
      ('tax_settings','id'),('template_placeholders','id'),('tickets','id'),
      ('time_account_transactions','id'),('time_accounts','id')
    ) AS v(table_name, column_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = ('public.'||pk.table_name)::regclass AND contype='p'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I PRIMARY KEY (%I)',
        pk.table_name, pk.table_name||'_pkey', pk.column_name);
    END IF;
  END LOOP;
END$$;

-- ============================================================================
-- 2. FK indexes (advisor flagged after Sprint 5 dropped them as unused)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON public.customers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON public.employees (tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON public.orders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_object_id ON public.orders (object_id);
CREATE INDEX IF NOT EXISTS idx_shifts_tenant_id ON public.shifts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_shift_employees_tenant_id ON public.shift_employees (tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant_id ON public.time_entries (tenant_id);
CREATE INDEX IF NOT EXISTS idx_oea_employee_id ON public.order_employee_assignments (employee_id);
CREATE INDEX IF NOT EXISTS idx_oea_tenant_id ON public.order_employee_assignments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_tenant_id ON public.tenant_audit_log (tenant_id);

-- ============================================================================
-- 3. Consolidate per-table policies. Drop legacy *_admin (FOR ALL) +
--    overlapping selects, recreate as one policy per action.
-- ============================================================================

-- Split Sprint 6 FOR ALL write policies so they no longer overlap SELECT.
DROP POLICY IF EXISTS customers_modify ON public.customers;
CREATE POLICY customers_insert ON public.customers FOR INSERT
  WITH CHECK ((select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager'])));
CREATE POLICY customers_update ON public.customers FOR UPDATE
  USING ((select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager'])))
  WITH CHECK ((select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager'])));
CREATE POLICY customers_delete ON public.customers FOR DELETE
  USING ((select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager'])));

DROP POLICY IF EXISTS impersonation_sessions_modify ON public.impersonation_sessions;
CREATE POLICY impersonation_sessions_insert ON public.impersonation_sessions FOR INSERT
  WITH CHECK ((select is_platform_admin()));
CREATE POLICY impersonation_sessions_update ON public.impersonation_sessions FOR UPDATE
  USING ((select is_platform_admin())) WITH CHECK ((select is_platform_admin()));
CREATE POLICY impersonation_sessions_delete ON public.impersonation_sessions FOR DELETE
  USING ((select is_platform_admin()));

DROP POLICY IF EXISTS order_employee_assignments_modify ON public.order_employee_assignments;
CREATE POLICY order_employee_assignments_insert ON public.order_employee_assignments FOR INSERT
  WITH CHECK ((select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager'])));
CREATE POLICY order_employee_assignments_update ON public.order_employee_assignments FOR UPDATE
  USING ((select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager'])))
  WITH CHECK ((select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager'])));
CREATE POLICY order_employee_assignments_delete ON public.order_employee_assignments FOR DELETE
  USING ((select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager'])));

DROP POLICY IF EXISTS shift_employees_modify ON public.shift_employees;
CREATE POLICY shift_employees_insert ON public.shift_employees FOR INSERT
  WITH CHECK ((select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager'])));
CREATE POLICY shift_employees_update ON public.shift_employees FOR UPDATE
  USING ((select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager'])))
  WITH CHECK ((select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager'])));
CREATE POLICY shift_employees_delete ON public.shift_employees FOR DELETE
  USING ((select has_tenant_access(tenant_id))
    AND ((select is_platform_admin()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager'])));

DROP POLICY IF EXISTS tenants_modify ON public.tenants;
CREATE POLICY tenants_insert ON public.tenants FOR INSERT
  WITH CHECK ((select is_platform_admin()));
CREATE POLICY tenants_update ON public.tenants FOR UPDATE
  USING ((select is_platform_admin())) WITH CHECK ((select is_platform_admin()));
CREATE POLICY tenants_delete ON public.tenants FOR DELETE
  USING ((select is_platform_admin()));

-- Helper macro: tenant-wide read (admin/manager) + admin-only write
-- Used for: app_settings, audit_logs, bank_connections, document_templates,
--           invoice_settings, tax_settings, template_placeholders

DROP POLICY IF EXISTS app_settings_admin ON public.app_settings;
DROP POLICY IF EXISTS app_settings_read ON public.app_settings;
CREATE POLICY app_settings_select ON public.app_settings FOR SELECT
  USING ((select user_tenant_role()) = ANY (ARRAY['admin','manager']));
CREATE POLICY app_settings_modify ON public.app_settings FOR INSERT
  WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY app_settings_update ON public.app_settings FOR UPDATE
  USING ((select user_tenant_role()) = 'admin') WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY app_settings_delete ON public.app_settings FOR DELETE
  USING ((select user_tenant_role()) = 'admin');

DROP POLICY IF EXISTS audit_logs_admin ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_read ON public.audit_logs;
CREATE POLICY audit_logs_select ON public.audit_logs FOR SELECT
  USING ((select user_tenant_role()) = ANY (ARRAY['admin','manager']));
CREATE POLICY audit_logs_modify ON public.audit_logs FOR INSERT
  WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY audit_logs_update ON public.audit_logs FOR UPDATE
  USING ((select user_tenant_role()) = 'admin') WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY audit_logs_delete ON public.audit_logs FOR DELETE
  USING ((select user_tenant_role()) = 'admin');

DROP POLICY IF EXISTS bank_connections_admin ON public.bank_connections;
DROP POLICY IF EXISTS bank_connections_read ON public.bank_connections;
CREATE POLICY bank_connections_select ON public.bank_connections FOR SELECT
  USING ((select user_tenant_role()) = ANY (ARRAY['admin','manager']));
CREATE POLICY bank_connections_modify ON public.bank_connections FOR INSERT
  WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY bank_connections_update ON public.bank_connections FOR UPDATE
  USING ((select user_tenant_role()) = 'admin') WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY bank_connections_delete ON public.bank_connections FOR DELETE
  USING ((select user_tenant_role()) = 'admin');

DROP POLICY IF EXISTS document_templates_admin ON public.document_templates;
DROP POLICY IF EXISTS document_templates_read ON public.document_templates;
CREATE POLICY document_templates_select ON public.document_templates FOR SELECT
  USING ((select user_tenant_role()) = ANY (ARRAY['admin','manager']));
CREATE POLICY document_templates_modify ON public.document_templates FOR INSERT
  WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY document_templates_update ON public.document_templates FOR UPDATE
  USING ((select user_tenant_role()) = 'admin') WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY document_templates_delete ON public.document_templates FOR DELETE
  USING ((select user_tenant_role()) = 'admin');

DROP POLICY IF EXISTS invoice_settings_admin ON public.invoice_settings;
DROP POLICY IF EXISTS invoice_settings_read ON public.invoice_settings;
CREATE POLICY invoice_settings_select ON public.invoice_settings FOR SELECT
  USING ((select user_tenant_role()) = ANY (ARRAY['admin','manager']));
CREATE POLICY invoice_settings_modify ON public.invoice_settings FOR INSERT
  WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY invoice_settings_update ON public.invoice_settings FOR UPDATE
  USING ((select user_tenant_role()) = 'admin') WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY invoice_settings_delete ON public.invoice_settings FOR DELETE
  USING ((select user_tenant_role()) = 'admin');

DROP POLICY IF EXISTS tax_settings_admin ON public.tax_settings;
DROP POLICY IF EXISTS tax_settings_read ON public.tax_settings;
CREATE POLICY tax_settings_select ON public.tax_settings FOR SELECT
  USING ((select user_tenant_role()) = ANY (ARRAY['admin','manager']));
CREATE POLICY tax_settings_modify ON public.tax_settings FOR INSERT
  WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY tax_settings_update ON public.tax_settings FOR UPDATE
  USING ((select user_tenant_role()) = 'admin') WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY tax_settings_delete ON public.tax_settings FOR DELETE
  USING ((select user_tenant_role()) = 'admin');

DROP POLICY IF EXISTS template_placeholders_admin ON public.template_placeholders;
DROP POLICY IF EXISTS template_placeholders_read ON public.template_placeholders;
CREATE POLICY template_placeholders_select ON public.template_placeholders FOR SELECT
  USING ((select user_tenant_role()) = ANY (ARRAY['admin','manager']));
CREATE POLICY template_placeholders_modify ON public.template_placeholders FOR INSERT
  WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY template_placeholders_update ON public.template_placeholders FOR UPDATE
  USING ((select user_tenant_role()) = 'admin') WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY template_placeholders_delete ON public.template_placeholders FOR DELETE
  USING ((select user_tenant_role()) = 'admin');

-- service_* + services: read = admin/manager/employee, write = admin
DROP POLICY IF EXISTS service_categories_admin ON public.service_categories;
DROP POLICY IF EXISTS service_categories_read ON public.service_categories;
CREATE POLICY service_categories_select ON public.service_categories FOR SELECT
  USING ((select user_tenant_role()) = ANY (ARRAY['admin','manager','employee']));
CREATE POLICY service_categories_modify ON public.service_categories FOR INSERT
  WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY service_categories_update ON public.service_categories FOR UPDATE
  USING ((select user_tenant_role()) = 'admin') WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY service_categories_delete ON public.service_categories FOR DELETE
  USING ((select user_tenant_role()) = 'admin');

DROP POLICY IF EXISTS service_features_admin ON public.service_features;
DROP POLICY IF EXISTS service_features_read ON public.service_features;
CREATE POLICY service_features_select ON public.service_features FOR SELECT
  USING ((select user_tenant_role()) = ANY (ARRAY['admin','manager','employee']));
CREATE POLICY service_features_modify ON public.service_features FOR INSERT
  WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY service_features_update ON public.service_features FOR UPDATE
  USING ((select user_tenant_role()) = 'admin') WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY service_features_delete ON public.service_features FOR DELETE
  USING ((select user_tenant_role()) = 'admin');

DROP POLICY IF EXISTS service_rates_admin ON public.service_rates;
DROP POLICY IF EXISTS service_rates_read ON public.service_rates;
CREATE POLICY service_rates_select ON public.service_rates FOR SELECT
  USING ((select user_tenant_role()) = ANY (ARRAY['admin','manager','employee']));
CREATE POLICY service_rates_modify ON public.service_rates FOR INSERT
  WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY service_rates_update ON public.service_rates FOR UPDATE
  USING ((select user_tenant_role()) = 'admin') WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY service_rates_delete ON public.service_rates FOR DELETE
  USING ((select user_tenant_role()) = 'admin');

DROP POLICY IF EXISTS services_admin ON public.services;
DROP POLICY IF EXISTS services_read ON public.services;
CREATE POLICY services_select ON public.services FOR SELECT
  USING ((select user_tenant_role()) = ANY (ARRAY['admin','manager','employee']));
CREATE POLICY services_modify ON public.services FOR INSERT
  WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY services_update ON public.services FOR UPDATE
  USING ((select user_tenant_role()) = 'admin') WITH CHECK ((select user_tenant_role()) = 'admin');
CREATE POLICY services_delete ON public.services FOR DELETE
  USING ((select user_tenant_role()) = 'admin');

-- absence_requests: complex
DROP POLICY IF EXISTS absence_requests_admin ON public.absence_requests;
DROP POLICY IF EXISTS absence_requests_employee ON public.absence_requests;
DROP POLICY IF EXISTS absence_requests_manager ON public.absence_requests;
DROP POLICY IF EXISTS absence_requests_insert ON public.absence_requests;
DROP POLICY IF EXISTS absence_requests_update ON public.absence_requests;
CREATE POLICY absence_requests_select ON public.absence_requests FOR SELECT
  USING (
    ((select user_tenant_role()) = ANY (ARRAY['admin','manager'])
      AND employee_id IN (SELECT id FROM public.employees WHERE tenant_id = (select user_tenant_id())))
    OR ((select user_tenant_role()) = 'employee'
      AND employee_id IN (SELECT id FROM public.employees WHERE user_id = (select auth.uid())))
  );
CREATE POLICY absence_requests_insert ON public.absence_requests FOR INSERT
  WITH CHECK (
    ((select user_tenant_role()) = 'employee'
      AND employee_id IN (SELECT id FROM public.employees WHERE user_id = (select auth.uid())))
    OR (select user_tenant_role()) = ANY (ARRAY['admin','manager'])
  );
CREATE POLICY absence_requests_update ON public.absence_requests FOR UPDATE
  USING (
    ((select user_tenant_role()) = 'employee'
      AND employee_id IN (SELECT id FROM public.employees WHERE user_id = (select auth.uid()))
      AND status = 'pending')
    OR (select user_tenant_role()) = ANY (ARRAY['admin','manager'])
  );
CREATE POLICY absence_requests_delete ON public.absence_requests FOR DELETE
  USING ((select user_tenant_role()) = 'admin'
    AND employee_id IN (SELECT id FROM public.employees WHERE tenant_id = (select user_tenant_id())));

-- customer_contacts
DROP POLICY IF EXISTS customer_contacts_admin ON public.customer_contacts;
DROP POLICY IF EXISTS customer_contacts_employee ON public.customer_contacts;
DROP POLICY IF EXISTS customer_contacts_insert ON public.customer_contacts;
CREATE POLICY customer_contacts_select ON public.customer_contacts FOR SELECT
  USING ((select user_tenant_role()) = ANY (ARRAY['admin','manager','employee'])
    AND customer_id IN (SELECT id FROM public.customers WHERE tenant_id = (select user_tenant_id())));
CREATE POLICY customer_contacts_insert ON public.customer_contacts FOR INSERT
  WITH CHECK ((select user_tenant_role()) = ANY (ARRAY['admin','manager'])
    AND customer_id IN (SELECT id FROM public.customers WHERE tenant_id = (select user_tenant_id())));
CREATE POLICY customer_contacts_update ON public.customer_contacts FOR UPDATE
  USING ((select user_tenant_role()) = ANY (ARRAY['admin','manager'])
    AND customer_id IN (SELECT id FROM public.customers WHERE tenant_id = (select user_tenant_id())));
CREATE POLICY customer_contacts_delete ON public.customer_contacts FOR DELETE
  USING ((select user_tenant_role()) = ANY (ARRAY['admin','manager'])
    AND customer_id IN (SELECT id FROM public.customers WHERE tenant_id = (select user_tenant_id())));

-- documents
DROP POLICY IF EXISTS documents_admin ON public.documents;
DROP POLICY IF EXISTS documents_employee ON public.documents;
DROP POLICY IF EXISTS documents_insert ON public.documents;
CREATE POLICY documents_select ON public.documents FOR SELECT
  USING (
    (select user_tenant_role()) = ANY (ARRAY['admin','manager','employee'])
    AND (
      associated_customer_id IN (SELECT id FROM public.customers WHERE tenant_id = (select user_tenant_id()))
      OR associated_object_id IN (SELECT id FROM public.objects WHERE customer_id IN (SELECT id FROM public.customers WHERE tenant_id = (select user_tenant_id())))
      OR associated_order_id IN (SELECT id FROM public.orders WHERE tenant_id = (select user_tenant_id()))
      OR associated_employee_id IN (SELECT id FROM public.employees WHERE tenant_id = (select user_tenant_id()))
    )
  );
CREATE POLICY documents_insert ON public.documents FOR INSERT
  WITH CHECK ((select user_tenant_role()) = ANY (ARRAY['admin','manager']));
CREATE POLICY documents_update ON public.documents FOR UPDATE
  USING ((select user_tenant_role()) = 'admin');
CREATE POLICY documents_delete ON public.documents FOR DELETE
  USING ((select user_tenant_role()) = 'admin');

-- general_feedback: admin OR own
DROP POLICY IF EXISTS general_feedback_admin ON public.general_feedback;
DROP POLICY IF EXISTS general_feedback_own ON public.general_feedback;
CREATE POLICY general_feedback_select ON public.general_feedback FOR SELECT
  USING ((select user_tenant_role()) = 'admin' OR user_id = (select auth.uid()));
CREATE POLICY general_feedback_insert ON public.general_feedback FOR INSERT
  WITH CHECK ((select user_tenant_role()) = 'admin' OR user_id = (select auth.uid()));
CREATE POLICY general_feedback_update ON public.general_feedback FOR UPDATE
  USING ((select user_tenant_role()) = 'admin' OR user_id = (select auth.uid()))
  WITH CHECK ((select user_tenant_role()) = 'admin' OR user_id = (select auth.uid()));
CREATE POLICY general_feedback_delete ON public.general_feedback FOR DELETE
  USING ((select user_tenant_role()) = 'admin' OR user_id = (select auth.uid()));

-- manager_customer_assignments
DROP POLICY IF EXISTS manager_customer_assignments_admin ON public.manager_customer_assignments;
DROP POLICY IF EXISTS manager_customer_assignments_manager ON public.manager_customer_assignments;
DROP POLICY IF EXISTS manager_customer_assignments_insert ON public.manager_customer_assignments;
CREATE POLICY mca_select ON public.manager_customer_assignments FOR SELECT
  USING ((select user_tenant_role()) = ANY (ARRAY['admin','manager'])
    AND customer_id IN (SELECT id FROM public.customers WHERE tenant_id = (select user_tenant_id())));
CREATE POLICY mca_insert ON public.manager_customer_assignments FOR INSERT
  WITH CHECK ((select user_tenant_role()) = 'admin'
    AND customer_id IN (SELECT id FROM public.customers WHERE tenant_id = (select user_tenant_id())));
CREATE POLICY mca_update ON public.manager_customer_assignments FOR UPDATE
  USING ((select user_tenant_role()) = 'admin'
    AND customer_id IN (SELECT id FROM public.customers WHERE tenant_id = (select user_tenant_id())));
CREATE POLICY mca_delete ON public.manager_customer_assignments FOR DELETE
  USING ((select user_tenant_role()) = 'admin'
    AND customer_id IN (SELECT id FROM public.customers WHERE tenant_id = (select user_tenant_id())));

-- notifications
DROP POLICY IF EXISTS notifications_admin ON public.notifications;
DROP POLICY IF EXISTS notifications_own ON public.notifications;
CREATE POLICY notifications_select ON public.notifications FOR SELECT
  USING ((select user_tenant_role()) = 'admin' OR user_id = (select auth.uid()));

-- objects
DROP POLICY IF EXISTS objects_admin ON public.objects;
DROP POLICY IF EXISTS objects_employee ON public.objects;
CREATE POLICY objects_select ON public.objects FOR SELECT
  USING ((select user_tenant_role()) = ANY (ARRAY['admin','manager','employee'])
    AND customer_id IN (SELECT id FROM public.customers WHERE tenant_id = (select user_tenant_id())));
CREATE POLICY objects_insert ON public.objects FOR INSERT
  WITH CHECK ((select user_tenant_role()) = 'admin'
    AND customer_id IN (SELECT id FROM public.customers WHERE tenant_id = (select user_tenant_id())));
CREATE POLICY objects_update ON public.objects FOR UPDATE
  USING ((select user_tenant_role()) = 'admin'
    AND customer_id IN (SELECT id FROM public.customers WHERE tenant_id = (select user_tenant_id())));
CREATE POLICY objects_delete ON public.objects FOR DELETE
  USING ((select user_tenant_role()) = 'admin'
    AND customer_id IN (SELECT id FROM public.customers WHERE tenant_id = (select user_tenant_id())));

-- order_feedback
DROP POLICY IF EXISTS order_feedback_admin ON public.order_feedback;
DROP POLICY IF EXISTS order_feedback_employee ON public.order_feedback;
DROP POLICY IF EXISTS order_feedback_insert ON public.order_feedback;
CREATE POLICY order_feedback_select ON public.order_feedback FOR SELECT
  USING (
    (select user_tenant_role()) = 'admin'
    OR (
      (select user_tenant_role()) = ANY (ARRAY['admin','manager','employee'])
      AND order_id IN (
        SELECT o.id FROM public.orders o
        JOIN public.order_employee_assignments oea ON oea.order_id = o.id
        JOIN public.employees e ON e.id = oea.employee_id
        WHERE e.user_id = (select auth.uid())
      )
    )
  );
CREATE POLICY order_feedback_insert ON public.order_feedback FOR INSERT
  WITH CHECK (
    (select user_tenant_role()) = ANY (ARRAY['admin','manager','employee','customer'])
    AND (
      (select user_tenant_role()) = ANY (ARRAY['admin','manager'])
      OR order_id IN (
        SELECT o.id FROM public.orders o
        JOIN public.order_employee_assignments oea ON oea.order_id = o.id
        JOIN public.employees e ON e.id = oea.employee_id
        WHERE e.user_id = (select auth.uid())
      )
    )
  );
CREATE POLICY order_feedback_update ON public.order_feedback FOR UPDATE
  USING ((select user_tenant_role()) = 'admin');
CREATE POLICY order_feedback_delete ON public.order_feedback FOR DELETE
  USING ((select user_tenant_role()) = 'admin');

-- profiles
DROP POLICY IF EXISTS profiles_admin ON public.profiles;
DROP POLICY IF EXISTS profiles_manager ON public.profiles;
DROP POLICY IF EXISTS profiles_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT
  USING (
    id = (select auth.uid())
    OR (tenant_id = (select user_tenant_id())
        AND (select user_tenant_role()) = ANY (ARRAY['admin','manager']))
  );
CREATE POLICY profiles_insert ON public.profiles FOR INSERT
  WITH CHECK ((tenant_id = (select user_tenant_id())
    AND (select user_tenant_role()) = 'admin'));
CREATE POLICY profiles_update ON public.profiles FOR UPDATE
  USING (
    id = (select auth.uid())
    OR (tenant_id = (select user_tenant_id()) AND (select user_tenant_role()) = 'admin')
  )
  WITH CHECK (
    id = (select auth.uid())
    OR (tenant_id = (select user_tenant_id()) AND (select user_tenant_role()) = 'admin')
  );
CREATE POLICY profiles_delete ON public.profiles FOR DELETE
  USING (tenant_id = (select user_tenant_id()) AND (select user_tenant_role()) = 'admin');

-- shift_overrides
DROP POLICY IF EXISTS shift_overrides_admin ON public.shift_overrides;
DROP POLICY IF EXISTS shift_overrides_manager ON public.shift_overrides;
CREATE POLICY shift_overrides_select ON public.shift_overrides FOR SELECT
  USING (tenant_id = (select user_tenant_id())
    AND (select user_tenant_role()) = ANY (ARRAY['admin','manager']));
CREATE POLICY shift_overrides_insert ON public.shift_overrides FOR INSERT
  WITH CHECK (tenant_id = (select user_tenant_id())
    AND (select user_tenant_role()) = 'admin');
CREATE POLICY shift_overrides_update ON public.shift_overrides FOR UPDATE
  USING (tenant_id = (select user_tenant_id())
    AND (select user_tenant_role()) = 'admin');
CREATE POLICY shift_overrides_delete ON public.shift_overrides FOR DELETE
  USING (tenant_id = (select user_tenant_id())
    AND (select user_tenant_role()) = 'admin');

-- tickets (already has tickets_admin, tickets_own SELECT, tickets_insert, tickets_update)
DROP POLICY IF EXISTS tickets_admin ON public.tickets;
DROP POLICY IF EXISTS tickets_own ON public.tickets;
DROP POLICY IF EXISTS tickets_insert ON public.tickets;
DROP POLICY IF EXISTS tickets_update ON public.tickets;
CREATE POLICY tickets_select ON public.tickets FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR ((select user_tenant_role()) = 'admin'
        AND (customer_id IN (SELECT c.id FROM public.customers c WHERE c.tenant_id = (select user_tenant_id()))
             OR user_id = (select auth.uid())))
  );
CREATE POLICY tickets_insert ON public.tickets FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY tickets_update ON public.tickets FOR UPDATE
  USING (user_id = (select auth.uid()) OR (select user_tenant_role()) = ANY (ARRAY['admin','manager']));
CREATE POLICY tickets_delete ON public.tickets FOR DELETE
  USING ((select user_tenant_role()) = 'admin');

-- time_accounts
DROP POLICY IF EXISTS time_accounts_admin ON public.time_accounts;
DROP POLICY IF EXISTS time_accounts_employee ON public.time_accounts;
DROP POLICY IF EXISTS time_accounts_manager ON public.time_accounts;
DROP POLICY IF EXISTS time_accounts_insert ON public.time_accounts;
CREATE POLICY time_accounts_select ON public.time_accounts FOR SELECT
  USING (
    ((select user_tenant_role()) = ANY (ARRAY['admin','manager'])
      AND employee_id IN (SELECT id FROM public.employees WHERE tenant_id = (select user_tenant_id())))
    OR ((select user_tenant_role()) = 'employee'
      AND employee_id IN (SELECT id FROM public.employees WHERE user_id = (select auth.uid())))
  );
CREATE POLICY time_accounts_insert ON public.time_accounts FOR INSERT
  WITH CHECK ((select user_tenant_role()) = ANY (ARRAY['admin','manager'])
    AND employee_id IN (SELECT id FROM public.employees WHERE tenant_id = (select user_tenant_id())));
CREATE POLICY time_accounts_update ON public.time_accounts FOR UPDATE
  USING ((select user_tenant_role()) = 'admin'
    AND employee_id IN (SELECT id FROM public.employees WHERE tenant_id = (select user_tenant_id())));
CREATE POLICY time_accounts_delete ON public.time_accounts FOR DELETE
  USING ((select user_tenant_role()) = 'admin'
    AND employee_id IN (SELECT id FROM public.employees WHERE tenant_id = (select user_tenant_id())));

-- time_account_transactions
DROP POLICY IF EXISTS time_account_transactions_admin ON public.time_account_transactions;
DROP POLICY IF EXISTS time_account_transactions_employee ON public.time_account_transactions;
DROP POLICY IF EXISTS time_account_transactions_manager ON public.time_account_transactions;
DROP POLICY IF EXISTS time_account_transactions_insert ON public.time_account_transactions;
CREATE POLICY tat_select ON public.time_account_transactions FOR SELECT
  USING (
    ((select user_tenant_role()) = ANY (ARRAY['admin','manager'])
      AND time_account_id IN (
        SELECT ta.id FROM public.time_accounts ta
        JOIN public.employees e ON e.id = ta.employee_id
        WHERE e.tenant_id = (select user_tenant_id())))
    OR ((select user_tenant_role()) = 'employee'
      AND time_account_id IN (
        SELECT ta.id FROM public.time_accounts ta
        JOIN public.employees e ON e.id = ta.employee_id
        WHERE e.user_id = (select auth.uid())))
  );
CREATE POLICY tat_insert ON public.time_account_transactions FOR INSERT
  WITH CHECK ((select user_tenant_role()) = ANY (ARRAY['admin','manager','employee'])
    AND time_account_id IN (
      SELECT ta.id FROM public.time_accounts ta
      JOIN public.employees e ON e.id = ta.employee_id
      WHERE e.tenant_id = (select user_tenant_id())));
CREATE POLICY tat_update ON public.time_account_transactions FOR UPDATE
  USING ((select user_tenant_role()) = 'admin'
    AND time_account_id IN (
      SELECT ta.id FROM public.time_accounts ta
      JOIN public.employees e ON e.id = ta.employee_id
      WHERE e.tenant_id = (select user_tenant_id())));
CREATE POLICY tat_delete ON public.time_account_transactions FOR DELETE
  USING ((select user_tenant_role()) = 'admin'
    AND time_account_id IN (
      SELECT ta.id FROM public.time_accounts ta
      JOIN public.employees e ON e.id = ta.employee_id
      WHERE e.tenant_id = (select user_tenant_id())));
