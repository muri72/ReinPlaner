"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendNotification } from "@/lib/actions/notifications";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  formatISO,
  parseISO,
  getDay,
  differenceInDays,
  format,
  getWeek,
  isPast,
  isToday,
  startOfDay,
  isBefore,
  isAfter,
  addMinutes,
  subDays,
  addDays,
} from "date-fns";
import { de } from "date-fns/locale";

// ============================================================================
// TYPES
// ============================================================================

export interface ShiftEmployee {
  employee_id: string;
  employee_name: string;
  avatar_url?: string;
  role: "worker" | "team_lead" | "substitute";
  is_confirmed: boolean;
}

export interface ShiftAssignment {
  id: string;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  estimated_hours: number;
  travel_time_minutes: number | null;
  break_time_minutes: number | null;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  is_detached_from_series: boolean;

  // Job Info
  job_id: string;
  job_title: string;
  priority: string;

  // Object Info
  object_id: string | null;
  object_name: string | null;
  object_address: string | null;

  // Service Info
  service_id: string | null;
  service_title: string | null;
  service_color: string | null;

  // Series Info
  series_id: string | null;
  is_recurring: boolean;

  // Order reference for grouping team members
  order_id: string | null;

  // Employees
  employees: ShiftEmployee[];
  is_team: boolean;
  is_multi_shift: boolean;

  // Assignment reference (for order_employee_assignments)
  assignment_id: string | null;
}

export interface EmployeeShiftData {
  name: string;
  avatar_url: string | null;
  job_title: string | null;
  totalHoursAvailable: number;
  totalHoursPlanned: number;
  raw: any;
  schedule: {
    [date: string]: {
      isAvailable: boolean;
      totalHours: number;
      availableHours: number;
      isAbsence: boolean;
      absenceType: string | null;
      shifts: ShiftAssignment[];
    };
  };
}

export interface ShiftPlanningData {
  [employeeId: string]: EmployeeShiftData;
}

export interface UnassignedShift {
  id: string;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  job_title: string;
  object_name: string | null;
  service_title: string | null;
  service_color: string | null;
  estimated_hours: number | null;
  assignment_id?: string;
}

export interface ShiftPlanningPageData {
  planningData: ShiftPlanningData;
  unassignedShifts: UnassignedShift[];
  weekNumber: number;
}

const dayNames = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

// ============================================================================
// GET SHIFT PLANNING DATA (with real shifts from DB)
// ============================================================================

