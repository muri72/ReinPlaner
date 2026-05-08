-- Sprint 4 — Lock down findings from Supabase database advisors
--
-- Addresses:
--   * ERROR security_definer_view: platform_revenue_stats
--   * WARN  rls_policy_always_true: tenants.tenants_admin_only
--   * INFO  rls_enabled_no_policy: impersonation_sessions
--   * WARN  function_search_path_mutable: update_updated_at_column,
--                                          seed_test_data
--   * WARN  anon/authenticated_security_definer_function_executable:
--           seed_*, impersonation_*, platform_kpi RPCs, tenant helpers

BEGIN;

-- 1. Convert SECURITY DEFINER view to security_invoker
DROP VIEW IF EXISTS public.platform_revenue_stats;
CREATE VIEW public.platform_revenue_stats
WITH (security_invoker = true) AS
SELECT t.id AS tenant_id,
       t.name AS tenant_name,
       t.slug AS tenant_slug,
       t.plan,
       t.status,
       t.monthly_rate_cents,
       COALESCE(sum(o.fixed_monthly_price)
                FILTER (WHERE o.status = 'active' AND o.order_type = 'recurring'), 0) AS mrr,
       count(DISTINCT o.id) FILTER (WHERE o.status = 'active') AS active_orders,
       count(DISTINCT e.id) AS total_employees,
       count(DISTINCT c.id) AS total_customers,
       count(DISTINCT o.id) AS total_orders
FROM public.tenants t
LEFT JOIN public.orders o    ON o.tenant_id = t.id
LEFT JOIN public.employees e ON e.tenant_id = t.id
LEFT JOIN public.customers c ON c.tenant_id = t.id
GROUP BY t.id, t.name, t.slug, t.plan, t.status, t.monthly_rate_cents;

-- 2. Replace overly permissive tenants policy
DROP POLICY IF EXISTS tenants_admin_only ON public.tenants;
CREATE POLICY tenants_platform_admin_all ON public.tenants FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- 3. RLS on impersonation_sessions (was empty)
CREATE POLICY impersonation_sessions_platform_admin_all
  ON public.impersonation_sessions FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY impersonation_sessions_actor_select
  ON public.impersonation_sessions FOR SELECT
  USING (platform_admin_id = auth.uid());

-- 4. Pin search_path on remaining mutable functions
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.seed_test_data()           SET search_path = public, pg_temp;

-- 5. Drop dead function from old session-var fallback
DROP FUNCTION IF EXISTS public.on_auth_user_login_set_context() CASCADE;

-- 6. Revoke EXECUTE on dangerous SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.seed_test_data()             FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_massive_test_data()     FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()            FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_tenant_id_to_metadata() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fill_tenant_id_default()     FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.start_impersonation_session(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.end_impersonation_session(uuid)               FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_platform_kpis()                           FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_revenue_forecast(integer)                 FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_monthly_revenue_history(integer)          FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_tenant_detail(uuid)                       FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_is_platform_admin(uuid)                  FROM anon;

REVOKE EXECUTE ON FUNCTION public.current_tenant_id()      FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_tenant_id()         FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_tenant_role()       FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin()      FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_tenant_access(uuid)  FROM anon;

COMMIT;
