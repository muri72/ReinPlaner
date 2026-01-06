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
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show";
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
  filters: { query?: string; filters?: PlanningFilters },
  forceRefresh: boolean = false
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

    // Get avatars
    const userIds = employees
      .map((e) => e.user_id)
      .filter((id): id is string => id !== null);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, avatar_url")
      .in("id", userIds);

    const profilesMap = new Map(profiles?.map((p) => [p.id, p.avatar_url]) || []);

    // Fetch services for colors
    const { data: services } = await supabase
      .from("services")
      .select("key, title, color");

    const servicesMap = new Map(
      (services || []).map((s: any) => [s.key, s.color])
    );
    const servicesByTitle = new Map(
      (services || []).map((s: any) => [s.title?.toLowerCase(), s.color])
    );

    // 2. Fetch absences
    const { data: absences } = await supabase
      .from("absence_requests")
      .select("employee_id, start_date, end_date, type")
      .eq("status", "approved")
      .lte("start_date", endDateIso)
      .gte("end_date", startDateIso);

    // 3. Fetch existing shifts from DB for this period
    // Use left join to include shifts even if they have no employee assignment yet
    const { data: existingShifts, error: shiftsError } = await supabase
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
      .lte("shift_date", endDateIso);

    if (shiftsError) {
      console.warn("[PLANNING] Error fetching shifts:", shiftsError);
      // Continue without shifts - we'll generate them
    }

    // 4. Fetch assignments for the period
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
      .eq("status", "active");

    if (filters.filters?.objects && filters.filters.objects.length > 0) {
      assignmentsQuery = assignmentsQuery.in("orders.object_id", filters.filters.objects);
    }
    if (filters.filters?.services && filters.filters.services.length > 0) {
      assignmentsQuery = assignmentsQuery.in("orders.service_type", filters.filters.services);
    }

    const { data: assignments, error: assignmentsError } = await assignmentsQuery;
    if (assignmentsError) throw assignmentsError;

    // 5. Build a map of existing shifts by assignment_id and date for fast lookup
    const existingShiftsMap = new Map<string, any>();
    for (const shift of (existingShifts || [])) {
      const key = `${shift.assignment_id}_${shift.shift_date}`;
      existingShiftsMap.set(key, shift);
    }

    // 6. For each assignment, ensure shifts exist in DB for this period
    const shiftsToInsert: any[] = [];
    const assignmentsNeedingShifts: any[] = [];

    for (const assignment of assignments || []) {
      const order = assignment.orders;
      const employee = assignment.employees;

      if (!order || !employee) continue;

      // Check if assignment is valid for this period
      const assignmentStart = assignment.start_date ? parseISO(assignment.start_date) : null;
      const assignmentEnd = assignment.end_date ? parseISO(assignment.end_date) : null;

      // Get the assignment's schedule settings
      const recurrenceInterval = assignment.assigned_recurrence_interval_weeks || 1;
      const startOffset = assignment.assigned_start_week_offset || 0;
      const dailySchedules = assignment.assigned_daily_schedules || [];

      // Calculate reference date
      const referenceDate = assignmentStart || new Date();
      const daysPassed = differenceInDays(startDate, startOfWeek(referenceDate, { weekStartsOn: 1 }));
      const weeksPassed = Math.floor(daysPassed / 7);
      const effectiveWeekIndex = (weeksPassed + startOffset) % recurrenceInterval;
      const weekSchedule = dailySchedules[effectiveWeekIndex];

      // Generate shifts for each day in the display period
      for (const day of weekDays) {
        const dateString = formatISO(day, { representation: "date" });
        const dayOfWeek = getDay(day);
        const dayKey = dayNames[dayOfWeek];

        // Check if day is within assignment validity period
        if (assignmentStart && day < assignmentStart) continue;
        if (assignmentEnd && day > assignmentEnd) continue;

        // Check if shift already exists in DB
        const shiftKey = `${assignment.id}_${dateString}`;
        const existingShift = existingShiftsMap.get(shiftKey);

        if (!existingShift) {
          // Shift doesn't exist - prepare to create it
          const daySchedule = (weekSchedule as any)?.[dayKey];
          if (daySchedule && daySchedule.hours > 0) {
            shiftsToInsert.push({
              assignment_id: assignment.id,
              shift_date: dateString,
              start_time: daySchedule.start || null,
              end_time: daySchedule.end || null,
              estimated_hours: daySchedule.hours,
              status: 'scheduled',
              created_at: new Date().toISOString(),
            });
          }
        }
      }
    }

    // 7. Batch insert missing shifts (ONLY if forceRefresh is true)
    // This allows initial population but prevents re-creating deleted shifts
    if (shiftsToInsert.length > 0 && forceRefresh) {
      console.log("[PLANNING] Creating", shiftsToInsert.length, "new shifts");

      // Insert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < shiftsToInsert.length; i += batchSize) {
        const batch = shiftsToInsert.slice(i, i + batchSize);
        const { data: insertedShifts, error: insertError } = await supabaseAdmin
          .from("shifts")
          .insert(batch)
          .select("id, assignment_id, shift_date, start_time, end_time, estimated_hours");

        if (insertError) {
          console.error("[PLANNING] Error inserting shifts:", insertError);
        } else {
          // Add the new shifts to our map
          for (const shift of (insertedShifts || [])) {
            const shiftKey = `${shift.assignment_id}_${shift.shift_date}`;
            existingShiftsMap.set(shiftKey, shift);

            // Also create shift_employee entry
            const assignment = assignments?.find((a: any) => a.id === shift.assignment_id);
            if (assignment) {
              await supabaseAdmin.from("shift_employees").insert({
                shift_id: shift.id,
                employee_id: assignment.employee_id,
                role: "worker",
                is_confirmed: false,
              });
            }
          }
        }
      }
    } else if (shiftsToInsert.length > 0 && !forceRefresh) {
      console.log("[PLANNING] Skipping", shiftsToInsert.length, "new shifts (use forceRefresh to create)");
    }

    // 8. Build planning data structure
    const planningData: ShiftPlanningData = {};
    const employeeDateShifts: {
      [employeeId: string]: {
        [date: string]: {
          shiftId: string;
          orderId: string;
          orderTitle: string;
          objectName: string;
          objectAddress: string | null;
          serviceType: string;
          startTime: string | null;
          endTime: string | null;
          hours: number;
          assignmentId: string;
        }[];
      };
    } = {};

    // Re-build employeeDateShifts with all shifts (existing + newly created)
    // IMPORTANT: Use shift_employees to get the CURRENT employee assignment, not the assignment's original employee
    for (const [key, shift] of existingShiftsMap.entries()) {
      const assignment = assignments?.find((a: any) => a.id === shift.assignment_id);
      if (!assignment) continue;

      const order = assignment.orders;
      if (!order) continue;

      // Get the current employees from shift_employees table (this reflects actual assignments after moves)
      // IMPORTANT: Handle MULTIPLE employees per shift - each employee should see the shift
      const shiftEmployees = shift.shift_employees || [];

      if (shiftEmployees.length === 0) {
        console.log("[PLANNING] Shift has no employee assignment:", shift.id);
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
          objectName: (order as any).objects?.name || null,
          objectAddress: (order as any).objects?.address || null,
          serviceType: order.service_type || null,
          startTime: shift.start_time,
          endTime: shift.end_time,
          hours: Number(shift.estimated_hours) || 0,
          assignmentId: shift.assignment_id,
        });
      }
    }
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

        // Check for absence
        const absence = absences?.find(
          (a) =>
            a.employee_id === employee.id &&
            parseISO(a.start_date) <= day &&
            parseISO(a.end_date) >= day
        );

        if (absence) {
          employeeSchedule[dateString].isAbsence = true;
          employeeSchedule[dateString].absenceType = absence.type;
          continue;
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

        // Build a map of all shifts for this order on this date to collect team members
        const allShiftsForOrderOnDate: {
          employeeId: string;
          employeeName: string;
          assignmentId: string;
          orderId: string;
        }[] = [];

        for (const [empId, empDayData] of Object.entries(employeeDateShifts)) {
          for (const [dateStr, shifts] of Object.entries(empDayData)) {
            if (dateStr === dateString) {
              for (const s of shifts) {
                const shiftAssignment = assignments?.find((a: any) => a.id === s.assignmentId);
                if (shiftAssignment) {
                  const empData = employees.find((e: any) => e.id === empId);
                  if (empData) {
                    allShiftsForOrderOnDate.push({
                      employeeId: empId,
                      employeeName: `${empData.first_name} ${empData.last_name}`,
                      assignmentId: s.assignmentId,
                      orderId: shiftAssignment.order_id,
                    });
                  }
                }
              }
            }
          }
        }

        // Remove duplicates based on employeeId
        const uniqueTeamMembers = allShiftsForOrderOnDate.filter((member, index, self) =>
          index === self.findIndex((m) => m.employeeId === member.employeeId)
        );

        for (const shiftData of shiftsForDay) {
          const hours = shiftData.hours;
          totalHoursPlanned += hours;
          employeeSchedule[dateString].totalHours += hours;

          // Check if this is a recurring assignment (has daily schedules defined)
          const assignment = assignments?.find((a: any) => a.id === shiftData.assignmentId);
          const isRecurring = !!(
            assignment &&
            assignment.assigned_daily_schedules &&
            Array.isArray(assignment.assigned_daily_schedules) &&
            assignment.assigned_daily_schedules.length > 0
          );

          // Check if this is a team shift - more than one employee working on same order/date
          // Get the order_id for this shift
          const currentOrderId = assignment?.order_id;
          const teamMembersForThisOrder = uniqueTeamMembers.filter(
            (m) => m.orderId === currentOrderId
          );
          const isTeam = teamMembersForThisOrder.length > 1;

          // Determine status based on date AND time (PlanD style):
          // - Past dates → "completed" (green)
          // - Today and current time within shift time → "in_progress" (yellow)
          // - Today before start time or future dates → "scheduled" (blue)
          const shiftDateObj = parseISO(dateString);
          const now = new Date();
          const today = startOfDay(now);

          let shiftStatus: "scheduled" | "in_progress" | "completed" = "scheduled";

          if (isPast(shiftDateObj)) {
            // Date is in the past
            shiftStatus = "completed";
          } else if (isToday(shiftDateObj)) {
            // Date is today - check the actual time
            if (shiftData.startTime && shiftData.endTime) {
              const [startHour, startMin] = shiftData.startTime.split(":").map(Number);
              const [endHour, endMin] = shiftData.endTime.split(":").map(Number);

              const shiftStart = new Date(now);
              shiftStart.setHours(startHour, startMin, 0, 0);

              const shiftEnd = new Date(now);
              shiftEnd.setHours(endHour, endMin, 0, 0);

              if (isBefore(now, shiftStart)) {
                // Before shift starts
                shiftStatus = "scheduled";
              } else if (isAfter(now, shiftEnd)) {
                // After shift ends
                shiftStatus = "completed";
              } else {
                // During shift
                shiftStatus = "in_progress";
              }
            } else {
              // No time specified, assume in_progress for today
              shiftStatus = "in_progress";
            }
          }
          // Future dates remain "scheduled"

          employeeSchedule[dateString].shifts.push({
            id: shiftData.shiftId,
            shift_date: dateString,
            start_time: shiftData.startTime,
            end_time: shiftData.endTime,
            estimated_hours: hours,
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
            employees: isTeam ? teamMembersForThisOrder.map((member) => ({
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
    // Get shift details
    const { data: shift, error: shiftError } = await supabaseAdmin
      .from("shifts")
      .select("*, job_series ( id ), shift_employees ( employee_id )")
      .eq("id", shiftId)
      .single();

    if (shiftError || !shift) {
      throw new Error("Shift nicht gefunden.");
    }

    const oldEmployeeId = shift.shift_employees?.[0]?.employee_id;
    const isRecurring = !!shift.series_id && !shift.is_detached_from_series;

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

    // For "future" mode, also update future shifts in the series
    if (mode === "future" && shift.series_id) {
      const { data: futureShifts } = await supabaseAdmin
        .from("shifts")
        .select("id, shift_employees ( employee_id )")
        .eq("series_id", shift.series_id)
        .eq("is_detached_from_series", false)
        .gt("shift_date", shift.shift_date);

      for (const futureShift of futureShifts || []) {
        const futureOldEmployeeId = futureShift.shift_employees?.[0]?.employee_id;
        if (futureOldEmployeeId === oldEmployeeId) {
          await supabaseAdmin
            .from("shift_employees")
            .delete()
            .eq("shift_id", futureShift.id)
            .eq("employee_id", futureOldEmployeeId);

          await supabaseAdmin.from("shift_employees").insert({
            shift_id: futureShift.id,
            employee_id: newEmployeeId,
            role: "worker",
          });
        }
      }
    }

    revalidatePath("/dashboard/planning");
    return {
      success: true,
      message:
        mode === "single"
          ? "Einsatz erfolgreich neu zugewiesen."
          : "Alle zukünftigen Einsätze wurden neu zugewiesen.",
    };
  } catch (error: any) {
    console.error("Fehler beim Neuzuweisen:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// ============================================================================
// CREATE JOB WITH SERIES
// ============================================================================

export async function createJobWithSeries(data: {
  title: string;
  object_id: string;
  service_id?: string;
  estimated_hours?: number;
  priority?: string;

  // Series config
  pattern_type: "weekly" | "biweekly" | "monthly" | "custom";
  weekdays: string[];
  daily_schedules: any[];
  interval_weeks?: number;
  start_date: string;
  end_date?: string;

  // Initial employees
  employee_ids?: string[];
}): Promise<{ success: boolean; message: string; job_id?: string }> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  try {
    // Get customer from object
    const { data: objectData } = await supabaseAdmin
      .from("objects")
      .select("customer_id")
      .eq("id", data.object_id)
      .single();

    // 1. Create Job
    const { data: job, error: jobError } = await supabaseAdmin
      .from("jobs")
      .insert({
        user_id: user.id,
        title: data.title,
        object_id: data.object_id,
        customer_id: objectData?.customer_id,
        service_id: data.service_id,
        estimated_hours: data.estimated_hours,
        priority: data.priority || "medium",
        status: "active",
      })
      .select("id")
      .single();

    if (jobError || !job) throw jobError;

    // 2. Create Series
    const { data: series, error: seriesError } = await supabaseAdmin
      .from("job_series")
      .insert({
        job_id: job.id,
        pattern_type: data.pattern_type,
        weekdays: data.weekdays,
        daily_schedules: data.daily_schedules,
        interval_weeks: data.interval_weeks || 1,
        start_date: data.start_date,
        end_date: data.end_date,
        is_active: true,
      })
      .select("id")
      .single();

    if (seriesError) throw seriesError;

    // 3. Call Edge Function to generate initial shifts
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (projectUrl && serviceKey) {
      await fetch(`${projectUrl}/functions/v1/generate-shifts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          series_id: series?.id,
          months_ahead: 3,
        }),
      });
    }

    revalidatePath("/dashboard/planning");
    revalidatePath("/dashboard/orders");

    return {
      success: true,
      message: "Auftrag mit Serie erfolgreich erstellt.",
      job_id: job.id,
    };
  } catch (error: any) {
    console.error("Fehler beim Erstellen:", error.message);
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

    revalidatePath("/dashboard/planning");
    return { success: true, message: "Status erfolgreich aktualisiert." };
  } catch (error: any) {
    return { success: false, message: `Fehler: ${error.message}` };
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

    // First delete related shift_employees entries
    console.log("[DELETE] Deleting shift_employees...");
    const { error: deleteEmployeesError } = await supabaseAdmin
      .from("shift_employees")
      .delete()
      .eq("shift_id", shiftId);

    if (deleteEmployeesError) {
      console.error("[DELETE] Error deleting shift_employees:", deleteEmployeesError);
      throw deleteEmployeesError;
    }

    console.log("[DELETE] shift_employees deleted, now deleting shift...");

    // Then delete the shift itself
    const { error: deleteError } = await supabaseAdmin
      .from("shifts")
      .delete()
      .eq("id", shiftId);

    if (deleteError) {
      console.error("[DELETE] Error deleting shift:", deleteError);
      throw deleteError;
    }

    console.log("[DELETE] Shift deleted successfully");

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
  fromDate?: string
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

    // Build the query to find shifts
    let query = supabaseAdmin
      .from("shifts")
      .select("id, shift_date, status")
      .eq("assignment_id", assignmentId);

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

    for (const shift of shiftsToDelete) {
      // Skip completed shifts in future mode
      if (mode === "future" && (shift.shift_date < today || shift.status === "completed")) {
        console.log("[DELETE-SERIES] Skipping completed shift:", shift.id, shift.shift_date);
        skippedCompleted++;
        continue;
      }

      console.log("[DELETE-SERIES] Deleting shift:", shift.id, shift.shift_date);

      // Delete shift_employees first
      const { error: deleteEmpError } = await supabaseAdmin
        .from("shift_employees")
        .delete()
        .eq("shift_id", shift.id);

      if (deleteEmpError) {
        console.error("[DELETE-SERIES] Error deleting shift_employees:", deleteEmpError);
      }

      // Delete the shift
      const { error: deleteShiftError } = await supabaseAdmin
        .from("shifts")
        .delete()
        .eq("id", shift.id);

      if (deleteShiftError) {
        console.error("[DELETE-SERIES] Error deleting shift:", deleteShiftError);
      } else {
        deletedCount++;
      }
    }

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
          status: updates.status || shiftData.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assignmentId);

      if (updateError) throw updateError;

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

        // Update each shift
        for (const shift of seriesShifts || []) {
          const { error: updateError } = await supabaseAdmin
            .from("shifts")
            .update({
              start_time: updates.start_time || shift.start_time,
              end_time: updates.end_time || shift.end_time,
              estimated_hours: updates.estimated_hours || shift.estimated_hours,
              status: updates.status || shift.status,
              updated_at: new Date().toISOString(),
            })
            .eq("id", shift.id);

          if (updateError) throw updateError;
        }

        // Also update the assignment's start_week_offset and daily_schedules if needed
        // This would require more complex logic - for now we just update individual shifts
      } else {
        // Single shift update - create an override with the new values
        const { data: existingOverride } = await supabaseAdmin
          .from("shift_overrides")
          .select("id")
          .eq("assignment_id", assignmentId)
          .eq("shift_date", shiftDate)
          .is("action", null)
          .single();

        const overrideData = {
          modified_data: {
            start_time: updates.start_time,
            end_time: updates.end_time,
            estimated_hours: updates.estimated_hours,
            status: updates.status,
          },
          notes: updates.status ? `Status geändert auf ${updates.status}` : "Einsatzdaten geändert",
          updated_at: new Date().toISOString(),
        };

        if (existingOverride) {
          const { error: updateError } = await supabaseAdmin
            .from("shift_overrides")
            .update(overrideData)
            .eq("id", existingOverride.id);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabaseAdmin
            .from("shift_overrides")
            .insert({
              assignment_id: assignmentId,
              shift_date: shiftDate,
              action: null, // null means modification
              ...overrideData,
              created_by: user.id,
            });

          if (insertError) throw insertError;
        }
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
          status: updates.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", shiftData.id);

      if (updateError) throw updateError;
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

    // Get shift details for notification
    const { data: shift } = await supabaseAdmin
      .from("shifts")
      .select("shift_date, job_title")
      .eq("id", shiftId)
      .single();

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
    console.log("[COPY-SHIFT] Starting copy:", params);

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
      console.error("[COPY-SHIFT] Source shift not found:", fetchError);
      throw new Error("Quell-Einsatz nicht gefunden.");
    }

    console.log("[COPY-SHIFT] Source shift:", {
      id: sourceShift.id,
      shift_date: sourceShift.shift_date,
      employee_id: sourceShift.shift_employees?.[0]?.employee_id,
    });

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
      console.error("[COPY-SHIFT] Error creating shift:", createError);
      throw createError;
    }

    console.log("[COPY-SHIFT] Created new shift:", newShift.id);

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

    revalidatePath("/dashboard/planning");
    return { success: true, message: "Einsatz erfolgreich kopiert." };
  } catch (error: any) {
    console.error("[COPY-SHIFT] Error:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}
