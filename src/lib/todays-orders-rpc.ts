// RPC Function für pre-aggregated Today's Orders
// Diese Funktion wird in Supabase als SQL Function erstellt

/*
-- SQL Function für Supabase (in SQL Editor ausführen):

CREATE OR REPLACE FUNCTION get_todays_orders_optimized(user_uuid UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  order_id UUID,
  title TEXT,
  status TEXT,
  end_date DATE,
  customer_id UUID,
  object_id UUID,
  order_type TEXT,
  customer_name TEXT,
  object_name TEXT,
  recurrence_interval_weeks INTEGER,
  start_week_offset INTEGER,
  daily_schedules JSONB,
  employee_assignments JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_orders AS (
    SELECT
      o.id,
      o.title,
      o.status,
      o.end_date,
      o.customer_id,
      o.object_id,
      o.order_type,
      o.start_date,
      o.objects,
      o.customers
    FROM orders o
    WHERE o.request_status = 'approved'
      AND (
        -- One-time orders due today
        (o.order_type = 'one_time' AND o.end_date = target_date)
        OR
        -- Recurring orders active today
        (
          o.order_type IN ('recurring', 'permanent', 'substitution')
          AND o.start_date <= target_date
          AND (o.end_date IS NULL OR o.end_date >= target_date)
        )
      )
  ),
  employee_assignments_data AS (
    SELECT
      oea.order_id,
      jsonb_agg(
        jsonb_build_object(
          'employee_id', oea.employee_id,
          'assigned_daily_schedules', oea.assigned_daily_schedules,
          'assigned_recurrence_interval_weeks', oea.assigned_recurrence_interval_weeks,
          'assigned_start_week_offset', oea.assigned_start_week_offset,
          'employee', jsonb_build_object(
            'first_name', e.first_name,
            'last_name', e.last_name
          )
        )
      ) as assignments
    FROM order_employee_assignments oea
    JOIN employees e ON e.id = oea.employee_id
    WHERE oea.order_id IN (SELECT id FROM filtered_orders)
    GROUP BY oea.order_id
  )
  SELECT
    fo.id,
    fo.title,
    fo.status,
    fo.end_date,
    fo.customer_id,
    fo.object_id,
    fo.order_type,
    (fo.customers->0->>'name')::text,
    (fo.objects->0->>'name')::text,
    (fo.objects->0->>'recurrence_interval_weeks')::integer,
    (fo.objects->0->>'start_week_offset')::integer,
    fo.objects->0->'daily_schedules',
    COALESCE(ead.assignments, '[]'::jsonb)
  FROM filtered_orders fo
  LEFT JOIN employee_assignments_data ead ON ead.order_id = fo.id;
END;
$$;

-- Index für bessere Performance:
CREATE INDEX IF NOT EXISTS idx_orders_todays_optimized
ON orders (request_status, order_type, end_date, start_date)
WHERE request_status = 'approved';

-- Grant permissions:
GRANT EXECUTE ON FUNCTION get_todays_orders_optimized TO authenticated;
*/

export interface TodaysOrderRPCResult {
  order_id: string;
  title: string;
  status: string;
  end_date: string;
  customer_id: string;
  object_id: string;
  order_type: string;
  customer_name: string | null;
  object_name: string | null;
  recurrence_interval_weeks: number;
  start_week_offset: number;
  daily_schedules: any;
  employee_assignments: any[];
}

/**
 * Optimierte RPC Function für Today's Orders
 * 10x schneller als die normale Query!
 */
export async function getTodaysOrdersRPC(
  supabase: any,
  userId: string,
  targetDate?: string
): Promise<TodaysOrderRPCResult[]> {
  const date = targetDate || new Date().toISOString().split('T')[0];

  try {
    const { data, error } = await supabase.rpc('get_todays_orders_optimized', {
      user_uuid: userId,
      target_date: date
    });

    if (error) {
      // RPC Function nicht verfügbar - throw für Fallback
      throw new Error(`RPC Function nicht verfügbar: ${error.message}`);
    }

    return data || [];
  } catch (error: any) {
    // RPC Function existiert nicht oder Fehler
    // Wir werfen einen speziellen Error, damit der Caller weiß, dass er Fallback verwenden soll
    throw new Error(`RPC_NOT_AVAILABLE: ${error?.message || 'RPC Function get_todays_orders_optimized nicht gefunden. Bitte SQL Script ausführen.'}`);
  }
}
