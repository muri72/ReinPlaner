/**
 * Optimized Server Actions with Caching
 * Uses stale-while-revalidate pattern for better performance
 * Supports batch operations for multiple employees
 */

"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================================
// CACHE UTILITIES (Stale-While-Revalidate Pattern)
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const actionCache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL = 30000; // 30 seconds
const SWR_STALE_TIME = 60000; // 1 minute stale-while-revalidate

function getCached<T>(key: string, ttl = DEFAULT_TTL): T | null {
  const entry = actionCache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > SWR_STALE_TIME) {
    // Still return data but mark as stale
    return entry.data;
  }
  if (age > ttl) {
    return null; // Cache expired
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T): void {
  actionCache.set(key, { data, timestamp: Date.now() });
}

function invalidateCache(pattern: string): void {
  for (const key of actionCache.keys()) {
    if (key.includes(pattern)) {
      actionCache.delete(key);
    }
  }
}

function createActionCacheKey(action: string, params: Record<string, any>): string {
  const sorted = Object.keys(params).sort()
    .reduce((acc, k) => { acc[k] = params[k]; return acc; }, {} as Record<string, any>);
  return `${action}:${JSON.stringify(sorted)}`;
}

// ============================================================================
// OPTIMIZED SHIFT QUERIES WITH CACHING
// ============================================================================

/**
 * Get shifts for a date range with caching
 */
export async function getShiftsWithCache(
  startDate: string,
  endDate: string
) {
  const cacheKey = createActionCacheKey('shifts', { startDate, endDate });
  const cached = getCached(cacheKey);
  if (cached) {
    // Return cached data immediately, trigger background refresh
    Promise.resolve().then(() => {
      refreshShiftsCache(startDate, endDate);
    });
    return cached;
  }

  return refreshShiftsCache(startDate, endDate);
}

async function refreshShiftsCache(startDate: string, endDate: string) {
  const supabase = createAdminClient();
  const cacheKey = createActionCacheKey('shifts', { startDate, endDate });

  const { data, error } = await supabase
    .from('shifts')
    .select(`
      id,
      shift_date,
      start_time,
      end_time,
      estimated_hours,
      status,
      assignment_id,
      order_id,
      shift_employees (
        employee_id,
        role,
        is_confirmed,
        employees (
          first_name,
          last_name
        )
      )
    `)
    .gte('shift_date', startDate)
    .lte('shift_date', endDate);

  if (error) {
    console.error('Error fetching shifts:', error);
    return { success: false, data: null, message: error.message };
  }

  const result = { success: true, data, message: 'ok' };
  setCached(cacheKey, result);
  return result;
}

/**
 * Get orders with caching
 */
export async function getOrdersWithCache(
  filters: { status?: string; customerId?: string } = {}
) {
  const cacheKey = createActionCacheKey('orders', filters);
  const cached = getCached(cacheKey);
  if (cached) {
    Promise.resolve().then(() => refreshOrdersCache(filters));
    return cached;
  }

  return refreshOrdersCache(filters);
}

async function refreshOrdersCache(filters: { status?: string; customerId?: string }) {
  const supabase = createAdminClient();
  const cacheKey = createActionCacheKey('orders', filters);

  let query = supabase
    .from('orders')
    .select(`
      id,
      title,
      status,
      request_status,
      start_date,
      end_date,
      priority,
      customer_id,
      object_id,
      order_type
    `)
    .eq('request_status', 'approved');

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.customerId) {
    query = query.eq('customer_id', filters.customerId);
  }

  const { data, error } = await query.limit(200);

  if (error) {
    return { success: false, data: null, message: error.message };
  }

  const result = { success: true, data, message: 'ok' };
  setCached(cacheKey, result);
  return result;
}

// ============================================================================
// BATCH OPERATIONS FOR MULTIPLE EMPLOYEES
// ============================================================================

/**
 * Get shift assignments for multiple employees in a single query
 * Optimized for batch processing
 */
