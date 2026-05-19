/**
 * Optimized Server Actions with Caching
 * Uses stale-while-revalidate pattern for better performance
 * Supports batch operations for multiple employees
 * Migrated from Supabase to Drizzle+NextAuth
 */

"use server";

import { auth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { desc, eq, and, gte, lte, inArray } from "drizzle-orm";
import { shifts, shiftsExtended, shiftEmployees, employees, orders, orderEmployeeAssignments, timeEntries } from "@/lib/db/schema";

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
  const cacheKey = createActionCacheKey('shifts', { startDate, endDate });

  try {
    // Get shiftsExtended entries for the date range
    const shiftsData = await db
      .select({
        id: shiftsExtended.id,
        shiftDate: shiftsExtended.shiftDate,
        startTime: shiftsExtended.startTime,
        endTime: shiftsExtended.endTime,
        estimatedHours: shiftsExtended.estimatedHours,
        shiftId: shiftsExtended.shiftId,
        assignmentId: shiftsExtended.assignmentId,
        orderId: shiftsExtended.orderId,
        isManual: shiftsExtended.isManual,
        // Shift data
        shiftStatus: shifts.status,
        shiftScheduledStart: shifts.scheduledStart,
        shiftScheduledEnd: shifts.scheduledEnd,
        shiftActualStart: shifts.actualStart,
        shiftActualEnd: shifts.actualEnd,
        shiftTenantId: shifts.tenantId,
      })
      .from(shiftsExtended)
      .leftJoin(shifts, eq(shiftsExtended.shiftId, shifts.id))
      .where(
        and(
          gte(shiftsExtended.shiftDate, startDate),
          lte(shiftsExtended.shiftDate, endDate)
        )
      )
      .orderBy(shiftsExtended.shiftDate);

    // Get shift employees with employee data
    const shiftIds = shiftsData.map(s => s.shiftId).filter(Boolean);
    let shiftEmployeesData: any[] = [];

    if (shiftIds.length > 0) {
      shiftEmployeesData = await db
        .select({
          shiftId: shiftEmployees.shiftId,
          employeeId: shiftEmployees.employeeId,
          role: shiftEmployees.role,
          isConfirmed: shiftEmployees.isConfirmed,
          employeeFirstName: employees.firstName,
          employeeLastName: employees.lastName,
        })
        .from(shiftEmployees)
        .leftJoin(employees, eq(shiftEmployees.employeeId, employees.id))
        .where(inArray(shiftEmployees.shiftId, shiftIds));
    }

    // Group shift employees by shiftId
    const employeesByShift = new Map<string, any[]>();
    for (const se of shiftEmployeesData) {
      if (!employeesByShift.has(se.shiftId)) {
        employeesByShift.set(se.shiftId, []);
      }
      employeesByShift.get(se.shiftId)!.push({
        employee_id: se.employeeId,
        role: se.role,
        is_confirmed: se.isConfirmed,
        employees: {
          first_name: se.employeeFirstName,
          last_name: se.employeeLastName,
        },
      });
    }

    // Combine data with same structure as original Supabase query
    const data = shiftsData.map(shift => ({
      id: shift.id,
      shift_date: shift.shiftDate,
      start_time: shift.startTime,
      end_time: shift.endTime,
      estimated_hours: shift.estimatedHours,
      status: shift.shiftStatus,
      assignment_id: shift.assignmentId,
      order_id: shift.orderId,
      shift_employees: employeesByShift.get(shift.shiftId) || [],
    }));

    const result = { success: true, data, message: 'ok' };
    setCached(cacheKey, result);
    return result;
  } catch (error: any) {
    console.error('Error fetching shifts:', error);
    return { success: false, data: null, message: error.message };
  }
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
  const cacheKey = createActionCacheKey('orders', filters);

  try {
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(orders.status, filters.status as any));
    }
    if (filters.customerId) {
      conditions.push(eq(orders.customerId, filters.customerId));
    }

    const ordersData = await db
      .select({
        id: orders.id,
        title: orders.serviceType,
        status: orders.status,
        startDate: orders.startDate,
        endDate: orders.scheduledEnd,
        priority: orders.actualEnd,
        customerId: orders.customerId,
        objectId: orders.objectId,
        orderType: orders.orderType,
        tenantId: orders.tenantId,
      })
      .from(orders)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(200);

    const result = { success: true, data: ordersData, message: 'ok' };
    setCached(cacheKey, result);
    return result;
  } catch (error: any) {
    return { success: false, data: null, message: error.message };
  }
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

  try {
    const assignmentsData = await db
      .select({
        id: orderEmployeeAssignments.id,
        orderId: orderEmployeeAssignments.orderId,
        employeeId: orderEmployeeAssignments.employeeId,
        orderStatus: orders.status,
        orderTitle: orders.serviceType,
        customerId: orders.customerId,
        objectId: orders.objectId,
        tenantId: orders.tenantId,
      })
      .from(orderEmployeeAssignments)
      .leftJoin(orders, eq(orderEmployeeAssignments.orderId, orders.id))
      .where(
        and(
          inArray(orderEmployeeAssignments.employeeId, employeeIds),
          eq(orders.status, 'scheduled' as any)
        )
      );

    // Group by employee
    const byEmployee = new Map<string, any[]>();
    for (const assignment of assignmentsData) {
      const empId = assignment.employeeId;
      if (!byEmployee.has(empId)) {
        byEmployee.set(empId, []);
      }
      byEmployee.get(empId)!.push({
        id: assignment.id,
        order_id: assignment.orderId,
        employee_id: assignment.employeeId,
        orders: {
          id: assignment.orderId,
          title: assignment.orderTitle,
          status: assignment.orderStatus,
          customer_id: assignment.customerId,
          object_id: assignment.objectId,
        },
      });
    }

    return { success: true, data: byEmployee, message: 'ok' };
  } catch (error: any) {
    return { success: false, data: null, message: error.message };
  }
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

  try {
    const entriesData = await db
      .select({
        id: timeEntries.id,
        employeeId: timeEntries.employeeId,
        shiftId: timeEntries.shiftId,
        date: timeEntries.date,
        hoursWorked: timeEntries.hoursWorked,
        breakMinutes: timeEntries.breakMinutes,
      })
      .from(timeEntries)
      .where(
        and(
          inArray(timeEntries.employeeId, employeeIds),
          gte(timeEntries.date, new Date(startDate)),
          lte(timeEntries.date, new Date(endDate))
        )
      )
      .orderBy(timeEntries.date);

    // Group by employee
    const byEmployee = new Map<string, any[]>();
    for (const entry of entriesData) {
      const empId = entry.employeeId;
      if (!byEmployee.has(empId)) {
        byEmployee.set(empId, []);
      }
      byEmployee.get(empId)!.push({
        id: entry.id,
        employee_id: entry.employeeId,
        order_id: null,
        shift_id: entry.shiftId,
        start_time: entry.date,
        end_time: null,
        duration_minutes: entry.hoursWorked,
        break_minutes: entry.breakMinutes,
        type: 'standard',
      });
    }

    return { success: true, data: byEmployee, message: 'ok' };
  } catch (error: any) {
    return { success: false, data: null, message: error.message };
  }
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

  try {
    // Get shiftsExtended entries for date range
    const shiftsData = await db
      .select({
        id: shiftsExtended.id,
        shiftDate: shiftsExtended.shiftDate,
        startTime: shiftsExtended.startTime,
        endTime: shiftsExtended.endTime,
        estimatedHours: shiftsExtended.estimatedHours,
        status: shifts.status,
        assignmentId: shiftsExtended.assignmentId,
        orderId: shiftsExtended.orderId,
        shiftId: shiftsExtended.shiftId,
      })
      .from(shiftsExtended)
      .leftJoin(shifts, eq(shiftsExtended.shiftId, shifts.id))
      .where(
        and(
          gte(shiftsExtended.shiftDate, startDate),
          lte(shiftsExtended.shiftDate, endDate)
        )
      );

    // Get shift employees for these shifts
    const shiftIds = shiftsData.map(s => s.shiftId).filter(Boolean);
    let shiftEmployeesData: any[] = [];

    if (shiftIds.length > 0) {
      shiftEmployeesData = await db
        .select({
          shiftId: shiftEmployees.shiftId,
          employeeId: shiftEmployees.employeeId,
        })
        .from(shiftEmployees)
        .where(inArray(shiftEmployees.shiftId, shiftIds));
    }

    // Filter by employee IDs and group
    const empSet = new Set(employeeIds);
    const filteredShifts = shiftsData.filter(shift =>
      shiftEmployeesData.some(se => se.shiftId === shift.shiftId && empSet.has(se.employeeId))
    );

    // Group by employee
    const byEmployee = new Map<string, any[]>();
    for (const shift of filteredShifts) {
      const relevantEmployees = shiftEmployeesData.filter(
        se => se.shiftId === shift.shiftId && empSet.has(se.employeeId)
      );
      for (const se of relevantEmployees) {
        const empId = se.employeeId;
        if (!byEmployee.has(empId)) {
          byEmployee.set(empId, []);
        }
        byEmployee.get(empId)!.push({
          id: shift.id,
          shift_date: shift.shiftDate,
          start_time: shift.startTime,
          end_time: shift.endTime,
          estimated_hours: shift.estimatedHours,
          status: shift.status,
          assignment_id: shift.assignmentId,
          order_id: shift.orderId,
          shift_employees: [{ employee_id: empId }],
        });
      }
    }

    return { success: true, data: byEmployee, message: 'ok' };
  } catch (error: any) {
    return { success: false, data: null, message: error.message };
  }
}

// ============================================================================
// INVALIDATE CACHE (for revalidation after mutations)
// ============================================================================

export async function invalidatePlanningCache(): Promise<void> {
  invalidateCache('shifts');
  invalidateCache('orders');
  revalidatePath('/dashboard/planning');
}

export async function invalidateOrdersCache(): Promise<void> {
  invalidateCache('orders');
  revalidatePath('/dashboard/orders');
}

export async function invalidateTimeEntriesCache(): Promise<void> {
  revalidatePath('/dashboard/time-tracking');
}