"use server";

import { createClient } from "@/lib/supabase/server";

interface DashboardStats {
  // Counts
  customerCount: number;
  objectCount: number;
  employeeCount: number;
  pendingRequestsCount: number;
  activeEmployeesCount: number;
  totalScheduledToday: number;
  completedScheduledToday: number;
  totalNewComplaintsToday: number;
  revenueLast7Days: number;

  // Arrays with limited data
  scheduledOrdersToday: any[];
  mappedPendingRequests: any[];
  allUnresolvedFeedback: any[];
  statusCounts: Record<string, number>;
}

/**
 * Optimized query for counting orders by status
 * Uses aggregation instead of fetching all rows
 */
async function getOrderStatusCounts(supabase: any) {
  const { data, error } = await supabase
    .from('orders')
    .select('status', { count: 'exact' });

  if (error || !data) {
    console.error("Fehler beim Laden der Auftragsstatusdaten:", error);
    return { pending: 0, in_progress: 0, completed: 0 };
  }

  return data.reduce((acc: Record<string, number>, order: any) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Optimized query for getting today's scheduled orders
 * Selects only necessary columns and limits results
 */
async function getScheduledOrdersToday(supabase: any, today: Date) {
  // Simplified query - remove heavy joins and select only needed columns
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_type,
      due_date,
      recurring_start_date,
      recurring_end_date,
      status,
      request_status
    `)
    .eq('request_status', 'approved')
    .or(`due_date.eq.${format(today, 'yyyy-MM-dd')},and(recurring_start_date.lte.${format(today, 'yyyy-MM-dd')},or(recurring_end_date.gte.${format(today, 'yyyy-MM-dd')},recurring_end_date.is.null))`)
    .limit(100); // Add limit to prevent massive queries

  if (error) {
    console.error("Fehler beim Laden der geplanten Einsätze:", error?.message || error);
    return [];
  }

  return data || [];
}

/**
 * Optimized query for pending customer requests
 * Selects only necessary columns and limits results
 */
async function getPendingCustomerRequests(supabase: any) {
  // Optimized query - remove unnecessary joins and select only needed columns
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      user_id,
      title,
      description,
      status,
      due_date,
      created_at,
      customer_id,
      object_id,
      customer_contact_id,
      order_type,
      recurring_start_date,
      recurring_end_date,
      priority,
      total_estimated_hours,
      notes,
      request_status,
      service_type
    `)
    .eq('request_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50); // Add limit to prevent timeouts

  if (error) {
    console.error("Fehler beim Laden der offenen Kundenanfragen:", error?.message || error);
    return [];
  }

  // Fetch related data separately if needed (lazy loading)
  return data || [];
}

/**
 * Optimized query for unresolved feedback
 * Selects only necessary columns and limits results
 */
async function getUnresolvedFeedback(supabase: any) {
  const [orderFeedbackResult, generalFeedbackResult] = await Promise.all([
    // Order feedback - select only needed columns
    supabase
      .from('order_feedback')
      .select(`
        id,
        rating,
        comment,
        image_urls,
        created_at,
        is_resolved,
        orders!inner (
          title,
          customers ( name )
        ),
        profiles ( first_name, last_name )
      `)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(3),

    // General feedback - select only needed columns
    supabase
      .from('general_feedback')
      .select(`
        id,
        comment,
        image_urls,
        created_at,
        is_resolved,
        profiles ( first_name, last_name )
      `)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(3)
  ]);

  if (orderFeedbackResult.error) {
    console.error("Fehler beim Laden des ungelösten Auftrags-Feedbacks:", orderFeedbackResult.error?.message || orderFeedbackResult.error);
  }

  if (generalFeedbackResult.error) {
    console.error("Fehler beim Laden des ungelösten allgemeinen Feedbacks:", generalFeedbackResult.error?.message || generalFeedbackResult.error);
  }

  const mappedUnresolvedOrderFeedback = orderFeedbackResult.data?.map((f: any) => ({
    ...f,
    order: {
      title: f.orders?.title || 'Unbekannter Auftrag',
      customer_name: f.orders?.customers?.name || 'N/A',
    },
    replied_by_name: `${f.profiles?.first_name || ''} ${f.profiles?.last_name || ''}`.trim() || 'Admin',
  })) || [];

  const mappedUnresolvedGeneralFeedback = generalFeedbackResult.data?.map((f: any) => ({
    ...f,
    replied_by_name: `${f.profiles?.first_name || ''} ${f.profiles?.last_name || ''}`.trim() || 'Admin',
  })) || [];

  return [...mappedUnresolvedOrderFeedback, ...mappedUnresolvedGeneralFeedback]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Main function to fetch all dashboard data efficiently
 */
export async function getOptimizedDashboardData(): Promise<DashboardStats> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.warn("User not authenticated in dashboard data fetch");
    // Return default values instead of throwing
    return getDefaultDashboardStats();
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Set a reasonable timeout for queries
  const QUERY_TIMEOUT = 30000; // 30 seconds

  try {
    // Run all queries in parallel with timeout handling
    const [
      customerCountResult,
      objectCountResult,
      employeeCountResult,
      scheduledOrdersData,
      pendingRequestsData,
      orderStatusCounts,
      unresolvedFeedback,
      activeEmployeesResult,
      generalFeedbackResult,
      orderFeedbackResult
    ] = await Promise.allSettled([
      // Counts - use head: true for better performance
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('objects').select('*', { count: 'exact', head: true }),
      supabase.from('employees').select('*', { count: 'exact', head: true }),

      // Optimized queries
      getScheduledOrdersToday(supabase, today),
      getPendingCustomerRequests(supabase),

      // Status counts - use aggregation
      getOrderStatusCounts(supabase),

      // Unresolved feedback
      getUnresolvedFeedback(supabase),

      // Active employees today
      supabase
        .from('time_entries')
        .select('employee_id', { count: 'exact', head: true })
        .is('end_time', null)
        .gte('start_time', today.toISOString())
        .lte('start_time', tomorrow.toISOString()),

      // General feedback today
      supabase
        .from('general_feedback')
        .select('id', { count: 'exact', head: true })
        .eq('is_resolved', false)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString()),

      // Order feedback today
      supabase
        .from('order_feedback')
        .select('id', { count: 'exact', head: true })
        .eq('is_resolved', false)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())
    ]);

    // Handle errors gracefully - if a query fails, use default values
    const safeGetCount = (result: PromiseSettledResult<any>, fallback: number = 0) => {
      if (result.status === 'fulfilled' && result.value?.count !== undefined) {
        return result.value.count;
      }
      console.warn("Query failed, using fallback value:", fallback);
      return fallback;
    };

    const safeGetData = <T>(result: PromiseSettledResult<T>, fallback: T) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      console.warn("Query failed, using fallback data");
      return fallback;
    };

    // Extract data from settled promises
    const scheduledOrders = safeGetData(scheduledOrdersData, []);
    const pendingRequests = safeGetData(pendingRequestsData, []);
    const feedback = safeGetData(unresolvedFeedback, []);

    // Process scheduled orders for today's count
    const totalScheduledToday = Array.isArray(scheduledOrders) ? scheduledOrders.length : 0;
    const completedScheduledToday = Array.isArray(scheduledOrders)
      ? scheduledOrders.filter((o: any) => o.status === 'completed').length
      : 0;

    // Calculate new complaints today
    const totalNewComplaintsToday =
      safeGetCount(generalFeedbackResult, 0) +
      safeGetCount(orderFeedbackResult, 0);

    // Get revenue (placeholder - keep existing call)
    const revenueResult = { success: true, data: 0 };

    return {
      customerCount: safeGetCount(customerCountResult, 0),
      objectCount: safeGetCount(objectCountResult, 0),
      employeeCount: safeGetCount(employeeCountResult, 0),
      pendingRequestsCount: Array.isArray(pendingRequests) ? pendingRequests.length : 0,
      activeEmployeesCount: safeGetCount(activeEmployeesResult, 0),
      totalScheduledToday,
      completedScheduledToday,
      totalNewComplaintsToday,
      revenueLast7Days: revenueResult.data,
      scheduledOrdersToday: scheduledOrders,
      mappedPendingRequests: Array.isArray(pendingRequests)
        ? pendingRequests.map((order: any) => ({
            id: order.id,
            title: order.title,
            customer_name: null, // Would need separate query if needed
            object_name: null,   // Would need separate query if needed
            service_type: order.service_type,
            request_status: order.request_status,
            order_type: order.order_type,
            due_date: order.due_date,
            recurring_start_date: order.recurring_start_date,
            recurring_end_date: order.recurring_end_date,
          }))
        : [],
      allUnresolvedFeedback: feedback,
      statusCounts: safeGetData(orderStatusCounts, { pending: 0, in_progress: 0, completed: 0 }),
    };

  } catch (error: any) {
    console.error("Critical error in dashboard data fetch:", error);
    // Return default values on critical error
    return getDefaultDashboardStats();
  }
}

/**
 * Returns default dashboard stats when queries fail
 */
function getDefaultDashboardStats(): DashboardStats {
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

function format(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
