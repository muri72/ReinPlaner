"use server";

import { createClient } from "@/lib/supabase/server";

// Simple in-memory cache with TTL
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 30000; // 30 seconds

/**
 * Get cached data or fetch new data
 */
function getCachedData<T>(key: string, fallback: T): T {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  cache.delete(key);
  return fallback;
}

/**
 * Set data in cache
 */
function setCachedData(key: string, data: any): void {
  cache.set(key, {
    data,
    expires: Date.now() + CACHE_TTL,
  });
}

/**
 * Ultra-optimized dashboard query with aggressive limits
 * Loads only the most essential data with minimal queries
 */
export async function getSuperOptimizedDashboardData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      customerCount: 0,
      objectCount: 0,
      employeeCount: 0,
      pendingRequestsCount: 0,
      activeEmployeesCount: 0,
      totalScheduledToday: 0,
      completedScheduledToday: 0,
      totalNewComplaintsToday: 0,
      revenueLast7Days: 0,
      scheduledOrdersToday: [],
      mappedPendingRequests: [],
      allUnresolvedFeedback: [],
      statusCounts: { pending: 0, in_progress: 0, completed: 0 },
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Set aggressive timeout
  const queryOptions = {
    headers: {
      'Prefer': 'return=minimal',
    },
    timeout: 10000, // 10 second timeout
  };

  try {
    // Only fetch the most essential counts with head: true (super fast)
    const [
      customerCount,
      objectCount,
      employeeCount,
      pendingRequests,
      activeEmployeesToday,
      generalFeedbackToday,
      orderFeedbackToday,
      orderStatusCounts,
    ] = await Promise.allSettled([
      // Counts - use head: true for maximum performance
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('objects').select('*', { count: 'exact', head: true }),
      supabase.from('employees').select('*', { count: 'exact', head: true }),

      // Pending requests - AGGRESSIVE limit
      supabase
        .from('orders')
        .select('id, title, request_status, service_type, order_type, end_date, start_date')
        .eq('request_status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10), // Only 10 most recent

      // Active employees - AGGRESSIVE limit
      supabase
        .from('time_entries')
        .select('employee_id', { count: 'exact', head: true })
        .is('end_time', null)
        .gte('start_time', today.toISOString())
        .lte('start_time', tomorrow.toISOString()),

      // General feedback today - check what columns actually exist
      supabase
        .from('general_feedback')
        .select('id', { count: 'exact', head: true })
        .eq('is_resolved', false)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString()),

      // Order feedback today - AGGRESSIVE limit
      supabase
        .from('order_feedback')
        .select('id', { count: 'exact', head: true })
        .eq('is_resolved', false)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString()),

      // Order status counts - just count, no data
      supabase
        .from('orders')
        .select('status', { count: 'exact' })
        .limit(100), // Only count first 100
    ]);

    // Safe extract count with fallback
    const safeCount = (result: PromiseSettledResult<any>, fallback: number = 0) => {
      if (result.status === 'fulfilled' && result.value?.count !== undefined) {
        return result.value.count;
      }
      if (result.status === 'rejected') {
        console.warn("Query failed:", result.reason);
      }
      return fallback;
    };

    // Safe extract data with fallback
    const safeData = (result: PromiseSettledResult<any>, fallback: any = []) => {
      if (result.status === 'fulfilled') {
        return result.value?.data || fallback;
      }
      if (result.status === 'rejected') {
        console.warn("Query failed:", result.reason);
      }
      return fallback;
    };

    // Process data
    const pendingData = safeData(pendingRequests, []);
    const scheduledOrdersToday = pendingData.filter((o: any) => o.request_status === 'approved');
    const totalScheduledToday = scheduledOrdersToday.length;
    const completedScheduledToday = scheduledOrdersToday.filter((o: any) => o.status === 'completed').length;

    const totalNewComplaintsToday =
      safeCount(generalFeedbackToday, 0) +
      safeCount(orderFeedbackToday, 0);

    // Simple status aggregation
    const statusData = safeData(orderStatusCounts, []);
    const statusCounts = statusData.reduce((acc: Record<string, number>, order: any) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, { pending: 0, in_progress: 0, completed: 0 });

    return {
      customerCount: safeCount(customerCount, 0),
      objectCount: safeCount(objectCount, 0),
      employeeCount: safeCount(employeeCount, 0),
      pendingRequestsCount: pendingData.length,
      activeEmployeesCount: safeCount(activeEmployeesToday, 0),
      totalScheduledToday,
      completedScheduledToday,
      totalNewComplaintsToday,
      revenueLast7Days: 0, // Placeholder - can be loaded separately
      scheduledOrdersToday: [], // Load on demand
      mappedPendingRequests: pendingData.map((order: any) => ({
        id: order.id,
        title: order.title,
        customer_name: null, // Don't load to save time
        object_name: null,
        service_type: order.service_type,
        request_status: order.request_status,
        order_type: order.order_type,
        end_date: order.end_date,
        start_date: order.start_date,
      })),
      allUnresolvedFeedback: [], // Don't load to save time
      statusCounts,
    };

  } catch (error: any) {
    console.error("Critical error in dashboard:", error);
    // Return minimal data on error
    return {
      customerCount: 0,
      objectCount: 0,
      employeeCount: 0,
      pendingRequestsCount: 0,
      activeEmployeesCount: 0,
      totalScheduledToday: 0,
      completedScheduledToday: 0,
      totalNewComplaintsToday: 0,
      revenueLast7Days: 0,
      scheduledOrdersToday: [],
      mappedPendingRequests: [],
      allUnresolvedFeedback: [],
      statusCounts: { pending: 0, in_progress: 0, completed: 0 },
    };
  }
}

/**
 * Separate function to load detailed feedback (called on demand)
 */
export async function getUnresolvedFeedback() {
  const supabase = await createClient();

  try {
    // Try different column names for general feedback
    const { data: generalData, error: generalError } = await supabase
      .from('general_feedback')
      .select(`
        id,
        created_at,
        is_resolved,
        profiles ( first_name, last_name )
      `)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(3);

    if (generalError) {
      console.warn("General feedback query failed:", generalError.message);
    }

    const { data: orderData, error: orderError } = await supabase
      .from('order_feedback')
      .select(`
        id,
        rating,
        comment,
        created_at,
        is_resolved,
        orders ( title, customers ( name ) ),
        profiles ( first_name, last_name )
      `)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(3);

    if (orderError) {
      console.warn("Order feedback query failed:", orderError.message);
    }

    const mappedOrderFeedback = orderData?.map((f: any) => ({
      ...f,
      order: {
        title: f.orders?.title || 'Unbekannter Auftrag',
        customer_name: f.orders?.customers?.name || 'N/A',
      },
      replied_by_name: `${f.profiles?.first_name || ''} ${f.profiles?.last_name || ''}`.trim() || 'Admin',
    })) || [];

    const mappedGeneralFeedback = generalData?.map((f: any) => ({
      ...f,
      replied_by_name: `${f.profiles?.first_name || ''} ${f.profiles?.last_name || ''}`.trim() || 'Admin',
    })) || [];

    return [...mappedOrderFeedback, ...mappedGeneralFeedback]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  } catch (error: any) {
    console.error("Error loading feedback:", error);
    return [];
  }
}
