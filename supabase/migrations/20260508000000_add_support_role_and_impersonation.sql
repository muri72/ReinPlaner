-- Migration: Add support role + impersonation system + platform KPIs
-- Run: supabase db push --linked

BEGIN;

-- 0. Ensure profiles has a primary key
DO $$
BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. Extend CHECK constraint to include 'support' role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'employee', 'customer', 'platform_admin', 'support'));

-- 2. Add impersonation fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS impersonated_by UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS impersonated_at TIMESTAMPTZ;

-- 3. Drop and recreate impersonation_sessions cleanly
DROP TABLE IF EXISTS impersonation_sessions CASCADE;

CREATE TABLE impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_admin_id UUID NOT NULL,
  target_tenant_id UUID NOT NULL,
  target_user_id UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  reason TEXT,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX impersonation_sessions_platform_admin_idx ON impersonation_sessions(platform_admin_id);
CREATE INDEX impersonation_sessions_target_tenant_idx ON impersonation_sessions(target_tenant_id);
CREATE INDEX impersonation_sessions_target_user_idx ON impersonation_sessions(target_user_id);

-- 4. Start impersonation session
CREATE OR REPLACE FUNCTION start_impersonation_session(
  p_target_tenant_id UUID,
  p_target_user_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE v_session_id UUID;
        v_platform_admin_id UUID;
BEGIN
  v_platform_admin_id := auth.uid();
  IF v_platform_admin_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_platform_admin_id AND role = 'platform_admin') THEN
    RAISE EXCEPTION 'Only platform admins can impersonate';
  END IF;
  INSERT INTO impersonation_sessions (platform_admin_id, target_tenant_id, target_user_id, reason)
  VALUES (v_platform_admin_id, p_target_tenant_id, p_target_user_id, p_reason)
  RETURNING id INTO v_session_id;
  IF p_target_user_id IS NOT NULL THEN
    UPDATE profiles SET impersonated_by = v_platform_admin_id, impersonated_at = NOW() WHERE id = p_target_user_id;
  END IF;
  RETURN v_session_id;
END;
$$;

-- 5. End impersonation session
CREATE OR REPLACE FUNCTION end_impersonation_session(p_session_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE v_platform_admin_id UUID;
BEGIN
  v_platform_admin_id := auth.uid();
  IF v_platform_admin_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE impersonation_sessions SET ended_at = NOW()
  WHERE platform_admin_id = v_platform_admin_id AND ended_at IS NULL
    AND (p_session_id IS NULL OR id = p_session_id);
  UPDATE profiles SET impersonated_by = NULL, impersonated_at = NULL WHERE impersonated_by = v_platform_admin_id;
END;
$$;

-- 6. Revenue view (from orders.fixed_monthly_price — no invoices table)
DROP VIEW IF EXISTS platform_revenue_stats;
CREATE VIEW platform_revenue_stats AS
SELECT
  t.id AS tenant_id, t.name AS tenant_name, t.slug AS tenant_slug, t.plan, t.status,
  t.monthly_rate_cents,
  COALESCE(SUM(o.fixed_monthly_price) FILTER (WHERE o.status = 'active' AND o.order_type = 'recurring'), 0) AS mrr,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'active') AS active_orders,
  COUNT(DISTINCT e.id) AS total_employees,
  COUNT(DISTINCT c.id) AS total_customers,
  COUNT(DISTINCT o.id) AS total_orders
FROM tenants t
LEFT JOIN orders o ON o.tenant_id = t.id
LEFT JOIN employees e ON e.tenant_id = t.id
LEFT JOIN customers c ON c.tenant_id = t.id
GROUP BY t.id, t.name, t.slug, t.plan, t.status, t.monthly_rate_cents;

