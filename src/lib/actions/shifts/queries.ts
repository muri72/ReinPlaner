"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  startOfWeek,
  eachDayOfInterval,
  formatISO,
  parseISO,
  getDay,
  differenceInDays,
  isPast,
  isToday,
  startOfDay,
  isBefore,
  isAfter,
  getWeek,
} from "date-fns";
import { de } from "date-fns/locale";
import type {
  ShiftPlanningData,
  ShiftPlanningPageData,
  PlanningFilters,
  UnassignedShift,
  dayNames,
} from "./types";

// Re-export types for convenience
export type { ShiftEmployee, ShiftAssignment, EmployeeShiftData, ShiftPlanningData, UnassignedShift, ShiftPlanningPageData, PlanningFilters, CreateShiftParams, CreateShiftWithScheduleParams, ShiftSeriesEditMode, SeriesDeleteMode, AssignmentEditMode } from "./types";

// ============================================================================
// GET SHIFT PLANNING DATA (with real shifts from DB)
// ============================================================================

export async function getShiftPlanningData(
  startDate: Date,
  endDate: Date,
  filters: { query?: string; filters?: PlanningFilters }
): Promise<{
  success: boolean;
  data: ShiftPlanningPageData | null;
  message: string;
}> {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, data: null, message: "Benutzer nicht authentifiziert." };
  }

  const weekNumber = getWeek(startDate, { weekStartsOn: 1, locale: de });
  const weekDays = eachDayOfInterval({ start: startDate, end: endDate });
  const startDateIso = formatISO(startDate, { representation: "date" });
  const endDateIso = formatISO(endDate, { representation: "date" });

  try {
    // NOTE: Auto-generation of shifts disabled to prevent duplicate creation
    // Shifts are now created manually via shift edit dialog or drag-and-drop assignment

    // 1. Fetch all active employees
    let employeesQuery = supabase
      .from("employees")
      .select("*, user_id")
      .eq("status", "active");

    if (filters.query) {
      // Sanitize input to prevent SQL injection
      const sanitizedQuery = sanitizeInput(filters.query, 100);
      if (sanitizedQuery) {
        employeesQuery = employeesQuery.or(
          `first_name.ilike.%${sanitizedQuery}%,last_name.ilike.%${sanitizedQuery}%`
        );
      }
    }

    // Filter by employee groups
    if (filters.filters?.employeeGroups && filters.filters.employeeGroups.length > 0) {
      employeesQuery = employeesQuery.in("group_id", filters.filters.employeeGroups);
    }

    const { data: employees, error: employeesError } = await employeesQuery;
    if (employeesError) throw employeesError;

    // PERFORMANCE OPTIMIZATION: Parallelize all independent queries
    // Get user IDs for profiles query (depends on employees result)
    const userIds = employees
      .map((e) => e.user_id)
      .filter((id): id is string => id !== null);

    // Build assignments query with filters (must be built before Promise.all)
    let assignmentsQuery = supabase
      .from("order_employee_assignments")
      .select(`
        *,
        orders!inner (
          id,
          title,
          priority,
          object_id,
          service_type,
          total_estimated_hours,
          objects (
            id,
            name,
            address
          )
        ),
        employees!inner (
          id,
          first_name,
          last_name,
          user_id,
          default_daily_schedules,
          default_recurrence_interval_weeks,
          default_start_week_offset
        )
      `)
      .eq("orders.request_status", "approved")
      .neq("orders.status", "completed")
      .neq("orders.status", "cancelled");

    if (filters.filters?.objects && filters.filters.objects.length > 0) {
      assignmentsQuery = assignmentsQuery.in("orders.object_id", filters.filters.objects);
    }
    if (filters.filters?.services && filters.filters.services.length > 0) {
      assignmentsQuery = assignmentsQuery.in("orders.service_type", filters.filters.services);
    }

    // Execute all independent queries in parallel (5 queries → 1 parallel batch)
    const [
      profilesResult,
      servicesResult,
      absencesResult,
      shiftsResult,
      assignmentsResult
    ] = await Promise.all([
      // Profiles for avatars
      supabase.from("profiles").select("id, avatar_url").in("id", userIds),
      // Services for colors and filtering (include id for filter matching)
      supabase.from("services").select("id, key, title, color"),
      // Absences for the period
      supabase
        .from("absence_requests")
        .select("employee_id, start_date, end_date, type")
        .eq("status", "approved")
        .lte("start_date", endDateIso)
        .gte("end_date", startDateIso),
      // Existing shifts from DB for this period
      supabase
        .from("shifts")
        .select(`
          *,
          shift_employees (
            employee_id,
            role,
            is_confirmed
          )
        `)
        .gte("shift_date", startDateIso)
        .lte("shift_date", endDateIso),
      // Assignments for the period
      assignmentsQuery,
    ]);

    // Process results
    const profilesMap = new Map(profilesResult.data?.map((p) => [p.id, p.avatar_url]) || []);
    if (profilesResult.error) console.warn("Profiles query error:", profilesResult.error);

    // Create service mappings for color lookup and filtering
    const servicesMap = new Map(
      (servicesResult.data || []).map((s: any) => [s.key, s.color])
    );
    const servicesByTitle = new Map(
      (servicesResult.data || []).map((s: any) => [s.title?.toLowerCase(), s.color])
    );
    // NEW: Create service ID → key/title mapping for filter matching
    // The filter uses service IDs, but orders store service_type as key/title string
    const servicesById = new Map(
      (servicesResult.data || []).map((s: any) => [s.id, { key: s.key, title: s.title }])
    );
    // Create inverse lookup: key/title → service ID
    const serviceKeyToId = new Map(
      (servicesResult.data || []).flatMap((s: any) => [
        [s.key, s.id],
        [s.title?.toLowerCase(), s.id],
      ])
    );

    const absences = absencesResult.data;
    if (absencesResult.error) console.warn("Absences query error:", absencesResult.error);

    const existingShifts = shiftsResult.data;
    if (shiftsResult.error && !shiftsResult.error.message.includes("FetchError")) {
      console.warn("Shifts query error:", shiftsResult.error);
    }

    const { data: assignmentsData, error: assignmentsError } = assignmentsResult;
    if (assignmentsError) throw assignmentsError;

    // PERFORMANCE OPTIMIZATION: Create a Map of assignments for O(1) lookups
    const assignmentsMap = new Map(
      (assignmentsData || []).map((a: any) => [a.id, a])
    );

    // OPTIMIZATION: Check if we need additional assignments (for completed shifts with removed assignments)
    // Only fetch if there are shifts with assignment_id not in our assignments data
    let assignments = assignmentsData;
    if (existingShifts && existingShifts.length > 0) {
      const shiftAssignmentIds = new Set(
        existingShifts.map((s: any) => s.assignment_id).filter(Boolean)
      );

      // Check if any shift assignment IDs are not in our assignments map
      const missingAssignmentIds = [...shiftAssignmentIds].filter(id => !assignmentsMap.has(id));

      if (missingAssignmentIds.length > 0) {
        const { data: additionalAssignments, error: additionalError } = await supabaseAdmin
          .from("order_employee_assignments")
          .select(`
            id,
            orders!inner (
              id, title, priority, object_id, service_type, total_estimated_hours,
              objects (id, name, address)
            ),
            employees (id, first_name, last_name, user_id, default_daily_schedules, default_recurrence_interval_weeks, default_start_week_offset)
          `)
          .in("id", missingAssignmentIds);

        if (!additionalError && additionalAssignments && additionalAssignments.length > 0) {
          // Merge additional assignments and update map
          const newAssignments = additionalAssignments.filter((a: any) => !assignmentsMap.has(a.id));
          assignments = [...assignments, ...newAssignments];
          // Update map with new assignments
          for (const a of newAssignments) {
            assignmentsMap.set(a.id, a);
          }
        }
      }
    }

    // PERFORMANCE OPTIMIZATION: Create a Map of employees for O(1) lookups
    const employeesMap = new Map(
      (employees || []).map((e: any) => [e.id, e])
    );

    // 5. PRE-BUILD TEAM MEMBERS LOOKUP MAP (Performance Optimization)
    // Instead of O(n²) nested loops, build a lookup map once
    const teamMembersByOrderDate: {
      [orderId: string]: {
        [date: string]: {
          employeeId: string;
          employeeName: string;
        }[];
      };
    } = {};

    // Collect all shifts to build the lookup map efficiently
    for (const shift of (existingShifts || [])) {
      if (!shift?.shift_date || !shift?.assignment_id) continue;

      // O(1) lookup instead of O(n) find
      const assignment = assignmentsMap.get(shift.assignment_id);
      if (!assignment) continue;

      const orderId = assignment.order_id;
      if (!orderId) continue;

      const dateKey = shift.shift_date;
      const shiftEmployees = shift.shift_employees || [];

      if (!teamMembersByOrderDate[orderId]) {
        teamMembersByOrderDate[orderId] = {};
      }
      if (!teamMembersByOrderDate[orderId][dateKey]) {
        teamMembersByOrderDate[orderId][dateKey] = [];
      }

      // Add each employee to the team member list for this order/date
      for (const se of shiftEmployees) {
        // O(1) lookup instead of O(n) find
        const empData = employeesMap.get(se.employee_id);
        if (empData) {
          teamMembersByOrderDate[orderId][dateKey].push({
            employeeId: se.employee_id,
            employeeName: `${empData.first_name} ${empData.last_name}`,
          });
        }
      }
    }

    // Remove duplicates from team member lists
    for (const oid of Object.keys(teamMembersByOrderDate)) {
      for (const dk of Object.keys(teamMembersByOrderDate[oid])) {
        const seen = new Set<string>();
        teamMembersByOrderDate[oid][dk] = teamMembersByOrderDate[oid][dk].filter(m => {
          if (seen.has(m.employeeId)) return false;
          seen.add(m.employeeId);
          return true;
        });
      }
    }

    // 6. Build a map of existing shifts by order_id and date for fast lookup
    // This groups all shifts for the same order on the same date together
    const existingShiftsByOrderDateMap = new Map<string, any[]>();
    for (const shift of (existingShifts || [])) {
      if (!shift?.shift_date) continue;

      // Get order_id - first from direct order_id, then from assignment
      let orderId: string | null = null;
      if (shift?.order_id) {
        // Direct shift with order_id
        orderId = shift.order_id;
      } else if (shift?.assignment_id) {
        // Shift from assignment - O(1) lookup
        const shiftAssignment = assignmentsMap.get(shift.assignment_id);
        orderId = shiftAssignment?.orders?.id || null;
      }

      if (orderId) {
        const key = `${orderId}_${shift.shift_date}`;
        if (!existingShiftsByOrderDateMap.has(key)) {
          existingShiftsByOrderDateMap.set(key, []);
        }
        existingShiftsByOrderDateMap.get(key)!.push(shift);
      }
    }

    // 6. Build planning data structure
    // Only use EXISTING shifts from the database - no automatic creation
    const planningData: ShiftPlanningData = {};
    const employeeDateShifts: {
      [employeeId: string]: {
        [date: string]: {
          shiftId: string;
          orderId: string;
          orderTitle: string;
          objectId: string | null;
          objectName: string;
          objectAddress: string | null;
          serviceType: string;
          startTime: string | null;
          endTime: string | null;
          hours: number;
          travelTimeMinutes: number | null;
          breakTimeMinutes: number | null;
          assignmentId: string;
        }[];
      };
    } = {};

    // Collect all direct order_ids from shifts with assignment_id: null
    const directOrderIds = new Set<string>();
    for (const shifts of existingShiftsByOrderDateMap.values()) {
      for (const shift of shifts) {
        if (!shift?.assignment_id && shift?.order_id) {
          directOrderIds.add(shift.order_id);
        }
      }
    }

    // Fetch all direct orders at once for efficiency
    const directOrdersMap = new Map<string, any>();
    if (directOrderIds.size > 0) {
      const { data: directOrders } = await supabaseAdmin
        .from("orders")
        .select("id, title, service_type, object_id, objects(id, name, address)")
        .in("id", Array.from(directOrderIds));
      for (const order of (directOrders || [])) {
        directOrdersMap.set(order.id, order);
      }
    }

    // Re-build employeeDateShifts with all shifts (existing + newly created)
    // IMPORTANT: Use shift_employees to get the CURRENT employee assignment, not the assignment's original employee
    for (const shifts of existingShiftsByOrderDateMap.values()) {
      for (const shift of shifts) {
        // Get order and assignment info - handle both assignment-based and direct shifts
        let assignment: any = null;
        let order: any = null;

        if (shift?.assignment_id) {
          // O(1) lookup instead of O(n) find
          assignment = assignmentsMap.get(shift.assignment_id);
          order = assignment?.orders;
        }

        // For direct shifts (assignment_id: null), use pre-fetched orders map
        if (!order && shift?.order_id) {
          order = directOrdersMap.get(shift.order_id);
        }

        if (!order) continue;

        // Get the employees from shift_employees table (this reflects actual assignments after moves)
        // IMPORTANT: Handle MULTIPLE employees per shift - each employee should see the shift
        let shiftEmployees = shift.shift_employees || [];

        // SPECIAL CASE: For completed shifts with no shift_employees (employee was removed),
        // still show the shift using the original assignment's employee_id
        if (shiftEmployees.length === 0 && shift.status === 'completed' && assignment?.employee_id) {
          shiftEmployees = [{ employee_id: assignment.employee_id, role: 'worker', is_confirmed: false }];
        }

        if (shiftEmployees.length === 0) {
          continue;
        }

        // Add this shift to EACH employee's calendar
        for (const shiftEmployee of shiftEmployees) {
          const currentEmployeeId = shiftEmployee.employee_id;

          if (!employeeDateShifts[currentEmployeeId]) {
            employeeDateShifts[currentEmployeeId] = {};
          }
          if (!employeeDateShifts[currentEmployeeId][shift.shift_date]) {
            employeeDateShifts[currentEmployeeId][shift.shift_date] = [];
          }
          employeeDateShifts[currentEmployeeId][shift.shift_date].push({
            shiftId: shift.id,
            orderId: order.id,
            orderTitle: order.title || "Unbekannt",
            objectId: (order as any).object_id || (order as any).objects?.id || null,
            objectName: (order as any).objects?.name || null,
            objectAddress: (order as any).objects?.address || null,
            serviceType: order.service_type || null,
            startTime: shift.start_time,
            endTime: shift.end_time,
            hours: Number(shift.estimated_hours) || 0,
            travelTimeMinutes: shift.travel_time_minutes ?? null,
            breakTimeMinutes: shift.break_time_minutes ?? null,
            assignmentId: shift.assignment_id,
          });
        }
      }
    }

    // Pre-process absences into a Map for O(1) lookups
    // Structure: Map<employee_id, Array<{start: Date, end: Date, type: string}>>
    const absenceMap = new Map<string, Array<{ start: Date; end: Date; type: string }>>();
    absences?.forEach((absence) => {
      const employeeAbsences = absenceMap.get(absence.employee_id) || [];
      employeeAbsences.push({
        start: parseISO(absence.start_date),
        end: parseISO(absence.end_date),
        type: absence.type,
      });
      absenceMap.set(absence.employee_id, employeeAbsences);
    });

    // 5. Build the final planning data structure
    for (const employee of employees) {
      let totalHoursAvailable = 0;
      let totalHoursPlanned = 0;

      const employeeSchedule: { [date: string]: any } = {};

      for (const day of weekDays) {
        const dateString = formatISO(day, { representation: "date" });
        const dayOfWeek = getDay(day);
        const dayKey = (["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const)[dayOfWeek];

        employeeSchedule[dateString] = {
          isAvailable: false,
          totalHours: 0,
          availableHours: 0,
          isAbsence: false,
          absenceType: null,
          shifts: [],
        };

        // Check for absence using pre-processed map (O(1) lookup)
        const employeeAbsences = absenceMap.get(employee.id);
        const absence = employeeAbsences?.find(
          (a) => a.start <= day && a.end >= day
        );

        if (absence) {
          employeeSchedule[dateString].isAbsence = true;
          employeeSchedule[dateString].absenceType = absence.type;
          // Don't continue - still process shifts so they show as "open" for substitution
        }

        // Calculate available hours from default schedule
        const defaultRecurrenceInterval =
          employee.default_recurrence_interval_weeks || 1;
        const defaultStartOffset = employee.default_start_week_offset || 0;
        const daysPassedDefault = differenceInDays(
          day,
          startOfWeek(new Date(), { weekStartsOn: 1 })
        );
        const weeksPassedDefault = Math.floor(daysPassedDefault / 7);
        const effectiveWeekIndexDefault =
          (weeksPassedDefault + defaultStartOffset) % defaultRecurrenceInterval;

        const defaultWeekSchedule =
          employee.default_daily_schedules?.[effectiveWeekIndexDefault];
        const defaultDaySchedule = (defaultWeekSchedule as any)?.[dayKey];
        const defaultHours = Number(defaultDaySchedule?.hours ?? 0);

        employeeSchedule[dateString].availableHours = defaultHours;

        if (defaultHours > 0) {
          employeeSchedule[dateString].isAvailable = true;
          totalHoursAvailable += defaultHours;
        }

        // Get shifts from order_employee_assignments
        const shiftsForDay = employeeDateShifts[employee.id]?.[dateString] || [];

        // Group shifts by assignment_id to detect team shifts
        const shiftsByAssignment: { [key: string]: typeof shiftsForDay } = {};
        for (const shiftData of shiftsForDay) {
          if (!shiftsByAssignment[shiftData.assignmentId]) {
            shiftsByAssignment[shiftData.assignmentId] = [];
          }
          shiftsByAssignment[shiftData.assignmentId].push(shiftData);
        }

        // Detect multi-shifts: check if multiple shift IDs exist for same order/date
        // This indicates employees have separate shifts with potentially different times
        const shiftIdsByOrderDate: { [key: string]: Set<string> } = {};
        for (const shiftData of shiftsForDay) {
          const key = `${shiftData.orderId}_${dateString}`;
          if (!shiftIdsByOrderDate[key]) {
            shiftIdsByOrderDate[key] = new Set();
          }
          shiftIdsByOrderDate[key].add(shiftData.shiftId);
        }

        // OPTIMIZED: Use pre-built teamMembersByOrderDate lookup map instead of O(n²) loop
        // Get team members from lookup map
        const teamMembersForDay: {
          [orderId: string]: {
            employeeId: string;
            employeeName: string;
          }[];
        } = {};

        for (const [orderId, dateMap] of Object.entries(teamMembersByOrderDate)) {
          if (dateMap[dateString]) {
            teamMembersForDay[orderId] = dateMap[dateString];
          }
        }

        for (const shiftData of shiftsForDay) {
          const hours = shiftData.hours;
          totalHoursPlanned += hours;
          employeeSchedule[dateString].totalHours += hours;

          // Check if this is a recurring assignment (has daily schedules defined)
          // O(1) lookup instead of O(n) find
          const assignment = shiftData.assignmentId ? assignmentsMap.get(shiftData.assignmentId) : null;
          const isRecurring = !!(
            assignment &&
            assignment.assigned_daily_schedules &&
            Array.isArray(assignment.assigned_daily_schedules) &&
            assignment.assigned_daily_schedules.length > 0
          );

          // Check if this is a team shift vs multi-shift
          // - Team shift: Multiple employees work SAME shift (one shift ID)
          // - Multi-shift: Multiple employees work DIFFERENT shifts (multiple shift IDs)
          const currentOrderId = assignment?.order_id;
          const teamMembersForThisOrder = teamMembersForDay[currentOrderId] || [];
          const orderDateKey = `${shiftData.orderId}_${dateString}`;
          const uniqueShiftIds = shiftIdsByOrderDate[orderDateKey];
          const hasMultipleShifts = uniqueShiftIds && uniqueShiftIds.size > 1;

          // is_team: Same shift with multiple employees (not multi-shift)
          // is_multi_shift: Different shifts for same order/date (employees have separate shifts)
          const isTeam = teamMembersForThisOrder.length > 1 && !hasMultipleShifts;
          const isMultiShift = hasMultipleShifts;

          // Determine status based on date AND time:
          // - Past dates → "completed" (green)
          // - Today and current time within shift time → "in_progress" (yellow)
          // - Today before start time, after end time, or no time → "scheduled" (blue)
          // - Future dates → "scheduled" (blue)
          const shiftDateObj = parseISO(dateString);
          const now = new Date();
          const today = startOfDay(now);

          let shiftStatus: "scheduled" | "in_progress" | "completed" = "scheduled";

          // IMPORTANT: Check isToday() FIRST because isPast() returns true for today after midnight
          // (shiftDateObj is at 00:00:00, so isPast would incorrectly mark today's shifts as completed)
          if (isToday(shiftDateObj)) {
            // Date is today - check the actual time
            if (shiftData.startTime && shiftData.endTime) {
              const [startHour, startMin] = shiftData.startTime.split(":").map(Number);
              const [endHour, endMin] = shiftData.endTime.split(":").map(Number);

              // Create clean time objects WITHOUT seconds/milliseconds for accurate comparison
              const nowTime = new Date(now);
              nowTime.setSeconds(0, 0); // Remove seconds and milliseconds from now

              const shiftStart = new Date(now);
              shiftStart.setHours(startHour, startMin, 0, 0);

              const shiftEnd = new Date(now);
              shiftEnd.setHours(endHour, endMin, 0, 0);

              if (isBefore(nowTime, shiftStart)) {
                // Before shift starts
                shiftStatus = "scheduled";
              } else if (isAfter(nowTime, shiftEnd)) {
                // After shift ends
                shiftStatus = "completed";
              } else {
                // During shift
                shiftStatus = "in_progress";
              }
            } else {
              // No time specified → treat as scheduled (not in_progress)
              shiftStatus = "scheduled";
            }
          } else if (isPast(shiftDateObj)) {
            // Date is in the past (NOT today)
            shiftStatus = "completed";
          }
          // Future dates remain "scheduled"

          // Apply shiftStatus filter if specified
          if (filters.filters?.shiftStatus && filters.filters.shiftStatus !== 'all' && shiftStatus !== filters.filters.shiftStatus) {
            continue; // Skip this shift if it doesn't match the status filter
          }

          // Apply objects filter if specified
          if (filters.filters?.objects && filters.filters.objects.length > 0) {
            // shiftData.objectId contains the object ID from the order
            const objectMatches = shiftData.objectId && filters.filters.objects.includes(shiftData.objectId);
            if (!objectMatches) {
              continue; // Skip this shift if it doesn't match the objects filter
            }
          }

          // Apply services filter if specified
          if (filters.filters?.services && filters.filters.services.length > 0) {
            // The filter uses service IDs, but shiftData.serviceType is a string (key/title)
            // Use the serviceKeyToId mapping to check if this shift's service matches any filtered service
            const serviceTypeLower = shiftData.serviceType?.toLowerCase() || '';
            const serviceIdForShift = serviceKeyToId.get(serviceTypeLower);
            const serviceMatches = serviceIdForShift && filters.filters.services.includes(serviceIdForShift);
            if (!serviceMatches) {
              continue; // Skip this shift if it doesn't match the services filter
            }
          }

          employeeSchedule[dateString].shifts.push({
            id: shiftData.shiftId,
            shift_date: dateString,
            start_time: shiftData.startTime,
            end_time: shiftData.endTime,
            estimated_hours: hours,
            travel_time_minutes: Number(shiftData.travelTimeMinutes) || null,
            break_time_minutes: Number(shiftData.breakTimeMinutes) || null,
            status: shiftStatus,
            is_detached_from_series: false,

            job_id: shiftData.orderTitle,
            job_title: shiftData.orderTitle,
            priority: "medium",

            object_id: null,
            object_name: shiftData.objectName,
            object_address: shiftData.objectAddress,

            service_id: null,
            service_title: shiftData.serviceType,
            // Get service color from services table (match by key or title)
            service_color: (servicesMap.get(shiftData.serviceType || '') ||
              servicesByTitle.get(shiftData.serviceType?.toLowerCase() || '') ||
              "#6b7280"),

            series_id: isRecurring ? shiftData.assignmentId : null,
            is_recurring: isRecurring,

            order_id: shiftData.orderId,

            // Use all team members for team shifts, otherwise just the current employee
            // For multi-shifts, also just show the current employee (each has their own shift)
            employees: (isTeam && !isMultiShift) ? teamMembersForThisOrder.map((member) => ({
              employee_id: member.employeeId,
              employee_name: member.employeeName,
              role: "worker" as const,
              is_confirmed: false,
            })) : [{
              employee_id: employee.id,
              employee_name: `${employee.first_name} ${employee.last_name}`,
              role: "worker" as const,
              is_confirmed: false,
            }],
            is_team: isTeam,
            is_multi_shift: isMultiShift,

            assignment_id: shiftData.assignmentId,
          });
        }
      }

      planningData[employee.id] = {
        name: `${employee.first_name} ${employee.last_name}`,
        avatar_url: employee.user_id ? profilesMap.get(employee.user_id) || null : null,
        job_title: employee.job_title,
        totalHoursAvailable,
        totalHoursPlanned,
        raw: employee,
        schedule: employeeSchedule,
      };
    }

    // 6. Build unassigned shifts from assignments without employee
    // For now, we'll show assignments that exist but aren't yet assigned to specific employees
    // This requires looking at orders without employee assignments
    const { data: unassignedData } = await supabase
      .from("order_employee_assignments")
      .select(`
        id,
        orders (
          id,
          title,
          object_id,
          service_type,
          priority,
          objects (
            name
          )
        )
      `)
      .eq("status", "active")
      .is("employee_id", null);

    const unassignedShifts: UnassignedShift[] = (unassignedData || []).map((ua: any) => ({
      id: ua.id,
      shift_date: startDateIso, // Default to start date
      start_time: null,
      end_time: null,
      job_title: ua.orders?.title || "Unbekannt",
      object_name: (ua.orders as any)?.objects?.name || null,
      service_title: ua.orders?.service_type || null,
      service_color: null,
      estimated_hours: null,
      assignment_id: ua.id,
    }));

    const pageData: ShiftPlanningPageData = {
      planningData,
      unassignedShifts,
      weekNumber,
    };

    // Always revalidate to ensure fresh data after mutations
    revalidatePath("/dashboard/planning");

    return { success: true, data: pageData, message: "Plandaten erfolgreich geladen." };
  } catch (error: any) {
    console.error("Fehler beim Laden der Shift-Plandaten:", error?.message || error);
    return { success: false, data: null, message: error.message };
  }
}

// ============================================================================
// GET EMPLOYEES WITH SERVICE EXPERIENCE
// ============================================================================

export async function getEmployeesWithExperience(
  serviceId: string,
  minLevel: "beginner" | "intermediate" | "expert" = "beginner"
): Promise<{
  success: boolean;
  data: {
    employee_id: string;
    employee_name: string;
    experience_level: string;
    total_shifts: number;
  }[];
}> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("get_employees_with_service_experience", {
      p_service_id: serviceId,
      p_min_experience_level: minLevel,
    });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error("Fehler:", error.message);
    return { success: false, data: [] };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Sanitize user input to prevent SQL injection.
 * Used for search queries and filter values.
 */
function sanitizeInput(input: string, maxLength: number = 100): string {
  if (!input || typeof input !== 'string') return '';
  // Remove potentially dangerous characters for ilike queries
  return input
    .slice(0, maxLength)
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim();
}