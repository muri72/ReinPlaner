-- Sprint 5 — advisor follow-up: function lockdown, auth.<fn>() initplan, drop unused indexes
-- Idempotent. Safe to re-run.

-- ============================================================================
-- 1. SECURITY DEFINER lockdown
-- Revoke EXECUTE on every SECURITY DEFINER function in `public` from anon
-- (and from authenticated where the function is trigger-only or dev tooling).
-- RLS-helper functions stay EXECUTE-able by `authenticated` because RLS
-- policy expressions are evaluated as the calling role.
-- ============================================================================

-- Trigger-only / dev tooling: revoke from BOTH anon and authenticated.
REVOKE EXECUTE ON FUNCTION public.fill_tenant_id_default() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_tenant_id_to_metadata() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.seed_test_data() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.seed_massive_test_data() FROM anon, authenticated, public;

-- RLS helpers: revoke anon, keep authenticated (needed for policy evaluation).
REVOKE EXECUTE ON FUNCTION public.current_tenant_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_tenant_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_tenant_role() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_tenant_access(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_is_platform_admin(uuid) FROM anon, public;

-- Platform-admin RPCs (functions self-check is_platform_admin internally;
-- still revoke from anon to silence the linter).
REVOKE EXECUTE ON FUNCTION public.get_platform_kpis() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_monthly_revenue_history(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_revenue_forecast(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_tenant_detail(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.start_impersonation_session(uuid, uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.end_impersonation_session(uuid) FROM anon, public;

-- ============================================================================
-- 2. auth_rls_initplan — wrap auth.<fn>() / current_setting() in (select ...)
-- so PostgreSQL evaluates them once per query instead of once per row.
-- ============================================================================

-- tenants
DROP POLICY IF EXISTS "Platform admins can view all tenants" ON public.tenants;
CREATE POLICY "Platform admins can view all tenants" ON public.tenants
  FOR SELECT USING (((select auth.jwt()) ->> 'role') = 'platform_admin');

DROP POLICY IF EXISTS "Tenants can view own record" ON public.tenants;
CREATE POLICY "Tenants can view own record" ON public.tenants
  FOR SELECT USING ((slug)::text = ((select auth.jwt()) ->> 'tenant_slug'));

-- tenant_users
DROP POLICY IF EXISTS "Tenant admins can manage tenant users" ON public.tenant_users;
CREATE POLICY "Tenant admins can manage tenant users" ON public.tenant_users
  FOR ALL USING (
    tenant_id IN (
      SELECT t.id FROM public.tenants t
      WHERE (t.slug)::text = ((select auth.jwt()) ->> 'tenant_slug')
        AND EXISTS (
          SELECT 1 FROM public.tenant_users tu
          WHERE tu.tenant_id = t.id
            AND (tu.email)::text = ((select auth.jwt()) ->> 'email')
            AND (tu.role)::text = ANY (ARRAY['owner','admin'])
        )
    )
  );

-- tenant_audit_log
DROP POLICY IF EXISTS "Tenant users can view own tenant audit logs" ON public.tenant_audit_log;
CREATE POLICY "Tenant users can view own tenant audit logs" ON public.tenant_audit_log
  FOR SELECT USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu
      WHERE (tu.email)::text = ((select auth.jwt()) ->> 'email')
    )
  );

-- notifications
DROP POLICY IF EXISTS notifications_own ON public.notifications;
CREATE POLICY notifications_own ON public.notifications
  FOR SELECT USING (user_id = (select auth.uid()));

-- profiles
DROP POLICY IF EXISTS profiles_own ON public.profiles;
CREATE POLICY profiles_own ON public.profiles
  FOR SELECT USING (id = (select auth.uid()));

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (id = (select auth.uid())) WITH CHECK (id = (select auth.uid()));

-- general_feedback
DROP POLICY IF EXISTS general_feedback_own ON public.general_feedback;
CREATE POLICY general_feedback_own ON public.general_feedback
  FOR ALL USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

-- tickets
DROP POLICY IF EXISTS tickets_admin ON public.tickets;
CREATE POLICY tickets_admin ON public.tickets
  FOR ALL USING (
    (user_tenant_role() = 'admin')
    AND (
      customer_id IN (SELECT c.id FROM public.customers c WHERE c.tenant_id = user_tenant_id())
      OR user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS tickets_own ON public.tickets;
CREATE POLICY tickets_own ON public.tickets
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS tickets_insert ON public.tickets;
CREATE POLICY tickets_insert ON public.tickets
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS tickets_update ON public.tickets;
CREATE POLICY tickets_update ON public.tickets
  FOR UPDATE USING (
    user_id = (select auth.uid())
    OR user_tenant_role() = ANY (ARRAY['admin','manager'])
  );

-- time_accounts
DROP POLICY IF EXISTS time_accounts_employee ON public.time_accounts;
CREATE POLICY time_accounts_employee ON public.time_accounts
  FOR SELECT USING (
    user_tenant_role() = 'employee'
    AND employee_id IN (SELECT e.id FROM public.employees e WHERE e.user_id = (select auth.uid()))
  );

-- time_account_transactions
DROP POLICY IF EXISTS time_account_transactions_employee ON public.time_account_transactions;
CREATE POLICY time_account_transactions_employee ON public.time_account_transactions
  FOR SELECT USING (
    user_tenant_role() = 'employee'
    AND time_account_id IN (
      SELECT ta.id FROM public.time_accounts ta
      JOIN public.employees e ON e.id = ta.employee_id
      WHERE e.user_id = (select auth.uid())
    )
  );

-- absence_requests
DROP POLICY IF EXISTS absence_requests_employee ON public.absence_requests;
CREATE POLICY absence_requests_employee ON public.absence_requests
  FOR SELECT USING (
    user_tenant_role() = 'employee'
    AND employee_id IN (SELECT e.id FROM public.employees e WHERE e.user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS absence_requests_insert ON public.absence_requests;
CREATE POLICY absence_requests_insert ON public.absence_requests
  FOR INSERT WITH CHECK (
    (user_tenant_role() = 'employee'
      AND employee_id IN (SELECT e.id FROM public.employees e WHERE e.user_id = (select auth.uid())))
    OR user_tenant_role() = ANY (ARRAY['admin','manager'])
  );

DROP POLICY IF EXISTS absence_requests_update ON public.absence_requests;
CREATE POLICY absence_requests_update ON public.absence_requests
  FOR UPDATE USING (
    (user_tenant_role() = 'employee'
      AND employee_id IN (SELECT e.id FROM public.employees e WHERE e.user_id = (select auth.uid()))
      AND status = 'pending')
    OR user_tenant_role() = ANY (ARRAY['admin','manager'])
  );

-- order_feedback
DROP POLICY IF EXISTS order_feedback_employee ON public.order_feedback;
CREATE POLICY order_feedback_employee ON public.order_feedback
  FOR SELECT USING (
    user_tenant_role() = ANY (ARRAY['admin','manager','employee'])
    AND order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.order_employee_assignments oea ON oea.order_id = o.id
      JOIN public.employees e ON e.id = oea.employee_id
      WHERE e.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS order_feedback_insert ON public.order_feedback;
CREATE POLICY order_feedback_insert ON public.order_feedback
  FOR INSERT WITH CHECK (
    user_tenant_role() = ANY (ARRAY['admin','manager','employee','customer'])
    AND (
      user_tenant_role() = ANY (ARRAY['admin','manager'])
      OR order_id IN (
        SELECT o.id FROM public.orders o
        JOIN public.order_employee_assignments oea ON oea.order_id = o.id
        JOIN public.employees e ON e.id = oea.employee_id
        WHERE e.user_id = (select auth.uid())
      )
    )
  );

-- impersonation_sessions
DROP POLICY IF EXISTS impersonation_sessions_actor_select ON public.impersonation_sessions;
CREATE POLICY impersonation_sessions_actor_select ON public.impersonation_sessions
  FOR SELECT USING (platform_admin_id = (select auth.uid()));

-- ============================================================================
-- 3. Drop unused indexes (per pg_stat_user_indexes / advisor)
-- ============================================================================

DROP INDEX IF EXISTS public.idx_tenants_domain;
DROP INDEX IF EXISTS public.idx_tenant_users_tenant;
DROP INDEX IF EXISTS public.idx_tenant_users_email;
DROP INDEX IF EXISTS public.idx_tenant_users_auth;
DROP INDEX IF EXISTS public.idx_tenant_domains_tenant;
DROP INDEX IF EXISTS public.idx_tenant_domains_domain;
DROP INDEX IF EXISTS public.idx_tenant_domains_verified;
DROP INDEX IF EXISTS public.idx_tenant_audit_tenant;
DROP INDEX IF EXISTS public.idx_tenant_audit_actor;
DROP INDEX IF EXISTS public.idx_tenant_audit_created;
DROP INDEX IF EXISTS public.impersonation_sessions_platform_admin_idx;
DROP INDEX IF EXISTS public.impersonation_sessions_target_tenant_idx;
DROP INDEX IF EXISTS public.impersonation_sessions_target_user_idx;
DROP INDEX IF EXISTS public.idx_shift_overrides_assignment_date;
DROP INDEX IF EXISTS public.idx_shift_overrides_date;
DROP INDEX IF EXISTS public.idx_shift_overrides_tenant;
DROP INDEX IF EXISTS public.idx_time_entries_order;
DROP INDEX IF EXISTS public.idx_time_entries_tenant_id;
DROP INDEX IF EXISTS public.idx_shift_employees_employee;
DROP INDEX IF EXISTS public.idx_shift_employees_tenant_id;
DROP INDEX IF EXISTS public.idx_customer_contacts_customer;
DROP INDEX IF EXISTS public.idx_order_employee_assignments_employee;
DROP INDEX IF EXISTS public.idx_oea_tenant_id;
DROP INDEX IF EXISTS public.idx_notifications_user_unread;
DROP INDEX IF EXISTS public.idx_customers_tenant_id;
DROP INDEX IF EXISTS public.idx_employees_tenant_id;
DROP INDEX IF EXISTS public.idx_orders_tenant_id;
DROP INDEX IF EXISTS public.idx_orders_object_id;
DROP INDEX IF EXISTS public.idx_shifts_tenant_id;
DROP INDEX IF EXISTS public.idx_profiles_tenant_id;
DROP INDEX IF EXISTS public.idx_profiles_user_id;