-- 7. Platform KPIs function
CREATE OR REPLACE FUNCTION get_platform_kpis()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE v_result JSON;
BEGIN
  SELECT json_build_object(
    'monthly_revenue', COALESCE((SELECT SUM(mrr) FROM platform_revenue_stats WHERE status = 'active'), 0),
    'total_revenue', COALESCE((SELECT SUM(mrr) FROM platform_revenue_stats), 0),
    'active_tenants', (SELECT COUNT(*) FROM tenants WHERE status = 'active'),
    'total_tenants', (SELECT COUNT(*) FROM tenants),
    'suspended_tenants', (SELECT COUNT(*) FROM tenants WHERE status = 'suspended'),
    'pending_tenants', (SELECT COUNT(*) FROM tenants WHERE status = 'pending'),
    'total_orders', (SELECT COUNT(*) FROM orders),
    'active_orders', (SELECT COUNT(*) FROM orders WHERE status = 'active'),
    'total_employees', (SELECT COUNT(*) FROM employees),
    'total_customers', (SELECT COUNT(*) FROM customers),
    'starter_plan_count', (SELECT COUNT(*) FROM tenants WHERE plan = 'starter' AND status = 'active'),
    'professional_plan_count', (SELECT COUNT(*) FROM tenants WHERE plan = 'professional' AND status = 'active'),
    'enterprise_plan_count', (SELECT COUNT(*) FROM tenants WHERE plan = 'enterprise' AND status = 'active')
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- 8. Monthly MRR history (last 12 months)
CREATE OR REPLACE FUNCTION get_monthly_revenue_history(months_count INT DEFAULT 12)
RETURNS TABLE(month DATE, mrr NUMERIC, tenant_count INT, order_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('month', o.created_at)::DATE AS month,
    COALESCE(SUM(o.fixed_monthly_price) FILTER (WHERE o.status = 'active'), 0) AS mrr,
    COUNT(DISTINCT o.tenant_id) AS tenant_count,
    COUNT(DISTINCT o.id) AS order_count
  FROM orders o
  WHERE o.created_at >= DATE_TRUNC('month', NOW() - ((months_count - 1) || ' months')::INTERVAL)
    AND o.order_type = 'recurring'
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$;

-- 9. Revenue forecast (simple trend extrapolation)
CREATE OR REPLACE FUNCTION get_revenue_forecast(months_ahead INT DEFAULT 3)
RETURNS TABLE(month DATE, predicted_mrr NUMERIC, confidence TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_avg_growth NUMERIC := 0.05;
  v_last_mrr NUMERIC;
  v_last_month DATE;
BEGIN
  SELECT DATE_TRUNC('month', MAX(created_at))::DATE,
         SUM(fixed_monthly_price)
  INTO v_last_month, v_last_mrr
  FROM orders
  WHERE order_type = 'recurring' AND status = 'active'
    AND created_at >= DATE_TRUNC('month', NOW() - INTERVAL '12 months');

  WITH monthly_data AS (
    SELECT DATE_TRUNC('month', created_at) AS month, SUM(fixed_monthly_price) AS mrr
    FROM orders WHERE order_type = 'recurring' AND status = 'active'
      AND created_at >= DATE_TRUNC('month', NOW() - INTERVAL '12 months')
    GROUP BY 1
  ),
  growth_rates AS (
    SELECT mrr, LAG(mrr) OVER (ORDER BY month) AS prev_mrr,
           CASE WHEN LAG(mrr) OVER (ORDER BY month) > 0
                THEN (mrr - LAG(mrr) OVER (ORDER BY month)) / LAG(mrr) OVER (ORDER BY month)
                ELSE 0 END AS growth_rate
    FROM monthly_data
  )
  SELECT COALESCE(AVG(growth_rate), 0.05) INTO v_avg_growth
  FROM growth_rates WHERE prev_mrr > 0;

  FOR i IN 1..months_ahead LOOP
    month := v_last_month + (i || ' months')::INTERVAL;
    predicted_mrr := ROUND(COALESCE(v_last_mrr, 0) * POWER(1 + v_avg_growth, i), 2);
    confidence := CASE WHEN i <= 1 THEN 'high' WHEN i <= 2 THEN 'medium' ELSE 'low' END;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- 10. Tenant detail for impersonation
CREATE OR REPLACE FUNCTION get_tenant_detail(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE v_result JSON;
        v_orders JSON;
BEGIN
  SELECT json_agg(json_build_object('id', id, 'title', title, 'status', status))
  INTO v_orders
  FROM (
    SELECT id, title, status FROM orders
    WHERE tenant_id = p_tenant_id
    ORDER BY created_at DESC
    LIMIT 10
  ) sub;

  SELECT json_build_object(
    'tenant', (SELECT json_build_object('id', id, 'name', name, 'slug', slug, 'plan', plan, 'status', status)
               FROM tenants WHERE id = p_tenant_id),
    'active_orders', (SELECT COUNT(*) FROM orders WHERE tenant_id = p_tenant_id AND status = 'active'),
    'total_employees', (SELECT COUNT(*) FROM employees WHERE tenant_id = p_tenant_id),
    'total_customers', (SELECT COUNT(*) FROM customers WHERE tenant_id = p_tenant_id),
    'mrr', (SELECT COALESCE(SUM(fixed_monthly_price), 0) FROM orders WHERE tenant_id = p_tenant_id AND status = 'active' AND order_type = 'recurring'),
    'recent_orders', COALESCE(v_orders, '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMIT;