export interface PlanningFilters {
  query?: string;
  employeeGroups?: string[];
  objects?: string[];
  services?: string[];
  experienceLevel?: string;
  showAvailableOnly?: boolean;
  shiftStatus?: string;
}

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
      employeesQuery = employeesQuery.or(
        `first_name.ilike.%${filters.query}%,last_name.ilike.%${filters.query}%`
      );
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

    // DEBUG: Log existing shifts count
    // let existingShiftCount = 0;
    // for (const shifts of existingShiftsByOrderDateMap.values()) {
    //   existingShiftCount += shifts.length;
    // }
    // console.log(`[DEBUG] Total existing shifts in map: ${existingShiftCount}`);
    // console.log(`[DEBUG] Existing shifts by order/date:`, Object.fromEntries(
    //   Array.from(existingShiftsByOrderDateMap.entries()).map(([k, v]) => [k, v.length])
    // ));

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

      const employeeSchedule: EmployeeShiftData["schedule"] = {};

      for (const day of weekDays) {
        const dateString = formatISO(day, { representation: "date" });
        const dayOfWeek = getDay(day);
        const dayKey = dayNames[dayOfWeek];

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

        // DEBUG: Log shift detection info
        // console.log(`[DEBUG] ${employee.first_name} ${employee.last_name} - ${dateString} - shiftsForDay:`, shiftsForDay.map(s => ({
        //   orderId: s.orderId,
        //   shiftId: s.shiftId?.slice(0, 8),
        //   startTime: s.startTime,
        //   endTime: s.endTime,
        //   hours: s.hours,
        //   orderTitle: s.orderTitle
        // })));
        // console.log(`[DEBUG] ${dateString} - shiftIdsByOrderDate:`, Object.entries(shiftIdsByOrderDate).map(([k, v]) => ({ key: k, count: v.size, ids: Array.from(v).map((id: any) => id?.slice(0, 8)) })));

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

          // DEBUG: Log detection result
          // console.log(`[DEBUG] ${dateString} - Shift ${shiftData.shiftId?.slice(0, 8)}:`, {
          //   orderId: shiftData.orderId,
          //   orderTitle: shiftData.orderTitle,
          //   teamMembersCount: teamMembersForThisOrder.length,
          //   uniqueShiftIdsCount: uniqueShiftIds?.size || 0,
          //   hasMultipleShifts,
          //   isTeam,
          //   isMultiShift,
          //   shiftId: shiftData.shiftId
          // });

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

          // DEBUG: Log final shift card data
          // if (isMultiShift) {
          //   console.log(`[DEBUG] ${dateString} - MULTI-SHIFT created:`, {
          //     shiftId: shiftData.shiftId,
          //     orderTitle: shiftData.orderTitle,
          //     startTime: shiftData.startTime,
          //     endTime: shiftData.endTime,
          //     hours: shiftData.hours,
          //     is_team: isTeam,
          //     is_multi_shift: isMultiShift,
          //     employee: `${employee.first_name} ${employee.last_name}`
          //   });
          // }
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
// ASSIGN EMPLOYEE TO SHIFT
// ============================================================================

export async function assignEmployeeToShift(
  shiftId: string,
  employeeId: string,
  role: "worker" | "team_lead" | "substitute" = "worker"
): Promise<{ success: boolean; message: string }> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  try {
    // Check if already assigned
    const { data: existing } = await supabaseAdmin
      .from("shift_employees")
      .select("id")
      .eq("shift_id", shiftId)
      .eq("employee_id", employeeId)
      .single();

    if (existing) {
      return { success: false, message: "Mitarbeiter ist bereits zugewiesen." };
    }

    // Create assignment
    const { error: assignError } = await supabaseAdmin
      .from("shift_employees")
      .insert({
        shift_id: shiftId,
        employee_id: employeeId,
        role,
      });

    if (assignError) throw assignError;

    // Send notification
    const { data: shift } = await supabaseAdmin
      .from("shifts")
      .select("shift_date, jobs ( title )")
      .eq("id", shiftId)
      .single();

    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("user_id")
      .eq("id", employeeId)
      .single();

    if (employee?.user_id && shift) {
      await sendNotification({
        userId: employee.user_id,
        title: "Neuer Einsatz zugewiesen",
        message: `Sie wurden dem Einsatz "${(shift.jobs as any)?.title}" am ${shift.shift_date} zugewiesen.`,
        link: "/dashboard/planning",
      });
    }

    revalidatePath("/dashboard/planning");
    return { success: true, message: "Mitarbeiter erfolgreich zugewiesen." };
  } catch (error: any) {
    console.error("Fehler bei der Zuweisung:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// ============================================================================
// REASSIGN SHIFT (with series handling)
// ============================================================================

export type ShiftSeriesEditMode = "single" | "future" | "all";

export async function reassignShift(
  shiftId: string,
  newEmployeeId: string,
  mode: ShiftSeriesEditMode = "single"
): Promise<{ success: boolean; message: string; affectedCount?: number }> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  console.log("[REASSIGN-SHIFT] Starting reassignment:", { shiftId, newEmployeeId, mode });

  try {
    // Get shift details including assignment_id
    const { data: shift, error: shiftError } = await supabaseAdmin
      .from("shifts")
      .select("*, shift_employees ( employee_id ), assignment_id")
      .eq("id", shiftId)
      .single();

    if (shiftError || !shift) {
      throw new Error("Shift nicht gefunden.");
    }

    const oldEmployeeId = shift.shift_employees?.[0]?.employee_id;
    const isRecurring = !!shift.series_id && !shift.is_detached_from_series;

    console.log("[REASSIGN-SHIFT] Shift details:", {
      shiftId: shift.id,
      shiftDate: shift.shift_date,
      assignmentId: shift.assignment_id,
      seriesId: shift.series_id,
      isDetached: shift.is_detached_from_series,
      oldEmployeeId,
      newEmployeeId,
      mode,
      isRecurring,
    });

    if (mode === "single" && isRecurring) {
      // Detach from series and update
      await supabaseAdmin
        .from("shifts")
        .update({ is_detached_from_series: true })
        .eq("id", shiftId);
    }

    // Update employee assignment
    if (oldEmployeeId) {
      // Remove old assignment
      await supabaseAdmin
        .from("shift_employees")
        .delete()
        .eq("shift_id", shiftId)
        .eq("employee_id", oldEmployeeId);
    }

    // Add new assignment
    await supabaseAdmin.from("shift_employees").insert({
      shift_id: shiftId,
      employee_id: newEmployeeId,
      role: "worker",
    });

    // Track affected shifts for the response message
    let affectedCount = 1; // Default: current shift only

    // For "future" mode, also update future shifts in the series
    if (mode === "future") {
      // Use assignment_id to find future shifts (same approach as updateShift)
      // This works even when series_id is null (shifts created from assignments)

      let futureShiftsQuery = supabaseAdmin
        .from("shifts")
        .select("id, shift_date, status, shift_employees ( employee_id )");

      // Apply filters conditionally
      if (shift.series_id) {
        futureShiftsQuery = futureShiftsQuery
          .eq("series_id", shift.series_id)
          .eq("is_detached_from_series", false);
      } else if (shift.assignment_id) {
        futureShiftsQuery = futureShiftsQuery.eq("assignment_id", shift.assignment_id);
      }

      const { data: futureShifts } = await futureShiftsQuery
        .gte("shift_date", shift.shift_date) // Include current shift
        .neq("status", "completed"); // Exclude completed shifts

      console.log("[REASSIGN-SHIFT] Found future shifts:", (futureShifts || []).length, "shifts to update");
      affectedCount = (futureShifts || []).length;

      for (const futureShift of futureShifts || []) {
        // Skip the current shift (already handled above)
        if (futureShift.id === shiftId) continue;

        // Remove any existing employee assignment for this shift
        await supabaseAdmin
          .from("shift_employees")
          .delete()
          .eq("shift_id", futureShift.id);

        // Assign the new employee
        await supabaseAdmin.from("shift_employees").insert({
          shift_id: futureShift.id,
          employee_id: newEmployeeId,
          role: "worker",
        });
      }

      // ALSO update order_employee_assignments for the entire series
      // This ensures that when shifts are fetched, they show the correct employee
      if (shift.assignment_id) {
        console.log("[REASSIGN-SHIFT] Updating order_employee_assignments for assignment:", shift.assignment_id);
        const { error: updateAssignError } = await supabaseAdmin
          .from("order_employee_assignments")
          .update({ employee_id: newEmployeeId })
          .eq("id", shift.assignment_id);

        if (updateAssignError) {
          console.error("[REASSIGN-SHIFT] Failed to update order_employee_assignments:", updateAssignError);
        } else {
          console.log("[REASSIGN-SHIFT] Successfully updated order_employee_assignments");
        }
      }

      console.log("[REASSIGN-SHIFT] Total affected shifts:", affectedCount);
    }

    revalidatePath("/dashboard/planning");
    return {
      success: true,
      message:
        mode === "single"
          ? "Einsatz erfolgreich neu zugewiesen."
          : `${affectedCount} ${affectedCount === 1 ? 'Einsatz' : 'Einsätze'} erfolgreich neu zugewiesen (aktueller + alle zukünftigen).`,
      affectedCount,
    };
  } catch (error: any) {
    console.error("Fehler beim Neuzuweisen:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// ============================================================================
// UPDATE SHIFT STATUS
// ============================================================================

export async function updateShiftStatus(
  shiftId: string,
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show"
): Promise<{ success: boolean; message: string }> {
  const supabaseAdmin = createAdminClient();

  try {
    const updateData: any = { status };
    if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
      .from("shifts")
      .update(updateData)
      .eq("id", shiftId);

    if (error) throw error;

    // Generate time entries when status becomes 'completed'
    // Note: Previously this was handled by a database trigger that doesn't exist
    if (status === "completed") {
      const { generateTimeEntriesForShift } = await import("@/app/dashboard/time-tracking/actions");
      await generateTimeEntriesForShift(shiftId);
    }

    revalidatePath("/dashboard/planning");
    return { success: true, message: "Status erfolgreich aktualisiert." };
  } catch (error: any) {
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// ============================================================================
// SYNC ASSIGNMENT TO SHIFTS (solves "two truths" problem)
// ============================================================================


/**
 * Sanitize assigned_daily_schedules to prevent PostgreSQL errors.
 * Filters out schedules with invalid hours values (null, empty, <= 0).
 */
function sanitizeScheduleData(schedules: any[] | null | undefined): any[] {
  if (!schedules || !Array.isArray(schedules)) return [];

  return schedules.map(schedule => {
    if (!schedule || typeof schedule !== 'object') return {};

    const sanitized: any = {};
    for (const [dayKey, daySchedule] of Object.entries(schedule)) {
      if (daySchedule && typeof daySchedule === 'object') {
        const day = daySchedule as { hours?: any; start?: string; end?: string };
        // Only include days with valid, positive hours
        const hours = Number(day.hours);
        if (day.hours != null && String(day.hours).trim() !== "" && !isNaN(hours) && hours > 0) {
          sanitized[dayKey] = {
            hours: hours,
            start: day.start || "08:00",
            end: day.end || "17:00"
          };
        }
      }
    }
    return sanitized;
  }).filter(s => Object.keys(s).length > 0);
}

/**
 * Clean up existing assignments with invalid schedule data before calling RPC.
 * This prevents PostgreSQL error 22P02 when generate_shifts_from_assignments
 * processes assignments with null/empty hours values.
 */
async function sanitizeExistingAssignments(supabaseAdmin: any): Promise<void> {
  const { data: assignments } = await supabaseAdmin
    .from('order_employee_assignments')
    .select('id, assigned_daily_schedules')
    .not('assigned_daily_schedules', 'is', null);

  if (!assignments || assignments.length === 0) {
    return;
  }

  let cleanedCount = 0;

  for (const assignment of assignments) {
    const sanitized = sanitizeScheduleData(assignment.assigned_daily_schedules);
    
    // Debug log to see what's being sanitized
    const originalIsEmpty = !assignment.assigned_daily_schedules || 
                          assignment.assigned_daily_schedules.length === 0 || 
                          Object.keys(assignment.assigned_daily_schedules[0] || {}).length === 0;
    const sanitizedIsEmpty = !sanitized || sanitized.length === 0 || 
                             Object.keys(sanitized[0] || {}).length === 0;
    

    // Only update if sanitization changed the data
    if (JSON.stringify(sanitized) !== JSON.stringify(assignment.assigned_daily_schedules)) {
      await supabaseAdmin
        .from('order_employee_assignments')
        .update({ assigned_daily_schedules: sanitized })
        .eq('id', assignment.id);

      cleanedCount++;
    }
  }
  
}

/**
 * Synchronisiert Mitarbeiter-Änderungen von order_employee_assignments zu shift_employees
 *
 * Löst das "zwei Wahrheiten" Problem durch Synchronisation bei Assignment-Änderungen.
 * Stellt sicher, dass sowohl bereits generierte Shifts als auch zukünftige Generierung
 * konsistent sind.
 *
 * @param assignmentId - Die ID des order_employee_assignments Datensatzes
 * @param newEmployeeId - Der neue Mitarbeiter für alle Shifts
 * @param mode - "future" (ab heute) oder "all"
 * @returns success, message, updated_count
 */
export async function syncAssignmentToShifts(
  assignmentId: string,
  newEmployeeId: string,
  mode: "future" | "all" = "future"
): Promise<{ success: boolean; message: string; updated_count: number }> {
  const supabaseAdmin = createAdminClient();
  const today = format(new Date(), "yyyy-MM-dd");

  console.log("[SYNC-ASSIGNMENT] Starting sync:", { assignmentId, newEmployeeId, mode });

  try {
    // 1. Race Condition Check: Ist Assignment noch aktuell?
    const { data: assignment } = await supabaseAdmin
      .from("order_employee_assignments")
      .select("employee_id")
      .eq("id", assignmentId)
      .single();

    if (!assignment) {
      console.warn("[SYNC-ASSIGNMENT] Assignment nicht gefunden:", assignmentId);
      return { success: false, message: "Assignment nicht gefunden", updated_count: 0 };
    }

    // 2. Finde alle betroffenen Shifts (mit Limits für Performance)
    let shiftsQuery = supabaseAdmin
      .from("shifts")
      .select("id, status")
      .eq("assignment_id", assignmentId)
      .neq("status", "completed")  // Abgeschlossene Shifts schützen
      .limit(1000);  // Safety limit

    if (mode === "future") {
      shiftsQuery = shiftsQuery.gte("shift_date", today);
    }

    const { data: shifts, error: shiftsError } = await shiftsQuery;

    if (shiftsError) {
      console.error("[SYNC-ASSIGNMENT] Error fetching shifts:", shiftsError);
      throw shiftsError;
    }

    if (!shifts || shifts.length === 0) {
      console.log("[SYNC-ASSIGNMENT] Keine Shifts zu aktualisieren");
      return { success: true, message: "Keine Shifts zu aktualisieren", updated_count: 0 };
    }

    // 3. Batch-Update von shift_employees (delete + insert für alle betroffenen Shifts)
    const shiftIds = shifts.map(shift => shift.id);

    // Zuerst alle alten Einträge für diese Shifts löschen
    const { error: deleteError } = await supabaseAdmin
      .from("shift_employees")
      .delete()
      .in("shift_id", shiftIds);

    if (deleteError) {
      console.error("[SYNC-ASSIGNMENT] Error deleting old assignments:", deleteError);
      throw deleteError;
    }

    // Dann neue Einträge mit dem neuen Mitarbeiter erstellen
    const shiftEmployees = shiftIds.map(shiftId => ({
      shift_id: shiftId,
      employee_id: newEmployeeId,
      role: "worker" as const
    }));

    const { error: insertError } = await supabaseAdmin
      .from("shift_employees")
      .insert(shiftEmployees);

    if (insertError) {
      console.error("[SYNC-ASSIGNMENT] Error inserting new assignments:", insertError);
      throw insertError;
    }

    console.log(`[SYNC-ASSIGNMENT] ${shifts.length} Shifts aktualisiert für Assignment ${assignmentId}`);

    return {
      success: true,
      message: `${shifts.length} Shift(s) aktualisiert`,
      updated_count: shifts.length
    };

  } catch (error: any) {
    console.error("[SYNC-ASSIGNMENT] Error:", error);
    return {
      success: false,
      message: `Fehler beim Synchronisieren: ${error.message}`,
      updated_count: 0
    };
  }
}

// ============================================================================
// DELETE SINGLE SHIFT (deletes directly from shifts table)
// ============================================================================

export async function deleteShift(
  shiftId: string,
  shiftDate: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  try {
    console.log("[DELETE] Starting deleteShift:", { shiftId, shiftDate, notes });

    // Verify shift exists first
    const { data: shift, error: fetchError } = await supabaseAdmin
      .from("shifts")
      .select("id, shift_date, status, assignment_id")
      .eq("id", shiftId)
      .single();

    if (fetchError) {
      console.error("[DELETE] Shift not found:", fetchError);
      throw new Error("Einsatz nicht gefunden.");
    }

    console.log("[DELETE] Found shift:", shift);

    // Delete in correct order to avoid foreign key constraint errors
    console.log("[DELETE] Executing deletes...");

    // First check what exists before deleting
    const { count: employeesBefore } = await supabaseAdmin
      .from('shift_employees')
      .select('*', { count: 'exact', head: true })
      .eq('shift_id', shiftId);

    const { count: timeEntriesBefore } = await supabaseAdmin
      .from('time_entries')
      .select('*', { count: 'exact', head: true })
      .eq('shift_id', shiftId);

    const { count: shiftsBefore } = await supabaseAdmin
      .from('shifts')
      .select('*', { count: 'exact', head: true })
      .eq('id', shiftId);

    console.log("[DELETE] Before delete - shift_employees:", employeesBefore, "time_entries:", timeEntriesBefore, "shifts:", shiftsBefore);

    // Delete child table records first, then parent
    const employeesResult = await supabaseAdmin
      .from('shift_employees')
      .delete()
      .eq('shift_id', shiftId);

    console.log("[DELETE] shift_employees delete result:", { error: employeesResult.error, status: employeesResult.status });

    if (employeesResult.error) {
      console.error("[DELETE] Error deleting shift_employees:", employeesResult.error);
      throw employeesResult.error;
    }

    const timeEntriesResult = await supabaseAdmin
      .from('time_entries')
      .delete()
      .eq('shift_id', shiftId);

    console.log("[DELETE] time_entries delete result:", { error: timeEntriesResult.error, status: timeEntriesResult.status });

    if (timeEntriesResult.error) {
      console.error("[DELETE] Error deleting time_entries:", timeEntriesResult.error);
      throw timeEntriesResult.error;
    }

    const shiftsResult = await supabaseAdmin
      .from('shifts')
      .delete()
      .eq('id', shiftId);

    console.log("[DELETE] shifts delete result:", { error: shiftsResult.error, status: shiftsResult.status });

    if (shiftsResult.error) {
      console.error("[DELETE] Error deleting shifts:", shiftsResult.error);
      throw shiftsResult.error;
    }

    // Verify deletion by checking counts after
    const { count: shiftsAfter } = await supabaseAdmin
      .from('shifts')
      .select('*', { count: 'exact', head: true })
      .eq('id', shiftId);

    console.log("[DELETE] After delete - shifts count:", shiftsAfter);

    revalidatePath("/dashboard/planning");
    return { success: true, message: notes || "Einsatz erfolgreich gelöscht." };
  } catch (error: any) {
    console.error("[DELETE] Error:", error);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// ============================================================================
// DELETE SERIES (delete shifts from the shifts table)
// ============================================================================

export type SeriesDeleteMode = "single" | "future" | "all";

export async function deleteSeries(
  assignmentId: string,
  mode: SeriesDeleteMode = "future",
  fromDate?: string,
  skipAutoGeneration: boolean = true
): Promise<{ success: boolean; message: string }> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  try {
    console.log("[DELETE-SERIES] Starting series delete:", { assignmentId, mode, fromDate });

    // Build date filter for query
    let startDate: string | undefined;
    let endDate: string | undefined;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];

    if (mode === "single" && fromDate) {
      // Single mode: just this one date
      startDate = fromDate;
      endDate = fromDate;
    } else if (mode === "all") {
      // All mode: all shifts for this assignment
      startDate = undefined; // No lower bound
      endDate = undefined;   // No upper bound
    } else {
      // Future mode: from fromDate onwards
      startDate = fromDate;
      endDate = undefined; // No upper bound
    }

    console.log("[DELETE-SERIES] Query params:", { startDate, endDate, today });

    // First, get the order_id for this assignment to find all related assignments
    // This handles recurring series with multiple employees (each has their own assignment_id)
    const { data: assignmentData } = await supabaseAdmin
      .from("order_employee_assignments")
      .select("order_id, employee_id")
      .eq("id", assignmentId)
      .single();

    let assignmentIds: string[] = [assignmentId]; // Default to just the provided assignment

    if (assignmentData?.order_id) {
      // Find all assignments for the same order (different employees in the series)
      const { data: relatedAssignments } = await supabaseAdmin
        .from("order_employee_assignments")
        .select("id")
        .eq("order_id", assignmentData.order_id);

      if (relatedAssignments && relatedAssignments.length > 0) {
        assignmentIds = relatedAssignments.map(a => a.id);
        console.log("[DELETE-SERIES] Found related assignments:", assignmentIds.length, "assignments for order", assignmentData.order_id);
      }
    }

    // Build the query to find shifts for all related assignments
    let query = supabaseAdmin
      .from("shifts")
      .select("id, shift_date, status")
      .in("assignment_id", assignmentIds);

    if (startDate) {
      query = query.gte("shift_date", startDate);
    }
    if (endDate) {
      query = query.lte("shift_date", endDate);
    }

    const { data: shiftsToDelete, error: fetchError } = await query;

    if (fetchError) {
      console.error("[DELETE-SERIES] Error fetching shifts:", fetchError);
      throw fetchError;
    }

    console.log("[DELETE-SERIES] Found shifts to delete:", shiftsToDelete?.length, shiftsToDelete);

    // If no shifts found, handle gracefully
    if (!shiftsToDelete || shiftsToDelete.length === 0) {
      console.log("[DELETE-SERIES] No shifts found to delete");
      revalidatePath("/dashboard/planning");
      return { success: true, message: "Kein Einsatz gefunden." };
    }

    let deletedCount = 0;
    let skippedCompleted = 0;

    // Filter out shifts that should be skipped
    const shiftsToProcess = shiftsToDelete.filter((shift) => {
      if (mode === "future" && (shift.shift_date < today || shift.status === "completed")) {
        console.log("[DELETE-SERIES] Skipping completed shift:", shift.id, shift.shift_date);
        skippedCompleted++;
        return false;
      }
      return true;
    });

    if (shiftsToProcess.length === 0) {
      console.log("[DELETE-SERIES] No shifts to process after filtering");
      revalidatePath("/dashboard/planning");
      return { success: true, message: "Kein Einsatz gefunden." };
    }

    // Delete in correct order to avoid foreign key constraint errors
    const shiftIds = shiftsToProcess.map(s => s.id);
    console.log("[DELETE-SERIES] Deleting shifts for:", shiftIds);

    console.log("[DELETE-SERIES] Executing deletes...");

    // First check what exists before deleting
    const { count: employeesBefore } = await supabaseAdmin
      .from('shift_employees')
      .select('*', { count: 'exact', head: true })
      .in('shift_id', shiftIds);

    const { count: timeEntriesBefore } = await supabaseAdmin
      .from('time_entries')
      .select('*', { count: 'exact', head: true })
      .in('shift_id', shiftIds);

    const { count: shiftsBefore } = await supabaseAdmin
      .from('shifts')
      .select('*', { count: 'exact', head: true })
      .in('id', shiftIds);

    console.log("[DELETE-SERIES] Before delete - shift_employees:", employeesBefore, "time_entries:", timeEntriesBefore, "shifts:", shiftsBefore);

    // Delete child table records first for all shifts, then parent records
    const employeesResult = await supabaseAdmin
      .from('shift_employees')
      .delete()
      .in('shift_id', shiftIds);

    console.log("[DELETE-SERIES] shift_employees delete result:", { error: employeesResult.error, status: employeesResult.status });

    if (employeesResult.error) {
      console.error("[DELETE-SERIES] Error deleting shift_employees:", employeesResult.error);
      throw employeesResult.error;
    }

    const timeEntriesResult = await supabaseAdmin
      .from('time_entries')
      .delete()
      .in('shift_id', shiftIds);

    console.log("[DELETE-SERIES] time_entries delete result:", { error: timeEntriesResult.error, status: timeEntriesResult.status });

    if (timeEntriesResult.error) {
      console.error("[DELETE-SERIES] Error deleting time_entries:", timeEntriesResult.error);
      throw timeEntriesResult.error;
    }

    const shiftsResult = await supabaseAdmin
      .from('shifts')
      .delete()
      .in('id', shiftIds);

    console.log("[DELETE-SERIES] shifts delete result:", { error: shiftsResult.error, status: shiftsResult.status });

    if (shiftsResult.error) {
      console.error("[DELETE-SERIES] Error deleting shifts:", shiftsResult.error);
      throw shiftsResult.error;
    }

    // Verify deletion by checking counts after
    const { count: shiftsAfter } = await supabaseAdmin
      .from('shifts')
      .select('*', { count: 'exact', head: true })
      .in('id', shiftIds);

    console.log("[DELETE-SERIES] After delete - shifts count:", shiftsAfter, "(should be 0)");

    deletedCount = shiftsBefore || 0;
    console.log("[DELETE-SERIES] Successfully deleted", deletedCount, "shifts");

    revalidatePath("/dashboard/planning");

    let message: string;
    if (mode === "single") {
      message = deletedCount > 0 ? "Einsatz erfolgreich gelöscht." : "Kein Einsatz gefunden.";
    } else if (mode === "all") {
      message = `${deletedCount} Einsätze der Serie gelöscht.`;
    } else {
      message = `${deletedCount} zukünftige Einsätze gelöscht. ${skippedCompleted} abgeschlossene Einsätze übersprungen.`;
    }

    console.log("[DELETE-SERIES] Complete:", { deletedCount, skippedCompleted, message });

    // Only mark assignment as deleted when deleting the ENTIRE series (mode="all")
    // For single/future modes, the assignment should remain active for future shifts
    if (skipAutoGeneration && mode === "all") {
      console.log("[DELETE-SERIES] Marking assignment as deleted (entire series):", assignmentId);
      const { error: updateError } = await supabaseAdmin
        .from('order_employee_assignments')
        .update({ deleted: true })
        .eq('id', assignmentId);

      if (updateError) {
        console.error("[DELETE-SERIES] Error marking assignment as deleted:", updateError);
        // Continue anyway - shifts are already deleted
      }
    }

    return { success: true, message };
  } catch (error: any) {
    console.error("[DELETE-SERIES] Error:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// ============================================================================
// REASSIGN ASSIGNMENT (for recurring shifts)
// ============================================================================

export type AssignmentEditMode = "single" | "future" | "all";

export async function reassignAssignment(
  assignmentId: string,
  newEmployeeId: string,
  mode: AssignmentEditMode = "single",
  shiftDate?: string,
  shiftTimes?: { start: string; end: string; hours: number },
  originalShiftDate?: string // The actual date of the shift being moved
): Promise<{ success: boolean; message: string }> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  try {
    // Get current assignment
    console.log("[REASSIGN] Starting reassignment:", {
      assignmentId,
      newEmployeeId,
      mode,
      shiftDate,
      shiftTimes,
    });

    const { data: assignment, error: fetchError } = await supabaseAdmin
      .from("order_employee_assignments")
      .select("*")
      .eq("id", assignmentId)
      .single();

    if (fetchError || !assignment) {
      console.error("[REASSIGN] Assignment not found:", fetchError);
      throw new Error("Assignment nicht gefunden.");
    }

    console.log("[REASSIGN] Found assignment:", {
      id: assignment.id,
      order_id: assignment.order_id,
      employee_id: assignment.employee_id,
      start_date: assignment.start_date,
      end_date: assignment.end_date,
      assigned_daily_schedules: JSON.stringify(assignment.assigned_daily_schedules),
    });

    // Use shiftDate if provided, otherwise fall back to assignment.start_date
    const targetDate = shiftDate || assignment.start_date;
    // Use originalShiftDate for detecting same-employee moves (falls back to assignment.start_date for backwards compatibility)
    const actualOriginalDate = originalShiftDate || assignment.start_date;

    console.log("[REASSIGN] Target date:", targetDate);
    console.log("[REASSIGN] Original shift date:", actualOriginalDate);
    console.log("[REASSIGN] Same employee check:", {
      assignmentEmployeeId: assignment.employee_id,
      newEmployeeId,
      isSameEmployee: assignment.employee_id === newEmployeeId,
      isDateChange: actualOriginalDate !== targetDate,
    });

    if (mode === "single") {
      // Check if this is a same-employee date change
      const isSameEmployee = assignment.employee_id === newEmployeeId;
      console.log("[REASSIGN] Is same employee reassignment:", isSameEmployee);

      if (isSameEmployee && actualOriginalDate === targetDate) {
        // SAME EMPLOYEE, SAME DATE: Nothing to do
        console.log("[REASSIGN] Same employee, same date - no changes needed");
        return { success: true, message: "Keine Änderung erforderlich." };
      }

      if (isSameEmployee && actualOriginalDate !== targetDate) {
        // SAME EMPLOYEE, DIFFERENT DATE: This is a SINGLE shift move
        // We need to:
        // 1. Create an override to "delete" the shift from the ORIGINAL date in the series
        // 2. Add the new date to the assignment's schedule
        console.log("[REASSIGN] Same employee - moving single shift from", actualOriginalDate, "to", targetDate);

        // Create an override for the ORIGINAL shift date to mark it as deleted
        // Use the actual original shift date, not assignment.start_date
        await supabaseAdmin.from("shift_overrides").insert({
          assignment_id: assignmentId,
          shift_date: actualOriginalDate,
          action: "deleted",
          notes: `Einzeltermin verschoben auf ${targetDate}`,
          created_by: user.id,
        });

        // Get the current assignment data
        const currentData = await supabaseAdmin
          .from("order_employee_assignments")
          .select("assigned_daily_schedules, start_date, end_date")
          .eq("id", assignmentId)
          .single();

        if (currentData.error) throw currentData.error;

        // Parse daily schedules
        let dailySchedules: any[] = [];
        if (typeof currentData.data.assigned_daily_schedules === "string") {
          try {
            dailySchedules = JSON.parse(currentData.data.assigned_daily_schedules);
          } catch (e) {
            console.error("[REASSIGN] Failed to parse daily schedules:", e);
            dailySchedules = [];
          }
        } else {
          dailySchedules = (currentData.data.assigned_daily_schedules) || [];
        }

        // Determine the day of week for the target date
        const targetDayOfWeek = dayNames[new Date(targetDate).getDay()];
        console.log("[REASSIGN] Target day of week:", targetDayOfWeek);

        // Get shift times from the original schedule or use defaults
        let shiftStart = "08:00";
        let shiftEnd = "17:00";
        let shiftHours = 8;

        // Try to get times from shiftTimes parameter or from original schedule
        if (shiftTimes) {
          shiftStart = shiftTimes.start;
          shiftEnd = shiftTimes.end;
          shiftHours = shiftTimes.hours;
        } else {
          // Try to get from the original assignment's schedule
          const originalSchedule = dailySchedules[0] || {};
          const originalDaySchedule = originalSchedule[dayNames[new Date(assignment.start_date).getDay()]];
          if (originalDaySchedule) {
            shiftStart = originalDaySchedule.start || "08:00";
            shiftEnd = originalDaySchedule.end || "17:00";
            shiftHours = originalDaySchedule.hours || 8;
          }
        }

        // Create a deep copy of schedules to avoid mutations
        const existingSchedules = dailySchedules.map((s: any) => ({ ...s }));

        // Check if a schedule for the target day already exists
        let dayScheduleExists = false;
        for (let i = 0; i < existingSchedules.length; i++) {
          if (existingSchedules[i][targetDayOfWeek]) {
            existingSchedules[i] = {
              ...existingSchedules[i],
              [targetDayOfWeek]: {
                start: shiftStart,
                end: shiftEnd,
                hours: shiftHours,
              }
            };
            dayScheduleExists = true;
            break;
          }
        }

        // If no schedule for target day exists, add a new schedule object
        if (!dayScheduleExists) {
          existingSchedules.push({
            [targetDayOfWeek]: {
              start: shiftStart,
              end: shiftEnd,
              hours: shiftHours,
            }
          });
        }

        // Update dates - keep start_date as the earliest, update end_date if needed
        const currentStartDate = new Date(currentData.data.start_date);
        const currentEndDate = new Date(currentData.data.end_date);
        const newTargetDate = new Date(targetDate);

        let updateData: any = {
          assigned_daily_schedules: existingSchedules,
        };

        // If the target date is before the current start date, update start_date
        if (newTargetDate < currentStartDate) {
          updateData.start_date = targetDate;
        }
        // If the target date is after the current end date, update end_date
        if (newTargetDate > currentEndDate) {
          updateData.end_date = targetDate;
        }

        // If the target date is within the existing range but different day of week,
        // we don't need to change start_date/end_date - the schedule will just have an extra day
        // But if targetDate is outside the range, we need to expand it

        console.log("[REASSIGN] Updating assignment with data:", JSON.stringify(updateData, null, 2));

        const { error: updateError } = await supabaseAdmin
          .from("order_employee_assignments")
          .update(updateData)
          .eq("id", assignmentId);

        if (updateError) throw updateError;

        revalidatePath("/dashboard/planning");
        return { success: true, message: "Einsatz erfolgreich auf neues Datum verschoben." };
      }

      // DIFFERENT EMPLOYEE: Create a new assignment for the new employee
      console.log("[REASSIGN] Different employee - creating new assignment");

      // Check if an override already exists
      const { data: existingOverride } = await supabaseAdmin
        .from("shift_overrides")
        .select("id")
        .eq("assignment_id", assignmentId)
        .eq("shift_date", targetDate)
        .eq("action", "deleted")
        .single();

      if (existingOverride) {
        // Update existing override
        await supabaseAdmin
          .from("shift_overrides")
          .update({
            notes: `Mitarbeiter geändert auf ${newEmployeeId}`,
            modified_data: { new_employee_id: newEmployeeId },
          })
          .eq("id", existingOverride.id);
      } else {
        // Create override to "delete" this shift from original assignment
        await supabaseAdmin.from("shift_overrides").insert({
          assignment_id: assignmentId,
          shift_date: targetDate,
          action: "deleted",
          notes: "Mitarbeiter geändert (einzelner Termin)",
          created_by: user.id,
        });
      }

      // Determine the day of week for the target date
      const targetDayOfWeek = dayNames[new Date(targetDate).getDay()];
      console.log("[REASSIGN] Target day of week:", targetDayOfWeek);

      // Use the provided shift times, OR try to get them from the original assignment's schedule
      let shiftStart: string;
      let shiftEnd: string;
      let shiftHours: number;

      if (shiftTimes) {
        shiftStart = shiftTimes.start;
        shiftEnd = shiftTimes.end;
        shiftHours = shiftTimes.hours;
        console.log("[REASSIGN] Using provided shift times:", { shiftStart, shiftEnd, shiftHours });
      } else {
        // Try to get the shift times from the original assignment's schedule
        const originalSchedule = assignment.assigned_daily_schedules?.[0] || {};
        const originalDaySchedule = originalSchedule[targetDayOfWeek];
        shiftStart = originalDaySchedule?.start || "08:00";
        shiftEnd = originalDaySchedule?.end || "17:00";
        shiftHours = originalDaySchedule?.hours || 8;
        console.log("[REASSIGN] Using assignment schedule times:", { shiftStart, shiftEnd, shiftHours });
      }

      // Check if the new employee already has an assignment for this order
      console.log("[REASSIGN] Checking for existing assignment for new employee...");
      const { data: existingAssignment, error: fetchExistingError } = await supabaseAdmin
        .from("order_employee_assignments")
        .select("id, employee_id")
        .eq("order_id", assignment.order_id)
        .eq("employee_id", newEmployeeId)
        .single();

      if (existingAssignment) {
        console.log("[REASSIGN] New employee already has assignment for this order:", existingAssignment.id);
        // Instead of creating a new assignment, add an override to the existing assignment
        console.log("[REASSIGN] Adding override to existing assignment for target date");

        // Check if there's a "deleted" override for this date on the existing assignment
        // If so, we need to remove it since we're reassigning the shift back to this employee
        const { data: deletedOverride } = await supabaseAdmin
          .from("shift_overrides")
          .select("id")
          .eq("assignment_id", existingAssignment.id)
          .eq("shift_date", targetDate)
          .eq("action", "deleted")
          .single();

        if (deletedOverride) {
          console.log("[REASSIGN] Found deleted override for existing assignment - removing it");
          await supabaseAdmin
            .from("shift_overrides")
            .delete()
            .eq("id", deletedOverride.id);
        }

        // Add shift times to the existing assignment's daily schedules
        const { data: existingData, error: fetchExistingDataError } = await supabaseAdmin
          .from("order_employee_assignments")
          .select("assigned_daily_schedules")
          .eq("id", existingAssignment.id)
          .single();

        if (fetchExistingDataError) {
          console.error("[REASSIGN] Failed to fetch existing assignment data:", fetchExistingDataError);
          throw fetchExistingDataError;
        }

        // Create a deep copy of schedules to avoid mutations
        const existingSchedules = ((existingData?.assigned_daily_schedules) || []).map((s: any) => ({ ...s }));

        // Check if a schedule for this day already exists, if so update it
        let dayScheduleExists = false;
        for (let i = 0; i < existingSchedules.length; i++) {
          if (existingSchedules[i][targetDayOfWeek]) {
            existingSchedules[i] = {
              ...existingSchedules[i],
              [targetDayOfWeek]: {
                start: shiftStart,
                end: shiftEnd,
                hours: shiftHours,
              }
            };
            dayScheduleExists = true;
            break;
          }
        }

        // If no schedule for this day exists, add a new schedule object
        if (!dayScheduleExists) {
          existingSchedules.push({
            [targetDayOfWeek]: {
              start: shiftStart,
              end: shiftEnd,
              hours: shiftHours,
            }
          });
        }

        console.log("[REASSIGN] Updated schedules:", JSON.stringify(existingSchedules, null, 2));

        // Update the existing assignment's daily schedules only
        // Also update start_date/end_date if the target date is different
        const { data: existingAssignData } = await supabaseAdmin
          .from("order_employee_assignments")
          .select("start_date, end_date")
          .eq("id", existingAssignment.id)
          .single();

        if (!existingAssignData) {
          console.error("[REASSIGN] Existing assignment data not found after fetch");
          throw new Error("Assignment data not found");
        }

        const updateData: any = {
          assigned_daily_schedules: existingSchedules,
        };

        // Update dates if target date is outside current range
        if (targetDate < existingAssignData.start_date) {
          updateData.start_date = targetDate;
        }
        if (targetDate > existingAssignData.end_date) {
          updateData.end_date = targetDate;
        }

        console.log("[REASSIGN] Updating assignment with data:", JSON.stringify(updateData, null, 2));

        const { error: updateScheduleError } = await supabaseAdmin
          .from("order_employee_assignments")
          .update(updateData)
          .eq("id", existingAssignment.id);

        if (updateScheduleError) {
          console.error("[REASSIGN] Failed to update existing assignment:", updateScheduleError);
          throw updateScheduleError;
        }

        // Verify the update worked
        const { data: verifyData } = await supabaseAdmin
          .from("order_employee_assignments")
          .select("assigned_daily_schedules")
          .eq("id", existingAssignment.id)
          .single();

        console.log("[REASSIGN] Verified schedules after update:", JSON.stringify(verifyData?.assigned_daily_schedules, null, 2));

        // Check if we're reassigning back to the ORIGINAL employee (A→B→A scenario)
        // We need to check if the EXISTING assignment's employee matches the new employee
        const isReassigningToOriginalEmployee = existingAssignment.employee_id === newEmployeeId;
        console.log("[REASSIGN] Reassign scenario:", {
          isReassigningToOriginalEmployee,
          existingAssignmentEmployeeId: existingAssignment.employee_id,
          newEmployeeId,
          existingAssignmentId: existingAssignment.id,
          draggedAssignmentId: assignmentId,
          isDifferentAssignment: existingAssignment.id !== assignmentId,
        });

        // Only create a "deleted" override if this is a DIFFERENT assignment AND not reassigning to original employee
        // If reassigning back to the original employee (A→B→A), we don't need to mark anything as deleted
        if (existingAssignment.id !== assignmentId && !isReassigningToOriginalEmployee) {
          console.log("[REASSIGN] Creating deleted override for source assignment");
          // Create an override to "delete" this shift from original assignment
          await supabaseAdmin.from("shift_overrides").insert({
            assignment_id: assignmentId,
            shift_date: targetDate,
            action: "deleted",
            notes: `Mitarbeiter geändert auf bestehenden Assignment ${existingAssignment.id}`,
            created_by: user.id,
          });
        } else if (isReassigningToOriginalEmployee) {
          console.log("[REASSIGN] Reassigning back to original employee - no deleted override needed");
          // When moving back to original employee, we also need to clean up any "deleted" override
          // on the ORIGINAL assignment that might block the shift from showing up
          const { data: originalDeletedOverride } = await supabaseAdmin
            .from("shift_overrides")
            .select("id")
            .eq("assignment_id", existingAssignment.id)
            .eq("shift_date", targetDate)
            .eq("action", "deleted")
            .single();

          if (originalDeletedOverride) {
            console.log("[REASSIGN] Found deleted override on original assignment - removing it");
            await supabaseAdmin
              .from("shift_overrides")
              .delete()
              .eq("id", originalDeletedOverride.id);
          }
        } else {
          console.log("[REASSIGN] Reassigning within same assignment - no override needed");
        }
      } else {
        // No existing assignment - create a new one
        console.log("[REASSIGN] No existing assignment found - creating new assignment");

        // Calculate the correct start_week_offset so the shift appears on the target date
        // The week starts on Monday (day 1)
        const targetDateObj = new Date(targetDate);
        const dayOfWeek = targetDateObj.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

        // Calculate start of week (Monday)
        const startOfWeek = new Date(targetDateObj);
        startOfWeek.setDate(targetDateObj.getDate() - dayOfWeek + 1);

        // Calculate days passed since start of week
        const daysPassed = Math.floor((targetDateObj.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24));
        const weeksPassed = Math.floor(daysPassed / 7);
        const recurrenceInterval = assignment.assigned_recurrence_interval_weeks || 1;
        const startOffset = weeksPassed % recurrenceInterval;

        console.log("[REASSIGN] Calculating start_offset:", {
          targetDate,
          dayOfWeek,
          daysPassed,
          weeksPassed,
          recurrenceInterval,
          startOffset,
        });

        // Create a new assignment for the new employee with the CORRECT start_week_offset
        // Use a simple schedule: just the target day
        const newAssignmentData = {
          order_id: assignment.order_id,
          employee_id: newEmployeeId,
          assigned_recurrence_interval_weeks: recurrenceInterval,
          assigned_start_week_offset: startOffset,
          assigned_daily_schedules: [{
            [targetDayOfWeek]: {
              start: shiftStart,
              end: shiftEnd,
              hours: shiftHours,
            }
          }],
          start_date: targetDate,
          end_date: targetDate,
          status: "active",
        };

        console.log("[REASSIGN] Creating new assignment with data:", JSON.stringify(newAssignmentData, null, 2));

        const { data: newAssignment, error: insertError } = await supabaseAdmin
          .from("order_employee_assignments")
          .insert(newAssignmentData)
          .select("id")
          .single();

        if (insertError) {
          console.error("[REASSIGN] Failed to create new assignment:", insertError);
          throw new Error(`Failed to create assignment: ${insertError.message}`);
        }

        console.log("[REASSIGN] New assignment created successfully:", { newAssignmentId: newAssignment?.id });

        // Create an override to "delete" this shift from original assignment
        await supabaseAdmin.from("shift_overrides").insert({
          assignment_id: assignmentId,
          shift_date: targetDate,
          action: "deleted",
          notes: `Mitarbeiter geändert auf neuen Assignment ${newAssignment.id}`,
          created_by: user.id,
        });
      }
    } else if (mode === "future") {
      // For future mode, we need to:
      // 1. Keep the original assignment as-is (for past dates)
      // 2. Create a new assignment starting from the new date

      const { data: futureOverrides } = await supabaseAdmin
        .from("shift_overrides")
        .select("id")
        .eq("assignment_id", assignmentId)
        .eq("action", "deleted");

      // Delete existing overrides for this assignment
      if (futureOverrides && futureOverrides.length > 0) {
        await supabaseAdmin
          .from("shift_overrides")
          .delete()
          .in("id", futureOverrides.map(o => o.id));
      }

      // Create a new assignment for the future dates
      const newAssignmentData = {
        ...assignment,
        id: undefined, // Let it generate a new UUID
        employee_id: newEmployeeId,
        assigned_daily_schedules: assignment.assigned_daily_schedules,
        start_date: assignment.start_date,
        end_date: assignment.end_date,
        created_at: undefined,
        updated_at: undefined,
      };

      await supabaseAdmin.from("order_employee_assignments").insert(newAssignmentData);
    } else {
      // mode === "all" - update the employee for the entire assignment
      await supabaseAdmin
        .from("order_employee_assignments")
        .update({
          employee_id: newEmployeeId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assignmentId);
    }

    revalidatePath("/dashboard/planning");
    return {
      success: true,
      message:
        mode === "single"
          ? "Nur dieser Termin wurde neu zugewiesen."
          : mode === "future"
          ? "Alle zukünftigen Termine wurden neu zugewiesen."
          : "Alle Termine wurden neu zugewiesen.",
    };
  } catch (error: any) {
    console.error("Fehler beim Neuzuweisen des Assignments:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// ============================================================================
// COPY ASSIGNMENT (create duplicate for another employee)
// ============================================================================

export async function copyAssignment(
  assignmentId: string,
  newEmployeeId: string,
  copyDate?: string,
  isSeriesCopy?: boolean
): Promise<{ success: boolean; message: string }> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  try {
    console.log("[COPY] Starting copy assignment:", { assignmentId, newEmployeeId, copyDate });

    // Get current assignment with order details
    const { data: assignment, error: fetchError } = await supabaseAdmin
      .from("order_employee_assignments")
      .select(`
        *,
        orders!inner (
          id,
          title,
          order_type,
          customer_id,
          object_id,
          service_type,
          total_estimated_hours,
          priority,
          notes
        )
      `)
      .eq("id", assignmentId)
      .single();

    if (fetchError || !assignment) {
      console.error("[COPY] Assignment not found:", fetchError);
      throw new Error("Assignment nicht gefunden.");
    }

    console.log("[COPY] Found assignment:", {
      id: assignment.id,
      order_id: assignment.order_id,
      employee_id: assignment.employee_id,
    });

    // Check if new employee is already assigned to this order
    const { data: existingAssignment } = await supabaseAdmin
      .from("order_employee_assignments")
      .select("id")
      .eq("order_id", assignment.order_id)
      .eq("employee_id", newEmployeeId)
      .single();

    if (existingAssignment) {
      console.log("[COPY] Employee already assigned to this order:", existingAssignment.id);
      return {
        success: false,
        message: "Mitarbeiter ist bereits diesem Auftrag zugewiesen.",
      };
    }

    // Parse daily schedules if needed
    let dailySchedules: any[] = [];
    if (typeof assignment.assigned_daily_schedules === "string") {
      try {
        dailySchedules = JSON.parse(assignment.assigned_daily_schedules);
      } catch (e) {
        console.error("[COPY] Failed to parse daily schedules:", e);
      }
    } else {
      dailySchedules = assignment.assigned_daily_schedules || [];
    }

    // Determine start date
    // For series copy, use copyDate as the new start date (if provided)
    // Otherwise use the original assignment's start date
    const startDate = copyDate || assignment.start_date;
    const endDate = assignment.end_date || startDate;

    console.log("[COPY] Copy parameters:", {
      assignmentId,
      newEmployeeId,
      copyDate,
      isSeriesCopy,
      originalStartDate: assignment.start_date,
      newStartDate: startDate,
    });

    // Create new assignment for the new employee
    // For series copy, we preserve the schedule structure but adjust start date
    const newAssignmentData = {
      order_id: assignment.order_id,
      employee_id: newEmployeeId,
      start_date: startDate,
      end_date: isSeriesCopy ? assignment.end_date : startDate, // Keep original end date for series, single date for single copy
      assigned_daily_schedules: dailySchedules,
      assigned_recurrence_interval_weeks: assignment.assigned_recurrence_interval_weeks || 1,
      assigned_start_week_offset: assignment.assigned_start_week_offset || 0,
      status: "active",
    };

    console.log("[COPY] Creating new assignment:", JSON.stringify(newAssignmentData, null, 2));

    const { data: newAssignment, error: insertError } = await supabaseAdmin
      .from("order_employee_assignments")
      .insert(newAssignmentData)
      .select("id")
      .single();

    if (insertError) {
      console.error("[COPY] Failed to create new assignment:", insertError);
      throw new Error(`Fehler beim Erstellen der Zuweisung: ${insertError.message}`);
    }

    console.log("[COPY] New assignment created successfully:", newAssignment?.id);

    // Send notification to new employee
    const { data: newEmployee } = await supabaseAdmin
      .from("employees")
      .select("user_id, first_name, last_name")
      .eq("id", newEmployeeId)
      .single();

    if (newEmployee?.user_id) {
      await sendNotification({
        userId: newEmployee.user_id,
        title: "Auftrag kopiert",
        message: `Ihnen wurde der Auftrag "${assignment.orders.title}" zugewiesen (kopiert von anderem Mitarbeiter).`,
        link: "/dashboard/orders",
      });
    }

    revalidatePath("/dashboard/planning");

    return {
      success: true,
      message: `Auftrag "${assignment.orders.title}" wurde erfolgreich für ${newEmployee?.first_name || "Mitarbeiter"} kopiert.`,
    };
  } catch (error: any) {
    console.error("Fehler beim Kopieren des Assignments:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
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
// UPDATE SHIFT DETAILS (time, hours, etc.)
// ============================================================================

export async function updateShift(
  assignmentId: string,
  shiftDate: string,
  updates: {
    start_time?: string;
    end_time?: string;
    estimated_hours?: number;
    travel_time_minutes?: number;
    break_time_minutes?: number;
    status?: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show";
    update_mode?: "single" | "series";
  }
): Promise<{ success: boolean; message: string }> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  try {
    console.log("[UPDATE-SHIFT] Updating shift:", { assignmentId, shiftDate, updates });

    // Track updated shift IDs for time entry generation
    const updatedShiftIds: string[] = [];

    // Get current assignment to check if it's a series
    const { data: assignment, error: fetchError } = await supabaseAdmin
      .from("order_employee_assignments")
      .select("*, shifts(*)")
      .eq("id", assignmentId)
      .single();

    if (fetchError || !assignment) {
      // Try finding in shifts table directly
      const { data: shiftData, error: shiftError } = await supabaseAdmin
        .from("shifts")
        .select("*")
        .eq("id", assignmentId)
        .single();

      if (shiftError || !shiftData) {
        throw new Error("Assignment/Shift nicht gefunden.");
      }

      // Direct shift update
      const { error: updateError } = await supabaseAdmin
        .from("shifts")
        .update({
          start_time: updates.start_time || shiftData.start_time,
          end_time: updates.end_time || shiftData.end_time,
          estimated_hours: updates.estimated_hours || shiftData.estimated_hours,
          travel_time_minutes: updates.travel_time_minutes,
          break_time_minutes: updates.break_time_minutes,
          status: updates.status || shiftData.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assignmentId);

      if (updateError) throw updateError;

      updatedShiftIds.push(assignmentId);

      // Generate time entries when status becomes 'completed' for direct shift update
      if ((updates.status === "completed" || updates.status === undefined) && shiftData.status !== "completed") {
        const { generateTimeEntriesForShift } = await import("@/app/dashboard/time-tracking/actions");
        await generateTimeEntriesForShift(assignmentId);
      }

      revalidatePath("/dashboard/planning");
      return { success: true, message: "Einsatz erfolgreich aktualisiert." };
    }

    // This is an assignment with potential series
    const isRecurring = assignment.series_id && !assignment.is_detached_from_series;
    const updateMode = updates.update_mode || "single";

    if (isRecurring) {
      if (updateMode === "series") {
        // Update all future shifts in the series directly
        // First, get all shifts from the series that are on or after shiftDate
        const { data: seriesShifts, error: seriesError } = await supabaseAdmin
          .from("shifts")
          .select("id")
          .eq("assignment_id", assignmentId)
          .gte("shift_date", shiftDate);

        if (seriesError) throw seriesError;

        // Update each shift - use updates values directly for series mode
        for (const shift of seriesShifts || []) {
          const { error: updateError } = await supabaseAdmin
            .from("shifts")
            .update({
              start_time: updates.start_time,
              end_time: updates.end_time,
              estimated_hours: updates.estimated_hours,
              travel_time_minutes: updates.travel_time_minutes,
              break_time_minutes: updates.break_time_minutes,
              status: updates.status,
              updated_at: new Date().toISOString(),
            })
            .eq("id", shift.id);

          if (updateError) throw updateError;

          updatedShiftIds.push(shift.id);
        }

        // Also update the assignment's start_week_offset and daily_schedules if needed
        // This would require more complex logic - for now we just update individual shifts
      } else {
        // Single shift update - update the shift directly
        // For recurring shifts in single mode, we need to find and update the specific shift
        const { data: shiftToUpdate, error: shiftFindError } = await supabaseAdmin
          .from("shifts")
          .select("id")
          .eq("assignment_id", assignmentId)
          .eq("shift_date", shiftDate)
          .single();

        if (shiftFindError || !shiftToUpdate) {
          throw new Error("Shift nicht gefunden.");
        }

        const { error: updateError } = await supabaseAdmin
          .from("shifts")
          .update({
            start_time: updates.start_time,
            end_time: updates.end_time,
            estimated_hours: updates.estimated_hours,
            travel_time_minutes: updates.travel_time_minutes,
            break_time_minutes: updates.break_time_minutes,
            status: updates.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", shiftToUpdate.id);

        if (updateError) throw updateError;

        updatedShiftIds.push(shiftToUpdate.id);
      }
    } else {
      // Non-recurring assignment - update directly
      // First find the shift for this assignment and date
      const { data: shiftData, error: shiftFindError } = await supabaseAdmin
        .from("shifts")
        .select("id")
        .eq("assignment_id", assignmentId)
        .eq("shift_date", shiftDate)
        .single();

      if (shiftFindError || !shiftData) {
        throw new Error("Shift nicht gefunden.");
      }

      const { error: updateError } = await supabaseAdmin
        .from("shifts")
        .update({
          start_time: updates.start_time,
          end_time: updates.end_time,
          estimated_hours: updates.estimated_hours,
          travel_time_minutes: updates.travel_time_minutes,
          break_time_minutes: updates.break_time_minutes,
          status: updates.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", shiftData.id);

      if (updateError) throw updateError;

      updatedShiftIds.push(shiftData.id);
    }

    // Generate time entries when status becomes 'completed'
    // Note: Previously this was handled by a database trigger that doesn't exist
    if (updates.status === "completed" && updatedShiftIds.length > 0) {
      const { generateTimeEntriesForShift } = await import("@/app/dashboard/time-tracking/actions");
      for (const shiftId of updatedShiftIds) {
        await generateTimeEntriesForShift(shiftId);
      }
    }

    revalidatePath("/dashboard/planning");

    // Return appropriate message based on update mode
    if (isRecurring && updateMode === "series") {
      return { success: true, message: "Gesamte Serie erfolgreich aktualisiert." };
    }

    return { success: true, message: "Einsatz erfolgreich aktualisiert." };
  } catch (error: any) {
    console.error("[UPDATE-SHIFT] Error:", error);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// ============================================================================
// SIMPLE SHIFT REASSIGN (Direct shift update - no complex overrides)
// ============================================================================

export async function simpleReassignShift(params: {
  shiftId: string;
  newEmployeeId?: string;
  newDate?: string;
  newStartTime?: string;
  newEndTime?: string;
}): Promise<{ success: boolean; message: string }> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { shiftId, newEmployeeId, newDate, newStartTime, newEndTime } = params;

  try {
    console.log("[SIMPLE-REASSIGN] Starting reassignment:", { shiftId, newEmployeeId, newDate });

    // Get current shift with employees
    const { data: shift, error: fetchError } = await supabaseAdmin
      .from("shifts")
      .select(`
        *,
        shift_employees!inner (*)
      `)
      .eq("id", shiftId)
      .single();

    if (fetchError || !shift) {
      console.error("[SIMPLE-REASSIGN] Shift not found:", fetchError);
      throw new Error("Einsatz nicht gefunden.");
    }

    console.log("[SIMPLE-REASSIGN] Current shift:", {
      id: shift.id,
      shift_date: shift.shift_date,
      employee_id: shift.shift_employees?.[0]?.employee_id,
    });

    // Build update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Update date if provided
    if (newDate && newDate !== shift.shift_date) {
      updateData.shift_date = newDate;
      console.log("[SIMPLE-REASSIGN] Updating date from", shift.shift_date, "to", newDate);
    }

    // Update times if provided
    if (newStartTime) {
      updateData.start_time = newStartTime;
    }
    if (newEndTime) {
      updateData.end_time = newEndTime;
    }

    // Update shift
    const { error: updateError } = await supabaseAdmin
      .from("shifts")
      .update(updateData)
      .eq("id", shiftId);

    if (updateError) {
      console.error("[SIMPLE-REASSIGN] Update error:", updateError);
      throw updateError;
    }

    console.log("[SIMPLE-REASSIGN] Shift updated successfully");

    // Update employee assignment if new employee provided
    if (newEmployeeId) {
      const currentEmployeeId = shift.shift_employees?.[0]?.employee_id;
      console.log("[SIMPLE-REASSIGN] Employee check:", { currentEmployeeId, newEmployeeId, isDifferent: newEmployeeId !== currentEmployeeId });

      if (newEmployeeId !== currentEmployeeId) {
        console.log("[SIMPLE-REASSIGN] Changing employee from", currentEmployeeId, "to", newEmployeeId);

        // Remove old assignment
        if (currentEmployeeId) {
          console.log("[SIMPLE-REASSIGN] Deleting old shift_employees entry...");
          const { error: deleteEmpError } = await supabaseAdmin
            .from("shift_employees")
            .delete()
            .eq("shift_id", shiftId)
            .eq("employee_id", currentEmployeeId);

          if (deleteEmpError) {
            console.error("[SIMPLE-REASSIGN] Error deleting shift_employees:", deleteEmpError);
          } else {
            console.log("[SIMPLE-REASSIGN] Old shift_employees deleted successfully");
          }
        }

        // Add new assignment
        console.log("[SIMPLE-REASSIGN] Inserting new shift_employees entry...", { shiftId, newEmployeeId });
        const { error: insertEmpError } = await supabaseAdmin
          .from("shift_employees")
          .insert({
            shift_id: shiftId,
            employee_id: newEmployeeId,
            role: "worker",
          });

        if (insertEmpError) {
          console.error("[SIMPLE-REASSIGN] Error inserting shift_employees:", insertEmpError);
          throw insertEmpError;
        } else {
          console.log("[SIMPLE-REASSIGN] New shift_employees inserted successfully");
        }

        // Send notification to new employee
        const { data: newEmp } = await supabaseAdmin
          .from("employees")
          .select("user_id, first_name, last_name")
          .eq("id", newEmployeeId)
          .single();

        if (newEmp?.user_id) {
          await sendNotification({
            userId: newEmp.user_id,
            title: "Einsatz zugewiesen",
            message: `Ihnen wurde ein Einsatz am ${newDate || shift.shift_date} zugewiesen.`,
            link: "/dashboard/planning",
          });
        }
      }
    }

    revalidatePath("/dashboard/planning");
    return { success: true, message: "Einsatz erfolgreich verschoben." };
  } catch (error: any) {
    console.error("[SIMPLE-REASSIGN] Error:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// ============================================================================
// ADD EMPLOYEE TO SHIFT (For team mode - adds without replacing)
// ============================================================================

export async function addEmployeeToShift(params: {
  shiftId: string;
  employeeId: string;
}): Promise<{ success: boolean; message: string }> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { shiftId, employeeId } = params;

  try {
    console.log("[ADD-EMPLOYEE] Adding employee to shift:", { shiftId, employeeId });

    // Check if employee is already assigned
    const { data: existing, error: checkError } = await supabaseAdmin
      .from("shift_employees")
      .select("id")
      .eq("shift_id", shiftId)
      .eq("employee_id", employeeId)
      .single();

    if (existing) {
      console.log("[ADD-EMPLOYEE] Employee already assigned to this shift");
      return { success: true, message: "Mitarbeiter ist bereits zugewiesen." };
    }

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    // Get shift details for notification and time_entry cleanup
    const { data: shift } = await supabaseAdmin
      .from("shifts")
      .select("shift_date, job_title, assignment_id, order_id")
      .eq("id", shiftId)
      .single();

    // Clean up any orphaned time_entry first (if removal didn't happen properly)
    if (shift?.assignment_id && shift?.shift_date && shift?.order_id) {
      const shiftDate = new Date(shift.shift_date);
      await supabaseAdmin
        .from("time_entries")
        .delete()
        .eq("employee_id", employeeId)
        .eq("order_id", shift.order_id)
        .eq("date", shiftDate.toISOString().split('T')[0])
        .eq("type", "shift");
    }

    // Add new assignment
    console.log("[ADD-EMPLOYEE] Inserting new shift_employees entry...");
    const { error: insertEmpError } = await supabaseAdmin
      .from("shift_employees")
      .insert({
        shift_id: shiftId,
        employee_id: employeeId,
        role: "worker",
      });

    if (insertEmpError) {
      console.error("[ADD-EMPLOYEE] Error inserting shift_employees:", insertEmpError);
      throw insertEmpError;
    }

    console.log("[ADD-EMPLOYEE] New shift_employees inserted successfully");

    // Check if shift is completed and generate time entry for this employee
    const { data: shiftStatus } = await supabaseAdmin
      .from("shifts")
      .select("status, start_time, end_time, estimated_hours, travel_time_minutes, break_time_minutes, shift_date, order_id")
      .eq("id", shiftId)
      .single();

    if (shiftStatus?.status === "completed") {
      console.log("[ADD-EMPLOYEE] Shift is completed, creating time entry for new employee");
      // Get employee details for time entry
      const { data: empData } = await supabaseAdmin
        .from("employees")
        .select("id, first_name, last_name")
        .eq("id", employeeId)
        .single();

      if (empData && shiftStatus) {
        await supabaseAdmin.from("time_entries").insert({
          employee_id: employeeId,
          order_id: shiftStatus.order_id,
          shift_id: shiftId,
          date: shiftStatus.shift_date,
          start_time: shiftStatus.start_time,
          end_time: shiftStatus.end_time,
          hours: shiftStatus.estimated_hours,
          travel_time_minutes: shiftStatus.travel_time_minutes,
          break_time_minutes: shiftStatus.break_time_minutes,
          type: "shift",
          description: `${empData.first_name} ${empData.last_name}`,
          created_at: new Date().toISOString(),
        });
      }
    }

    // Send notification to new employee
    const { data: newEmp } = await supabaseAdmin
      .from("employees")
      .select("user_id, first_name, last_name")
      .eq("id", employeeId)
      .single();

    if (newEmp?.user_id) {
      await sendNotification({
        userId: newEmp.user_id,
        title: "Einsatz zugewiesen",
        message: `Ihnen wurde ein Einsatz am ${shift?.shift_date} zugewiesen.`,
        link: "/dashboard/planning",
      });
    }

    revalidatePath("/dashboard/planning");
    return { success: true, message: "Mitarbeiter zum Einsatz hinzugefügt." };
  } catch (error: any) {
    console.error("[ADD-EMPLOYEE] Error:", error);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// ============================================================================
// REMOVE EMPLOYEE FROM SHIFT (For team mode)
// ============================================================================

export async function removeEmployeeFromShift(params: {
  shiftId: string;
  employeeId: string;
}): Promise<{ success: boolean; message: string }> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { shiftId, employeeId } = params;

  try {
    console.log("[REMOVE-EMPLOYEE] Removing employee from shift:", { shiftId, employeeId });

    // Get shift details for time_entry deletion
    const { data: shift } = await supabaseAdmin
      .from("shifts")
      .select("assignment_id, shift_date, order_id")
      .eq("id", shiftId)
      .single();

    if (shift?.assignment_id && shift?.shift_date && shift?.order_id) {
      // Delete orphaned time_entry for this employee/order/date
      const shiftDate = new Date(shift.shift_date);
      await supabaseAdmin
        .from("time_entries")
        .delete()
        .eq("employee_id", employeeId)
        .eq("order_id", shift.order_id)
        .eq("date", shiftDate.toISOString().split('T')[0])
        .eq("type", "shift");
    }

    // Delete assignment
    const { error: deleteError } = await supabaseAdmin
      .from("shift_employees")
      .delete()
      .eq("shift_id", shiftId)
      .eq("employee_id", employeeId);

    if (deleteError) {
      console.error("[REMOVE-EMPLOYEE] Error deleting shift_employees:", deleteError);
      throw deleteError;
    }

    console.log("[REMOVE-EMPLOYEE] Employee removed successfully");

    revalidatePath("/dashboard/planning");
    return { success: true, message: "Mitarbeiter vom Einsatz entfernt." };
  } catch (error: any) {
    console.error("[REMOVE-EMPLOYEE] Error:", error);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// ============================================================================
// SIMPLE SHIFT MOVE (Move shift date only within same employee)
// ============================================================================

export async function simpleMoveShiftDate(params: {
  shiftId: string;
  newDate: string;
}): Promise<{ success: boolean; message: string }> {
  return simpleReassignShift({
    shiftId: params.shiftId,
    newDate: params.newDate,
  });
}

// ============================================================================
// COPY SHIFT (Create a copy of a shift at a new employee/date)
// ============================================================================

export async function copyShift(params: {
  sourceShiftId: string;
  newEmployeeId: string;
  newDate: string;
  newStartTime?: string;
  newEndTime?: string;
}): Promise<{ success: boolean; message: string }> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  try {
    // Get the source shift with all details
    const { data: sourceShift, error: fetchError } = await supabaseAdmin
      .from("shifts")
      .select(`
        *,
        shift_employees!inner (*),
        order_employee_assignments!inner (
          id,
          order_id,
          assigned_daily_schedules
        )
      `)
      .eq("id", params.sourceShiftId)
      .single();

    if (fetchError || !sourceShift) {
      throw new Error("Quell-Einsatz nicht gefunden.");
    }

    // Create a copy of the shift (without is_manual since column may not exist)
    const { data: newShift, error: createError } = await supabaseAdmin
      .from("shifts")
      .insert({
        assignment_id: sourceShift.assignment_id,
        shift_date: params.newDate,
        start_time: params.newStartTime || sourceShift.start_time,
        end_time: params.newEndTime || sourceShift.end_time,
        estimated_hours: sourceShift.estimated_hours,
        status: sourceShift.status,
        notes: sourceShift.notes,
        is_detached_from_series: true,
        created_at: new Date().toISOString(),
      })
      .select("id, assignment_id, shift_date")
      .single();

    if (createError) {
      throw createError;
    }

    // Add the new employee to the shift
    await supabaseAdmin.from("shift_employees").insert({
      shift_id: newShift.id,
      employee_id: params.newEmployeeId,
      role: "worker",
      is_confirmed: false,
    });

    // Send notification to the new employee
    const { data: newEmp } = await supabaseAdmin
      .from("employees")
      .select("user_id, first_name, last_name")
      .eq("id", params.newEmployeeId)
      .single();

    if (newEmp?.user_id) {
      await sendNotification({
        userId: newEmp.user_id,
        title: "Einsatz kopiert",
        message: `Ihnen wurde ein Einsatz am ${params.newDate} zugewiesen (kopiert).`,
        link: "/dashboard/planning",
      });
    }

    // Note: Time entries are automatically created by the database trigger trg_shift_completed_time_entry
    // when a shift is created/updated with status='completed', so no manual generation needed here

    revalidatePath("/dashboard/planning");
    return { success: true, message: "Einsatz erfolgreich kopiert." };
  } catch (error: any) {
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// ============================================================================
// ENSURE SHIFT-TIME ENTRY 1:1 RELATIONSHIP
// Ensures all completed shifts have corresponding time entries.
// This function is idempotent and safe to call multiple times.
// ============================================================================

export async function ensureShiftTimeEntriesSync(): Promise<{
  success: boolean;
  message: string;
  shifts_completed: number;
  time_entries_created: number;
}> {
  const supabaseAdmin = createAdminClient();

  try {
    const now = new Date();

    // Step 1: Mark overdue shifts as completed - OPTIMIZED with batch UPDATE
    // Get current date in LOCAL timezone (Germany/Europe)
    // This is important because shift_date is stored in local date, not UTC
    const localYear = now.getFullYear();
    const localMonth = now.getMonth();
    const localDay = now.getDate();

    // Create today's date at midnight LOCAL time
    const todayLocal = new Date(localYear, localMonth, localDay);
    const todayLocalStr = formatISO(todayLocal, { representation: "date" });

    const { data: shiftsToUpdate, error: fetchError } = await supabaseAdmin
      .from("shifts")
      .select("id, shift_date, start_time, end_time, status")
      .in("status", ["scheduled", "in_progress"]);

    if (fetchError) throw fetchError;

    // Collect all shift IDs that should be marked as completed
    const shiftIdsToComplete: string[] = [];

    for (const shift of shiftsToUpdate || []) {
      const shiftDateStr = shift.shift_date;
      let shouldBeCompleted = false;

      // Compare dates as strings (shift_date is stored in local date)
      // If shift date is BEFORE today (local date), it should be completed
      if (shiftDateStr < todayLocalStr) {
        shouldBeCompleted = true;
      } else if (shiftDateStr === todayLocalStr && shift.end_time) {
        // For today's shifts, compare the actual end time with current time
        // Parse shift end time (HH:mm format)
        const [endHour, endMinute] = shift.end_time.split(':').map(Number);
        // Create a date object for the shift end time in LOCAL timezone
        const shiftEndLocal = new Date(localYear, localMonth, localDay, endHour, endMinute, 0);

        // Current time is already in local timezone (because we used getFullYear/getMonth/getDate)
        // Add 5 minute buffer - shift should be completed 5 min after end time
        const comparisonTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 min ago

        if (comparisonTime >= shiftEndLocal) {
          shouldBeCompleted = true;
        }
      }

      if (shouldBeCompleted) {
        shiftIdsToComplete.push(shift.id);
      }
    }

    // Batch UPDATE all shifts at once using .in() clause instead of N+1 individual updates
    let shiftsCompleted = 0;
    let newlyCompletedShiftIds: string[] = [];
    if (shiftIdsToComplete.length > 0) {
      const { data: updatedShifts, error: updateError } = await supabaseAdmin
        .from("shifts")
        .update({
          status: "completed",
          completed_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .in("id", shiftIdsToComplete)
        .select("id");

      if (!updateError && updatedShifts) {
        shiftsCompleted = updatedShifts.length;
        newlyCompletedShiftIds = updatedShifts.map(s => s.id);
      }
    }

    // ============================================================================
    // STEP 2: FIND SHIFTS MISSING TIME ENTRIES
    // ============================================================================

    // Get ALL completed shifts
    const { data: allCompletedShifts, error: completedError } = await supabaseAdmin
      .from("shifts")
      .select("id, shift_date")
      .eq("status", "completed")
      .order("shift_date", { ascending: false });

    if (completedError) throw completedError;

    // Get ALL time_entries that reference a shift
    const { data: existingEntries, error: entriesError } = await supabaseAdmin
      .from("time_entries")
      .select("shift_id")
      .eq("type", "shift")
      .not("shift_id", "is", null);

    if (entriesError) throw entriesError;

    // Build set of shift IDs that have entries
    const existingShiftIds = new Set(existingEntries?.map(e => e.shift_id) || []);

    // Find shifts WITHOUT entries
    const shiftsMissingEntries = (allCompletedShifts || [])
      .filter(s => !existingShiftIds.has(s.id))
      .map(s => s.id);

    // Step 3: Generate time entries for shifts that don't have any
    let timeEntriesCreated = 0;
    const { generateTimeEntriesForShift } = await import("@/app/dashboard/time-tracking/actions");

    for (const shiftId of shiftsMissingEntries) {
      const result = await generateTimeEntriesForShift(shiftId);
      if (result.success && result.created > 0) {
        timeEntriesCreated += result.created;
      }
    }

    revalidatePath("/dashboard/planning");
    revalidatePath("/dashboard/time-tracking");
    revalidatePath("/dashboard/reports");

    const result = {
      success: true,
      message: `${shiftsCompleted} Einsätze abgeschlossen, ${timeEntriesCreated} Zeiteinträge erstellt.`,
      shifts_completed: shiftsCompleted,
      time_entries_created: timeEntriesCreated,
    };

    return result;
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
      shifts_completed: 0,
      time_entries_created: 0,
    };
  }
}

// ============================================================================
// MARK OVERDUE SHIFTS AS COMPLETED (Legacy - use ensureShiftTimeEntriesSync instead)
// Automatically updates shift status based on current time.
// Database triggers will then create time_entries automatically.
// This should be called periodically (e.g., via cron job or API endpoint)
// ============================================================================

export async function markOverdueShiftsAsCompleted(): Promise<{
  success: boolean;
  message: string;
  updated_count: number;
}> {
  const supabaseAdmin = createAdminClient();

  try {
    const now = new Date();
    const today = startOfDay(now);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    // Get all scheduled/in_progress shifts that should be marked as completed
    // A shift is overdue if:
    // 1. The date is in the past (before today), OR
    // 2. The date is today AND the end_time has passed
    const { data: shiftsToUpdate, error: fetchError } = await supabaseAdmin
      .from("shifts")
      .select("id, shift_date, start_time, end_time, status")
      .in("status", ["scheduled", "in_progress"]);

    if (fetchError) {
      throw fetchError;
    }

    const nowDateStr = formatISO(today, { representation: "date" });
    const shiftIdsToComplete: string[] = [];

    // Collect all shift IDs that should be marked as completed
    for (const shift of shiftsToUpdate || []) {
      const shiftDateStr = shift.shift_date;

      let shouldBeCompleted = false;

      if (shiftDateStr < nowDateStr) {
        // Date is in the past
        shouldBeCompleted = true;
      } else if (shiftDateStr === nowDateStr && shift.end_time) {
        // Same date - check if end_time has passed
        const [endHour, endMin] = shift.end_time.split(":").map(Number);
        const endTimeMinutes = endHour * 60 + endMin;

        if (currentTimeMinutes >= endTimeMinutes) {
          shouldBeCompleted = true;
        }
      }

      if (shouldBeCompleted) {
        shiftIdsToComplete.push(shift.id);
      }
    }

    // Batch UPDATE all shifts at once using .in() clause instead of N+1 individual updates
    let updatedCount = 0;
    let completedShiftIds: string[] = [];
    if (shiftIdsToComplete.length > 0) {
      const { data: updatedShifts, error: updateError } = await supabaseAdmin
        .from("shifts")
        .update({
          status: "completed",
          completed_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .in("id", shiftIdsToComplete)
        .select("id");

      if (!updateError && updatedShifts) {
        updatedCount = updatedShifts.length;
        completedShiftIds = updatedShifts.map(s => s.id);
      }
    }

    // Generate time entries for completed shifts
    // Note: The database triggers don't exist, so we need to create entries manually
    let timeEntriesCreated = 0;
    if (completedShiftIds.length > 0) {
      const { generateTimeEntriesForShift } = await import("@/app/dashboard/time-tracking/actions");
      for (const shiftId of completedShiftIds) {
        const result = await generateTimeEntriesForShift(shiftId);
        if (result.success) {
          timeEntriesCreated += result.created;
        }
      }
    }

    revalidatePath("/dashboard/planning");
    revalidatePath("/dashboard/time-tracking");

    return {
      success: true,
      message: `${updatedCount} überfällige Einsätze wurden auf "abgeschlossen" gesetzt. ${timeEntriesCreated} Zeiteinträge erstellt.`,
      updated_count: updatedCount,
    };
  } catch (error: any) {
    return { success: false, message: error.message, updated_count: 0 };
  }
}

export interface CreateShiftParams {
  order_id: string;
  employee_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  estimated_hours: number;
  travel_time_minutes?: number;
  break_time_minutes?: number;
  is_team?: boolean;
  team_employee_ids?: string[];
  notes?: string;
}

export async function createShift(
  params: CreateShiftParams
): Promise<{ success: boolean; message: string; shift_id?: string }> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  try {
    // Get the order to verify it exists and get related info
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, title, service_type, object_id, customer_id")
      .eq("id", params.order_id)
      .single();

    if (orderError || !order) {
      return { success: false, message: "Auftrag nicht gefunden." };
    }

    // Check if assignment exists, create if not
    let assignmentId: string | null = null;
    const { data: existingAssignment } = await supabaseAdmin
      .from("order_employee_assignments")
      .select("id")
      .eq("order_id", params.order_id)
      .eq("employee_id", params.employee_id)
      .maybeSingle();

    if (existingAssignment) {
      assignmentId = existingAssignment.id;
    } else {
      // Create new assignment
      const { data: newAssignment, error: assignmentError } = await supabaseAdmin
        .from("order_employee_assignments")
        .insert({
          order_id: params.order_id,
          employee_id: params.employee_id,
          assigned_daily_schedules: [],
          assigned_recurrence_interval_weeks: 1,
          assigned_start_week_offset: 0,
        })
        .select("id")
        .single();

      if (assignmentError) {
        console.error("[CREATE-SHIFT] Error creating assignment:", assignmentError);
      } else {
        assignmentId = newAssignment.id;
      }
    }

    // Create the shift - extend end_time by break duration
    const breakMinutes = params.break_time_minutes || 0;
    const [startHour, startMin] = params.start_time.split(':').map(Number);
    const [endHour, endMin] = params.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    let totalEndMinutes = endHour * 60 + endMin + breakMinutes;
    let durationMinutes = totalEndMinutes - startMinutes;
    if (durationMinutes < 0) durationMinutes += 24 * 60;

    const adjustedEndHour = Math.floor(totalEndMinutes / 60) % 24;
    const adjustedEndMin = totalEndMinutes % 60;
    const adjustedEndTime = `${String(adjustedEndHour).padStart(2, '0')}:${String(adjustedEndMin).padStart(2, '0')}`;

    const { data: newShift, error: shiftError } = await supabaseAdmin
      .from("shifts")
      .insert({
        assignment_id: assignmentId,
        shift_date: params.shift_date,
        start_time: params.start_time,
        end_time: adjustedEndTime,
        estimated_hours: params.estimated_hours,
        travel_time_minutes: params.travel_time_minutes || 0,
        break_time_minutes: breakMinutes,
        status: "scheduled",
        notes: params.notes,
        order_id: params.order_id,
      })
      .select("id")
      .single();

    if (shiftError) {
      console.error("[CREATE-SHIFT] Error creating shift:", shiftError);
      return { success: false, message: `Fehler beim Erstellen: ${shiftError.message}` };
    }

    // Add the main employee
    const { error: mainEmpError } = await supabaseAdmin.from("shift_employees").insert({
      shift_id: newShift.id,
      employee_id: params.employee_id,
      role: "worker",
      is_confirmed: false,
    });

    if (mainEmpError) {
      console.error("[CREATE-SHIFT] Error adding main employee:", mainEmpError);
    }

    // Add team members if this is a team shift
    if (params.is_team && params.team_employee_ids) {
      for (const teamMemberId of params.team_employee_ids) {
        if (teamMemberId !== params.employee_id) {
          const { error: teamError } = await supabaseAdmin.from("shift_employees").insert({
            shift_id: newShift.id,
            employee_id: teamMemberId,
            role: "worker",
            is_confirmed: false,
          });
          if (teamError) {
            console.error("[CREATE-SHIFT] Error adding team member:", teamError);
          }
        }
      }
    }

    // Create time entry if shift date is in the past
    const shiftDate = parseISO(params.shift_date);
    const today = startOfDay(new Date());
    const shiftStart = startOfDay(shiftDate);
    const isPast = isBefore(shiftStart, today);

    if (isPast) {
      // Get employee user_id
      const { data: empData } = await supabaseAdmin
        .from("employees")
        .select("user_id")
        .eq("id", params.employee_id)
        .single();

      // Calculate start and end timestamps (using the already adjusted times)
      const startDateTime = new Date(shiftDate);
      startDateTime.setHours(startHour, startMin, 0, 0);
      const endDateTime = new Date(shiftDate);
      endDateTime.setHours(adjustedEndHour, adjustedEndMin, 0, 0);
      if (totalEndMinutes < startMinutes) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      await supabaseAdmin.from("time_entries").insert({
        user_id: user.id,
        employee_id: params.employee_id,
        customer_id: order.customer_id,
        object_id: order.object_id,
        order_id: params.order_id,
        shift_id: newShift.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        duration_minutes: durationMinutes,
        type: "shift",
        break_minutes: breakMinutes,
        notes: params.notes,
      });
    }

    // Send notification to the employee
    const { data: empData } = await supabaseAdmin
      .from("employees")
      .select("user_id, first_name, last_name")
      .eq("id", params.employee_id)
      .single();

    if (empData?.user_id) {
      await sendNotification({
        userId: empData.user_id,
        title: "Neuer Einsatz",
        message: `Ihnen wurde ein Einsatz am ${params.shift_date} zugewiesen.`,
        link: "/dashboard/planning",
      });
    }

    revalidatePath("/dashboard/planning");
    return { success: true, message: "Einsatz erfolgreich erstellt.", shift_id: newShift.id };
  } catch (error: any) {
    console.error("[CREATE-SHIFT] Error:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

export interface CreateShiftWithScheduleParams {
  order_id: string;
  employee_ids: string[];
  object_id: string;
  schedules: { [key: string]: { hours: number; start: string; end: string } };
  shift_type: 'single' | 'recurring';
  shift_date?: string;           // For single shifts
  recurring_weekdays?: number[]; // 0-6 for recurring (0=Sun, 6=Sat)
  recurring_end_date?: string;   // For recurring
  travel_time_minutes?: number;
  break_time_minutes?: number;
  notes?: string;
}

export async function createShiftWithSchedule(
  params: CreateShiftWithScheduleParams
): Promise<{ success: boolean; message: string; created_shift_ids?: string[] }> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  try {
    // Verify order exists
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, title")
      .eq("id", params.order_id)
      .single();

    if (orderError || !order) {
      return { success: false, message: "Auftrag nicht gefunden." };
    }

    // Calculate dates to create shifts for
    const datesToCreate: string[] = [];

    if (params.shift_type === 'recurring' && params.recurring_weekdays && params.recurring_end_date) {
      const start = parseISO(params.shift_date!);
      const end = parseISO(params.recurring_end_date);
      const allDates = eachDayOfInterval({ start, end });

      for (const date of allDates) {
        const dayOfWeek = getDay(date);
        if (params.recurring_weekdays.includes(dayOfWeek)) {
          datesToCreate.push(format(date, "yyyy-MM-dd"));
        }
      }
    } else if (params.shift_date) {
      // Single shift
      datesToCreate.push(params.shift_date);
    }

    if (datesToCreate.length === 0) {
      return { success: false, message: "Keine Daten zum Erstellen von Einsätzen." };
    }

    console.log("[CREATE-SCHEDULE] params.schedules:", JSON.stringify(params.schedules));
    console.log("[CREATE-SCHEDULE] params.schedules keys:", Object.keys(params.schedules));

    // Build daily schedules for order_employee_assignments
    // params.schedules uses day names as keys (monday, tuesday, etc.)
    const weeklySchedule: { [key: string]: { hours: number; start: string; end: string } } = {};
    Object.entries(params.schedules).forEach(([dayName, schedule]) => {
      console.log(`[CREATE-SCHEDULE] processing day: ${dayName}, schedule:`, schedule);
      if (schedule.hours > 0) {
        weeklySchedule[dayName] = schedule;
      }
    });

    const assigned_daily_schedules = [weeklySchedule];

    // Delete existing assignments for this order
    await supabaseAdmin
      .from('order_employee_assignments')
      .delete()
      .eq('order_id', params.order_id);

    // Create new assignments for all employees with the same schedule
    if (params.employee_ids.length > 0) {
      const newAssignments = params.employee_ids.map(employeeId => ({
        order_id: params.order_id,
        employee_id: employeeId,
        assigned_daily_schedules,
        assigned_recurrence_interval_weeks: 1,
        assigned_start_week_offset: 0,
      }));
      await supabaseAdmin.from('order_employee_assignments').insert(newAssignments);
    }

    // Create shifts for each employee and date
    const createdShiftIds: string[] = [];

    // Map day of week number to day name
    const dayIndexToName: { [key: number]: string } = {
      0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
      4: 'thursday', 5: 'friday', 6: 'saturday'
    };

    for (const employeeId of params.employee_ids) {
      // Get employee user_id for notification
      const { data: empData } = await supabaseAdmin
        .from("employees")
        .select("user_id, first_name, last_name")
        .eq("id", employeeId)
        .single();

      for (const date of datesToCreate) {
        // Determine times for this date using day name as key
        const dayOfWeek = getDay(parseISO(date));
        const dayName = dayIndexToName[dayOfWeek];
        console.log(`[CREATE-SCHEDULE] date: ${date}, dayOfWeek: ${dayOfWeek}, dayName: ${dayName}`);
        console.log(`[CREATE-SCHEDULE] looking for schedule with key "${dayName}"`);
        console.log(`[CREATE-SCHEDULE] params.schedules[dayName]:`, params.schedules[dayName]);
        const daySchedule = params.schedules[dayName] || { hours: 8, start: "08:00", end: "17:00" };
        console.log(`[CREATE-SCHEDULE] daySchedule used:`, daySchedule);

        // Extend end_time by break duration
        const breakMinutes = params.break_time_minutes || 0;
        const [startHour, startMin] = daySchedule.start.split(':').map(Number);
        const [endHour, endMin] = daySchedule.end.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        let totalEndMinutes = endHour * 60 + endMin + breakMinutes;
        let durationMinutes = totalEndMinutes - startMinutes;
        if (durationMinutes < 0) durationMinutes += 24 * 60;

        const adjustedEndHour = Math.floor(totalEndMinutes / 60) % 24;
        const adjustedEndMin = totalEndMinutes % 60;
        const adjustedEndTime = `${String(adjustedEndHour).padStart(2, '0')}:${String(adjustedEndMin).padStart(2, '0')}`;

        const { data: newShift, error: shiftError } = await supabaseAdmin
          .from("shifts")
          .insert({
            assignment_id: null,
            shift_date: date,
            start_time: daySchedule.start,
            end_time: adjustedEndTime,
            estimated_hours: daySchedule.hours,
            travel_time_minutes: params.travel_time_minutes || 0,
            break_time_minutes: breakMinutes,
            status: "scheduled",
            notes: params.notes,
            order_id: params.order_id,
          })
          .select("id")
          .single();

        if (shiftError) {
          console.error("[CREATE-SHIFT-SCHEDULE] Error creating shift:", shiftError);
          continue;
        }

        createdShiftIds.push(newShift.id);

        // Add employee to shift
        const { error: empError } = await supabaseAdmin.from("shift_employees").insert({
          shift_id: newShift.id,
          employee_id: employeeId,
          role: "worker",
          is_confirmed: false,
        });

        if (empError) {
          console.error("[CREATE-SHIFT-SCHEDULE] Error adding employee to shift:", empError);
        }

        // Create time entry if shift date is in the past
        const shiftDate = parseISO(date);
        const today = startOfDay(new Date());
        const shiftStart = startOfDay(shiftDate);
        const isPast = isBefore(shiftStart, today);

        if (isPast) {
          // Get order info
          const { data: orderInfo } = await supabaseAdmin
            .from("orders")
            .select("customer_id, object_id")
            .eq("id", params.order_id)
            .single();

          // Calculate start and end timestamps (using the already adjusted times)
          const startDateTime = new Date(shiftDate);
          startDateTime.setHours(startHour, startMin, 0, 0);
          const endDateTime = new Date(shiftDate);
          endDateTime.setHours(adjustedEndHour, adjustedEndMin, 0, 0);
          if (totalEndMinutes < startMinutes) {
            endDateTime.setDate(endDateTime.getDate() + 1);
          }

          await supabaseAdmin.from("time_entries").insert({
            user_id: user.id,
            employee_id: employeeId,
            customer_id: orderInfo?.customer_id,
            object_id: orderInfo?.object_id,
            order_id: params.order_id,
            shift_id: newShift.id,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            duration_minutes: durationMinutes,
            type: "shift",
            break_minutes: breakMinutes,
            notes: params.notes,
          });
        }

        // Send notification to employee
        if (empData?.user_id) {
          await sendNotification({
            userId: empData.user_id,
            title: "Neuer Einsatz",
            message: `Ihnen wurde ein Einsatz am ${date} zugewiesen.`,
            link: "/dashboard/planning",
          });
        }
      }
    }

    revalidatePath("/dashboard/planning");
    return {
      success: true,
      message: `${createdShiftIds.length} Einsatz/Einsätze erfolgreich erstellt.`,
      created_shift_ids: createdShiftIds
    };
  } catch (error: any) {
    console.error("[CREATE-SHIFT-SCHEDULE] Error:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

/**
 * Generate shifts from order employee assignments for current and next month.
 * Calls the PostgreSQL RPC function generate_shifts_from_assignments().
 */
export async function generateShiftsFromAssignments(): Promise<{ success: boolean; message: string; created_count?: number }> {
  const supabaseAdmin = createAdminClient();

  try {
    // Before calling RPC, sanitize existing assignments to prevent PostgreSQL errors
    await sanitizeExistingAssignments(supabaseAdmin);
    const { data, error } = await supabaseAdmin.rpc("generate_shifts_from_assignments");

    if (error) {
      console.error("[GENERATE-SHIFTS] RPC Error:", error);
      return { success: false, message: `Fehler beim Generieren der Einsätze: ${error.message}` };
    }

    const result = Array.isArray(data) ? data[0] : data;
    const createdCount = result?.created_count ?? 0;

    revalidatePath("/dashboard/planning");

    return {
      success: true,
      message: result?.message || `${createdCount} Einsatz/Einsätze erfolgreich erstellt.`,
      created_count: createdCount
    };

  } catch (error: any) {
    console.error("[GENERATE-SHIFTS] Error:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}