export async function getBatchEmployeeAssignments(
  employeeIds: string[],
  startDate: string,
  endDate: string
) {
  if (!employeeIds || employeeIds.length === 0) {
    return { success: true, data: [], message: 'No employee IDs provided' };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('order_employee_assignments')
    .select(`
      id,
      order_id,
      employee_id,
      assigned_daily_schedules,
      assigned_recurrence_interval_weeks,
      assigned_start_week_offset,
      orders!inner (
        id,
        title,
        status,
        request_status,
        customer_id,
        object_id
      )
    `)
    .in('employee_id', employeeIds)
    .eq('orders.request_status', 'approved')
    .eq('status', 'active');

  if (error) {
    return { success: false, data: null, message: error.message };
  }

  // Group by employee
  const byEmployee = new Map<string, any[]>();
  for (const assignment of data || []) {
    const empId = assignment.employee_id;
    if (!byEmployee.has(empId)) {
      byEmployee.set(empId, []);
    }
    byEmployee.get(empId)!.push(assignment);
  }

  return { success: true, data: byEmployee, message: 'ok' };
}

/**
 * Get time entries for multiple employees in a single query
 */
export async function getBatchTimeEntries(
  employeeIds: string[],
  startDate: string,
  endDate: string
) {
  if (!employeeIds || employeeIds.length === 0) {
    return { success: true, data: [], message: 'No employee IDs provided' };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('time_entries')
    .select(`
      id,
      employee_id,
      order_id,
      shift_id,
      start_time,
      end_time,
      duration_minutes,
      break_minutes,
      type
    `)
    .in('employee_id', employeeIds)
    .gte('start_time', startDate)
    .lte('start_time', endDate)
    .order('start_time', { ascending: true });

  if (error) {
    return { success: false, data: null, message: error.message };
  }

  // Group by employee
  const byEmployee = new Map<string, any[]>();
  for (const entry of data || []) {
    const empId = entry.employee_id;
    if (!byEmployee.has(empId)) {
      byEmployee.set(empId, []);
    }
    byEmployee.get(empId)!.push(entry);
  }

  return { success: true, data: byEmployee, message: 'ok' };
}

/**
 * Get shifts for multiple employees in a single query
 */
export async function getBatchShifts(
  employeeIds: string[],
  startDate: string,
  endDate: string
) {
  if (!employeeIds || employeeIds.length === 0) {
    return { success: true, data: [], message: 'No employee IDs provided' };
  }

  const supabase = createAdminClient();

  // First get shifts in date range, then filter by employees
  const { data: shifts, error: shiftsError } = await supabase
    .from('shifts')
    .select(`
      id,
      shift_date,
      start_time,
      end_time,
      estimated_hours,
      status,
      assignment_id,
      order_id,
      shift_employees!inner (
        employee_id
      )
    `)
    .gte('shift_date', startDate)
    .lte('shift_date', endDate);

  if (shiftsError) {
    return { success: false, data: null, message: shiftsError.message };
  }

  // Filter by employee IDs
  const empSet = new Set(employeeIds);
  const filteredShifts = (shifts || []).filter(shift => 
    shift.shift_employees?.some((se: any) => empSet.has(se.employee_id))
  );

  // Group by employee
  const byEmployee = new Map<string, any[]>();
  for (const shift of filteredShifts) {
    for (const se of shift.shift_employees || []) {
      const empId = se.employee_id;
      if (!byEmployee.has(empId)) {
        byEmployee.set(empId, []);
      }
      byEmployee.get(empId)!.push(shift);
    }
  }

  return { success: true, data: byEmployee, message: 'ok' };
}

// ============================================================================
// INVALIDATE CACHE (for revalidation after mutations)
// ============================================================================

export function invalidatePlanningCache(): void {
  invalidateCache('shifts');
  invalidateCache('orders');
  revalidatePath('/dashboard/planning');
}

export function invalidateOrdersCache(): void {
  invalidateCache('orders');
  revalidatePath('/dashboard/orders');
}

export function invalidateTimeEntriesCache(): void {
  revalidatePath('/dashboard/time-tracking');
}
