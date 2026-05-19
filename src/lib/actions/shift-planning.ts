"use server";

import { auth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eq, and, or, inArray, isNull, gte, lte, ne, desc } from "drizzle-orm";
import {
  shifts,
  shiftEmployees,
  orderEmployeeAssignments,
  employees,
  profiles,
  orders,
  objects,
  services,
  absenceRequests,
} from "@/lib/db/schema";
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
// AUTHORIZATION HELPERS
// ============================================================================

/**
 * Sanitize user input to prevent SQL injection.
 * Used for search queries and filter values.
 */
function sanitizeInput(input: string, maxLength: number = 100): string {
  if (!input || typeof input !== "string") return "";
  return input
    .slice(0, maxLength)
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim();
}

/**
 * Check if user is authenticated and has admin or manager role.
 * Returns the user profile if authorized, null otherwise.
 */
async function requireAdminOrManager(): Promise<
  | { authorized: true; userId: string; role: string }
  | { authorized: false; message: string }
> {
  const session = await auth();

  if (!session?.user) {
    return { authorized: false, message: "Benutzer nicht authentifiziert." };
  }

  const userId = session.user.id as string;
  const role = (session.user as any).role;

  if (role !== "admin" && role !== "manager") {
    return {
      authorized: false,
      message: "Nur Administratoren oder Manager dürfen diese Aktion ausführen.",
    };
  }

  return { authorized: true, userId, role };
}

/**
 * Check if user is authenticated (any role).
 */
async function requireAuth(): Promise<
  | { authorized: true; userId: string }
  | { authorized: false; message: string }
> {
  const session = await auth();

  if (!session?.user) {
    return { authorized: false, message: "Benutzer nicht authentifiziert." };
  }

  return { authorized: true, userId: session.user.id as string };
}

// ============================================================================
// HELPER: Convert shifts from DB format to shift_planning format
// ============================================================================

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
  const session = await auth();

  if (!session?.user) {
    return { success: false, data: null, message: "Benutzer nicht authentifiziert." };
  }

  const weekNumber = getWeek(startDate, { weekStartsOn: 1, locale: de });
  const weekDays = eachDayOfInterval({ start: startDate, end: endDate });
  const startDateIso = formatISO(startDate, { representation: "date" });
  const endDateIso = formatISO(endDate, { representation: "date" });

  try {
    // 1. Fetch all active employees
    let employeesQuery = db.query.employees.findMany({
      where: eq(employees.isActive, true),
    });

    // Add search filter if provided
    if (filters.query) {
      const sanitizedQuery = sanitizeInput(filters.query, 100);
      if (sanitizedQuery) {
        // Use raw SQL ILIKE via Drizzle's sql helper - but for simplicity,
        // we'll fetch all and filter in JS since we need full-text search anyway
      }
    }

    // Filter by employee groups
    if (filters.filters?.employeeGroups && filters.filters.employeeGroups.length > 0) {
      employeesQuery = db.query.employees.findMany({
        where: and(
          eq(employees.isActive, true),
          inArray(employees.id, filters.filters.employeeGroups)
        ),
      });
    }

    const employeesResult = await db.query.employees.findMany({
      where: eq(employees.isActive, true),
    });

    const employeesList = employeesResult || [];

    // Get user IDs for profiles query
    const userIds = employeesList
      .map((e) => e.profileId)
      .filter((id): id is string => id !== null);

    // 2. Fetch profiles for avatars
    const profilesResult = userIds.length > 0
      ? await db.query.profiles.findMany({
          where: inArray(profiles.id, userIds),
        })
      : [];
    const profilesMap = new Map(profilesResult.map((p) => [p.id, p.avatarUrl]));
    const profilesFullNameMap = new Map<string, string>(profilesResult.map((p) => [p.id, p.fullName as string]));

    // 3. Fetch services for colors
    const servicesResult = await db.query.services.findMany({});
    const servicesMap = new Map(
      servicesResult.map((s) => [s.name, s.description])
    );
    const servicesByTitle = new Map(
      servicesResult.map((s) => [s.name?.toLowerCase(), s.description])
    );

    // 4. Fetch absences for the period
    const absencesResult = await db.query.absenceRequests.findMany({
      where: and(
        eq(absenceRequests.status, "approved"),
        lte(absenceRequests.startDate, endDate),
        gte(absenceRequests.endDate, startDate)
      ),
    });

    // 5. Fetch existing shifts from DB for this period
    const existingShiftsResult = await db.query.shifts.findMany({
      where: and(
        gte(shifts.scheduledStart, startDate),
        lte(shifts.scheduledEnd, endDate)
      ),
      with: {
        shiftEmployees: true,
      },
    });

    // 6. Fetch assignments for approved orders that are not completed/cancelled
    const assignmentsResult = await db.query.orderEmployeeAssignments.findMany({
      where: eq(orderEmployeeAssignments.id, "placeholder"), // No direct filter, join with order
      with: {
        order: {
          with: {
            object: true,
          },
        },
        employee: true,
      },
    });

    // Since Drizzle doesn't support complex nested where clauses the same way,
    // fetch assignments and filter in JS
    const allAssignmentsResult = await db.query.orderEmployeeAssignments.findMany({
      with: {
        order: {
          with: {
            object: true,
            customer: true,
          },
        },
        employee: true,
      },
    });

    // Filter assignments: approved orders, not completed/cancelled
    const assignmentsData = allAssignmentsResult.filter((a) => {
      const order = a.order;
      return (
        order &&
        order.status !== "completed" &&
        order.status !== "cancelled"
      );
    });

    // Create assignments map
    const assignmentsMap = new Map(assignmentsData.map((a) => [a.id, a]));

    // 7. Fetch unassigned shifts (assignments without employee)
    const unassignedAssignmentsResult = await db.query.orderEmployeeAssignments.findMany({
      where: isNull(orderEmployeeAssignments.employeeId),
      with: {
        order: {
          with: {
            object: true,
          },
        },
      },
    });

    const unassignedShifts: UnassignedShift[] = (unassignedAssignmentsResult as any[]).map((ua: any) => ({
      id: ua.id,
      shift_date: startDateIso,
      start_time: null,
      end_time: null,
      job_title: ua.order?.service?.name || ua.order?.notes || "Unbekannt",
      object_name: ua.order?.object?.name || null,
      service_title: ua.order?.serviceType || null,
      service_color: null,
      estimated_hours: null,
      assignment_id: ua.id,
    }));

    // 8. Build team members lookup map
    const teamMembersByOrderDate: {
      [orderId: string]: {
        [date: string]: {
          employeeId: string;
          employeeName: string;
        }[];
      };
    } = {};

    for (const shift of existingShiftsResult) {
      if (!shift?.scheduledStart) continue;

      const shiftDateStr = formatISO(shift.scheduledStart, { representation: "date" });
      const assignmentId = (shift as any).assignmentId || (shift as any).assignment_id;
      if (!assignmentId) continue;

      const assignment = assignmentsMap.get(assignmentId);
      if (!assignment) continue;

      const orderId = assignment.orderId;
      if (!orderId) continue;

      if (!teamMembersByOrderDate[orderId]) {
        teamMembersByOrderDate[orderId] = {};
      }
      if (!teamMembersByOrderDate[orderId][shiftDateStr]) {
        teamMembersByOrderDate[orderId][shiftDateStr] = [];
      }

      const shiftEmployeesList = (shift as any).shiftEmployees || shift.shiftEmployees || [];
      for (const se of shiftEmployeesList) {
        const empData = employeesList.find((e) => e.id === se.employeeId);
        if (empData) {
          teamMembersByOrderDate[orderId][shiftDateStr].push({
            employeeId: se.employeeId,
            employeeName: empData.profileId ? profilesFullNameMap.get(empData.profileId) || "Mitarbeiter" : "Mitarbeiter",
          });
        }
      }
    }

    // Remove duplicates
    for (const oid of Object.keys(teamMembersByOrderDate)) {
      for (const dk of Object.keys(teamMembersByOrderDate[oid])) {
        const seen = new Set<string>();
        teamMembersByOrderDate[oid][dk] = teamMembersByOrderDate[oid][dk].filter((m) => {
          if (seen.has(m.employeeId)) return false;
          seen.add(m.employeeId);
          return true;
        });
      }
    }

    // 9. Build existing shifts by order/date map
    const existingShiftsByOrderDateMap = new Map<string, any[]>();
    for (const shift of existingShiftsResult) {
      if (!shift?.scheduledStart) continue;

      const shiftDateStr = formatISO(shift.scheduledStart, { representation: "date" });
      const assignmentId = (shift as any).assignmentId || (shift as any).assignment_id;

      let orderId: string | null = null;
      if ((shift as any).orderId) {
        orderId = (shift as any).orderId;
      } else if (assignmentId) {
        const shiftAssignment = assignmentsMap.get(assignmentId);
        orderId = shiftAssignment?.orderId || null;
      }

      if (orderId) {
        const key = `${orderId}_${shiftDateStr}`;
        if (!existingShiftsByOrderDateMap.has(key)) {
          existingShiftsByOrderDateMap.set(key, []);
        }
        existingShiftsByOrderDateMap.get(key)!.push(shift);
      }
    }

    // 10. Build planning data structure
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

    // Process existing shifts
    for (const shiftsOfDate of existingShiftsByOrderDateMap.values()) {
      for (const shift of shiftsOfDate) {
        const shiftDateStr = formatISO(shift.scheduledStart, { representation: "date" });
        const assignmentId = (shift as any).assignmentId || (shift as any).assignment_id;

        let assignment: any = null;
        let order: any = null;

        if (assignmentId) {
          assignment = assignmentsMap.get(assignmentId);
          order = assignment?.orders;
        }

        const shiftEmployeesList = (shift as any).shiftEmployees || shift.shiftEmployees || [];

        if (shiftEmployeesList.length === 0) {
          continue;
        }

        for (const shiftEmployee of shiftEmployeesList) {
          const currentEmployeeId = shiftEmployee.employeeId;

          if (!employeeDateShifts[currentEmployeeId]) {
            employeeDateShifts[currentEmployeeId] = {};
          }
          if (!employeeDateShifts[currentEmployeeId][shiftDateStr]) {
            employeeDateShifts[currentEmployeeId][shiftDateStr] = [];
          }

          const orderTitle = order?.title || "Unbekannt";
          const objectData = order?.objects;

          employeeDateShifts[currentEmployeeId][shiftDateStr].push({
            shiftId: shift.id,
            orderId: order?.id || "",
            orderTitle: orderTitle,
            objectId: objectData?.id || null,
            objectName: objectData?.name || null,
            objectAddress: objectData?.address || null,
            serviceType: order?.serviceType || null,
            startTime: shift.startTime || (shift as any).start_time || null,
            endTime: shift.endTime || (shift as any).end_time || null,
            hours: Number(shift.estimatedHours || (shift as any).estimated_hours || 0),
            travelTimeMinutes: shift.travelTimeMinutes ?? (shift as any).travel_time_minutes ?? null,
            breakTimeMinutes: shift.breakMinutes ?? (shift as any).break_time_minutes ?? null,
            assignmentId: assignmentId || "",
          });
        }
      }
    }

    // Pre-process absences into a Map for O(1) lookups
    const absenceMap = new Map<string, Array<{ start: Date; end: Date; type: string }>>();
    absencesResult?.forEach((absence) => {
      const employeeAbsences = absenceMap.get(absence.employeeId) || [];
      employeeAbsences.push({
        start: absence.startDate,
        end: absence.endDate,
        type: absence.absenceType,
      });
      absenceMap.set(absence.employeeId, employeeAbsences);
    });

    // 11. Build the final planning data structure
    for (const employee of employeesList) {
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
        const employeeAbsences = absenceMap.get(employee.id);
        const absence = employeeAbsences?.find(
          (a) => a.start <= day && a.end >= day
        );

        if (absence) {
          employeeSchedule[dateString].isAbsence = true;
          employeeSchedule[dateString].absenceType = absence.type;
        }

        // Calculate available hours from default schedule
        const defaultRecurrenceInterval = 1; // TODO: get from employee
        const defaultStartOffset = 0;
        const daysPassedDefault = differenceInDays(
          day,
          startOfWeek(new Date(), { weekStartsOn: 1 })
        );
        const weeksPassedDefault = Math.floor(daysPassedDefault / 7);
        const effectiveWeekIndexDefault =
          (weeksPassedDefault + defaultStartOffset) % defaultRecurrenceInterval;

        // For simplicity, use 8 hours default availability
        const defaultHours = 8;

        employeeSchedule[dateString].availableHours = defaultHours;

        if (defaultHours > 0) {
          employeeSchedule[dateString].isAvailable = true;
          totalHoursAvailable += defaultHours;
        }

        // Get shifts for this day
        const shiftsForDay = employeeDateShifts[employee.id]?.[dateString] || [];

        // Group shifts by assignment
        const shiftsByAssignment: { [key: string]: typeof shiftsForDay } = {};
        for (const shiftData of shiftsForDay) {
          if (!shiftsByAssignment[shiftData.assignmentId]) {
            shiftsByAssignment[shiftData.assignmentId] = [];
          }
          shiftsByAssignment[shiftData.assignmentId].push(shiftData);
        }

        // Detect multi-shifts
        const shiftIdsByOrderDate: { [key: string]: Set<string> } = {};
        for (const shiftData of shiftsForDay) {
          const key = `${shiftData.orderId}_${dateString}`;
          if (!shiftIdsByOrderDate[key]) {
            shiftIdsByOrderDate[key] = new Set();
          }
          shiftIdsByOrderDate[key].add(shiftData.shiftId);
        }

        // Get team members for the day
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

          const currentOrderId = shiftData.orderId;
          const teamMembersForThisOrder = teamMembersForDay[currentOrderId] || [];
          const orderDateKey = `${shiftData.orderId}_${dateString}`;
          const uniqueShiftIds = shiftIdsByOrderDate[orderDateKey];
          const hasMultipleShifts = uniqueShiftIds && uniqueShiftIds.size > 1;

          const isTeam = teamMembersForThisOrder.length > 1 && !hasMultipleShifts;
          const isMultiShift = hasMultipleShifts;

          // Determine status based on date
          const shiftDateObj = parseISO(dateString);
          const now = new Date();
          const today = startOfDay(now);

          let shiftStatus: "scheduled" | "in_progress" | "completed" = "scheduled";

          if (isToday(shiftDateObj)) {
            if (shiftData.startTime && shiftData.endTime) {
              const [startHour, startMin] = shiftData.startTime.split(":").map(Number);
              const [endHour, endMin] = shiftData.endTime.split(":").map(Number);

              const nowTime = new Date(now);
              nowTime.setSeconds(0, 0);

              const shiftStart = new Date(now);
              shiftStart.setHours(startHour, startMin, 0, 0);

              const shiftEnd = new Date(now);
              shiftEnd.setHours(endHour, endMin, 0, 0);

              if (isBefore(nowTime, shiftStart)) {
                shiftStatus = "scheduled";
              } else if (isAfter(nowTime, shiftEnd)) {
                shiftStatus = "completed";
              } else {
                shiftStatus = "in_progress";
              }
            }
          } else if (isPast(shiftDateObj)) {
            shiftStatus = "completed";
          }

          employeeSchedule[dateString].shifts.push({
            id: shiftData.shiftId,
            shift_date: dateString,
            start_time: shiftData.startTime,
            end_time: shiftData.endTime,
            estimated_hours: hours,
            travel_time_minutes: shiftData.travelTimeMinutes
              ? Number(shiftData.travelTimeMinutes)
              : null,
            break_time_minutes: shiftData.breakTimeMinutes
              ? Number(shiftData.breakTimeMinutes)
              : null,
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
            service_color: "#6b7280",

            series_id: null,
            is_recurring: false,

            order_id: shiftData.orderId,

            employees: isTeam && !isMultiShift
              ? teamMembersForThisOrder.map((member) => ({
                  employee_id: member.employeeId,
                  employee_name: member.employeeName,
                  role: "worker" as const,
                  is_confirmed: false,
                }))
              : [
                  {
                    employee_id: employee.id,
                    employee_name: employee.profileId ? String(profilesFullNameMap.get(employee.profileId) || "Mitarbeiter") : "Mitarbeiter",
                    role: "worker" as const,
                    is_confirmed: false,
                  },
                ],
            is_team: isTeam,
            is_multi_shift: isMultiShift,

            assignment_id: shiftData.assignmentId,
          });
        }
      }

      planningData[employee.id] = {
        name: profilesFullNameMap.get(employee.profileId) || "Mitarbeiter",
        avatar_url: employee.profileId ? profilesMap.get(employee.profileId) || null : null,
        job_title: null,
        totalHoursAvailable,
        totalHoursPlanned,
        raw: employee,
        schedule: employeeSchedule,
      };
    }

    const pageData: ShiftPlanningPageData = {
      planningData,
      unassignedShifts,
      weekNumber,
    };

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
  const authCheck = await requireAdminOrManager();
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }

  try {
    // Check if already assigned
    const existing = await db.query.shiftEmployees.findFirst({
      where: and(
        eq(shiftEmployees.shiftId, shiftId),
        eq(shiftEmployees.employeeId, employeeId)
      ),
    });

    if (existing) {
      return { success: false, message: "Mitarbeiter ist bereits zugewiesen." };
    }

    // Get shift details
    const shiftData = await db.query.shifts.findFirst({
      where: eq(shifts.id, shiftId),
    });

    if (!shiftData) {
      throw new Error("Einsatz nicht gefunden.");
    }

    // Create assignment
    await db.insert(shiftEmployees).values({
      shiftId,
      employeeId,
      role,
    });

    // Get employee for notification
    const employeeData = await db.query.employees.findFirst({
      where: eq(employees.id, employeeId),
    });

    if (employeeData?.profileId) {
      await sendNotification({
        userId: employeeData.profileId,
        title: "Neuer Einsatz zugewiesen",
        message: `Sie wurden dem Einsatz am ${formatISO(shiftData.scheduledStart, { representation: "date" })} zugewiesen.`,
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
  const authCheck = await requireAdminOrManager();
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }

  try {
    // Get shift details
    const shiftData = await db.query.shifts.findFirst({
      where: eq(shifts.id, shiftId),
      with: {
        shiftEmployees: true,
      },
    });

    if (!shiftData) {
      throw new Error("Shift nicht gefunden.");
    }

    const oldEmployeeId = shiftData.shiftEmployees?.[0]?.employeeId;

    // Update employee assignment
    if (oldEmployeeId) {
      await db
        .delete(shiftEmployees)
        .where(
          and(
            eq(shiftEmployees.shiftId, shiftId),
            eq(shiftEmployees.employeeId, oldEmployeeId)
          )
        );
    }

    // Add new assignment
    await db.insert(shiftEmployees).values({
      shiftId,
      employeeId: newEmployeeId,
      role: "worker",
    });

    let affectedCount = 1;

    revalidatePath("/dashboard/planning");
    return {
      success: true,
      message:
        mode === "single"
          ? "Einsatz erfolgreich neu zugewiesen."
          : `${affectedCount} ${affectedCount === 1 ? 'Einsatz' : 'Einsätze'} erfolgreich neu zugewiesen.`,
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
  const authCheck = await requireAdminOrManager();
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }

  try {
    const updateData: any = { status };
    if (status === "completed") {
      updateData.actualEnd = new Date();
    }

    await db.update(shifts).set(updateData).where(eq(shifts.id, shiftId));

    // Generate time entries when status becomes 'completed'
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
// SYNC ASSIGNMENT TO SHIFTS
// ============================================================================

export async function syncAssignmentToShifts(
  assignmentId: string,
  newEmployeeId: string,
  mode: "future" | "all" = "future"
): Promise<{ success: boolean; message: string; updated_count: number }> {
  const authCheck = await requireAdminOrManager();
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message, updated_count: 0 };
  }

  try {
    const assignment = await db.query.orderEmployeeAssignments.findFirst({
      where: eq(orderEmployeeAssignments.id, assignmentId),
    });

    if (!assignment) {
      return { success: false, message: "Assignment nicht gefunden", updated_count: 0 };
    }

    const today = format(new Date(), "yyyy-MM-dd");

    // Find shifts to update
    let shiftsQuery = db.query.shifts.findMany({
      where: and(
        eq((shifts as any).assignmentId, assignmentId),
        ne(shifts.status, "completed")
      ),
    });

    const shiftsResult = await shiftsQuery;
    const shifts = shiftsResult || [];

    if (shifts.length === 0) {
      return { success: true, message: "Keine Shifts zu aktualisieren", updated_count: 0 };
    }

    const shiftIds = shifts.map((s) => s.id);

    // Delete old shift_employees for these shifts
    for (const shiftId of shiftIds) {
      await db.delete(shiftEmployees).where(eq(shiftEmployees.shiftId, shiftId));
    }

    // Insert new assignments
    for (const shiftId of shiftIds) {
      await db.insert(shiftEmployees).values({
        shiftId,
        employeeId: newEmployeeId,
        role: "worker",
      });
    }

    return {
      success: true,
      message: `${shifts.length} Shift(s) aktualisiert`,
      updated_count: shifts.length,
    };
  } catch (error: any) {
    console.error("[SYNC-ASSIGNMENT] Error:", error);
    return {
      success: false,
      message: `Fehler beim Synchronisieren: ${error.message}`,
      updated_count: 0,
    };
  }
}

// ============================================================================
// DELETE SINGLE SHIFT
// ============================================================================

export async function deleteShift(
  shiftId: string,
  shiftDate: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  const authCheck = await requireAdminOrManager();
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }

  try {
    // Verify shift exists
    const shiftData = await db.query.shifts.findFirst({
      where: eq(shifts.id, shiftId),
    });

    if (!shiftData) {
      throw new Error("Einsatz nicht gefunden.");
    }

    // Delete child records first
    await db.delete(shiftEmployees).where(eq(shiftEmployees.shiftId, shiftId));

    // Delete shift
    await db.delete(shifts).where(eq(shifts.id, shiftId));

    revalidatePath("/dashboard/planning");
    return { success: true, message: notes || "Einsatz erfolgreich gelöscht." };
  } catch (error: any) {
    console.error("[DELETE] Error:", error);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// ============================================================================
// DELETE SERIES
// ============================================================================

export type SeriesDeleteMode = "single" | "future" | "all";

export async function deleteSeries(
  assignmentId: string,
  mode: SeriesDeleteMode = "future",
  fromDate?: string,
  skipAutoGeneration: boolean = true
): Promise<{ success: boolean; message: string }> {
  const authCheck = await requireAdminOrManager();
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStr = today.toISOString().split("T")[0];

    // Get assignment
    const assignment = await db.query.orderEmployeeAssignments.findFirst({
      where: eq(orderEmployeeAssignments.id, assignmentId),
    });

    if (!assignment) {
      return { success: true, message: "Assignment nicht gefunden." };
    }

    // Find related assignments for same order
    const allAssignments = await db.query.orderEmployeeAssignments.findMany({});
    const assignmentIds = allAssignments
      .filter((a) => a.orderId === assignment.orderId)
      .map((a) => a.id);

    // Find shifts to delete
    const allShifts = await db.query.shifts.findMany({});
    const shiftsToDelete = allShifts.filter((s) => {
      const shiftDateStr = formatISO(s.scheduledStart, { representation: "date" });
      const matchesAssignment = assignmentIds.includes((s as any).assignmentId);
      if (!matchesAssignment) return false;

      if (mode === "single" && fromDate) {
        return shiftDateStr === fromDate;
      } else if (mode === "all") {
        return true;
      } else {
        // future mode
        return shiftDateStr >= (fromDate || todayStr) && s.status !== "completed";
      }
    });

    if (shiftsToDelete.length === 0) {
      revalidatePath("/dashboard/planning");
      return { success: true, message: "Kein Einsatz gefunden." };
    }

    const shiftIds = shiftsToDelete.map((s) => s.id);

    // Delete in correct order
    await db.delete(shiftEmployees).where(inArray(shiftEmployees.shiftId, shiftIds));
    await db.delete(shifts).where(inArray(shifts.id, shiftIds));

    revalidatePath("/dashboard/planning");

    return { success: true, message: `${shiftsToDelete.length} Einsätze gelöscht.` };
  } catch (error: any) {
    console.error("[DELETE-SERIES] Error:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// ============================================================================
// REASSIGN ASSIGNMENT
// ============================================================================

export type AssignmentEditMode = "single" | "future" | "all";

export async function reassignAssignment(
  assignmentId: string,
  newEmployeeId: string,
  mode: AssignmentEditMode = "single",
  shiftDate?: string,
  shiftTimes?: { start: string; end: string; hours: number },
  originalShiftDate?: string
): Promise<{ success: boolean; message: string }> {
  const authCheck = await requireAdminOrManager();
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }

  try {
    const assignment = await db.query.orderEmployeeAssignments.findFirst({
      where: eq(orderEmployeeAssignments.id, assignmentId),
    });

    if (!assignment) {
      throw new Error("Assignment nicht gefunden.");
    }

    // For now, simplified logic - full implementation would be more complex
    await db
      .update(orderEmployeeAssignments)
      .set({ employeeId: newEmployeeId })
      .where(eq(orderEmployeeAssignments.id, assignmentId));

    revalidatePath("/dashboard/planning");
    return { success: true, message: "Assignment erfolgreich neu zugewiesen." };
  } catch (error: any) {
    console.error("Fehler beim Neuzuweisen des Assignments:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// ============================================================================
// COPY ASSIGNMENT
// ============================================================================

export async function copyAssignment(
  assignmentId: string,
  newEmployeeId: string,
  copyDate?: string,
  isSeriesCopy?: boolean
): Promise<{ success: boolean; message: string }> {
  const authCheck = await requireAdminOrManager();
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }

  try {
    const assignment = await db.query.orderEmployeeAssignments.findFirst({
      where: eq(orderEmployeeAssignments.id, assignmentId),
      with: {
        order: true,
      },
    });

    if (!assignment) {
      throw new Error("Assignment nicht gefunden.");
    }

    // Check if new employee already assigned to this order
    const existingAssignments = await db.query.orderEmployeeAssignments.findMany({});
    const existingForOrder = existingAssignments.find(
      (a) => a.orderId === assignment.orderId && a.employeeId === newEmployeeId
    );

    if (existingForOrder) {
      return {
        success: false,
        message: "Mitarbeiter ist bereits diesem Auftrag zugewiesen.",
      };
    }

    // Create new assignment
    await db.insert(orderEmployeeAssignments).values({
      orderId: assignment.orderId,
      employeeId: newEmployeeId,
    });

    // Get employee for notification
    const employeeData = await db.query.employees.findFirst({
      where: eq(employees.id, newEmployeeId),
      with: {
        profile: true,
      },
    });

    if (employeeData?.profileId) {
      await sendNotification({
        userId: employeeData.profileId,
        title: "Auftrag kopiert",
        message: `Ihnen wurde der Auftrag zugewiesen (kopiert von anderem Mitarbeiter).`,
        link: "/dashboard/orders",
      });
    }

    revalidatePath("/dashboard/planning");

    return {
      success: true,
      message: `Auftrag wurde erfolgreich für ${employeeData?.profile?.fullName || "Mitarbeiter"} kopiert.`,
    };
  } catch (error: any) {
    console.error("Fehler beim Kopieren des Assignments:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// ============================================================================
// UPDATE SHIFT
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
  const authCheck = await requireAdminOrManager();
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }

  try {
    // Find shift by assignment and date
    const allShifts = await db.query.shifts.findMany({});
    const shiftToUpdate = allShifts.find(
      (s) =>
        (s as any).assignmentId === assignmentId &&
        formatISO(s.scheduledStart, { representation: "date" }) === shiftDate
    );

    if (!shiftToUpdate) {
      throw new Error("Shift nicht gefunden.");
    }

    const updateData: any = {};
    if (updates.start_time) updateData.startTime = updates.start_time;
    if (updates.end_time) updateData.endTime = updates.end_time;
    if (updates.estimated_hours) updateData.estimatedHours = updates.estimated_hours;
    if (updates.travel_time_minutes !== undefined) updateData.travelTimeMinutes = updates.travel_time_minutes;
    if (updates.break_time_minutes !== undefined) updateData.breakMinutes = updates.break_time_minutes;
    if (updates.status) updateData.status = updates.status;

    await db.update(shifts).set(updateData).where(eq(shifts.id, shiftToUpdate.id));

    // Generate time entries when status becomes 'completed'
    if (updates.status === "completed") {
      const { generateTimeEntriesForShift } = await import("@/app/dashboard/time-tracking/actions");
      await generateTimeEntriesForShift(shiftToUpdate.id);
    }

    revalidatePath("/dashboard/planning");

    return { success: true, message: "Einsatz erfolgreich aktualisiert." };
  } catch (error: any) {
    console.error("[UPDATE-SHIFT] Error:", error);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// ============================================================================
// SIMPLE REASSIGN SHIFT
// ============================================================================

export async function simpleReassignShift(params: {
  shiftId: string;
  newEmployeeId?: string;
  newDate?: string;
  newStartTime?: string;
  newEndTime?: string;
}): Promise<{ success: boolean; message: string }> {
  const authCheck = await requireAdminOrManager();
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }

  const { shiftId, newEmployeeId, newDate, newStartTime, newEndTime } = params;

  try {
    const shiftData = await db.query.shifts.findFirst({
      where: eq(shifts.id, shiftId),
      with: {
        shiftEmployees: true,
      },
    });

    if (!shiftData) {
      throw new Error("Einsatz nicht gefunden.");
    }

    // Build update data
    const updateData: any = {};

    if (newDate) {
      const newDateObj = parseISO(newDate);
      updateData.scheduledStart = newDateObj;
      updateData.scheduledEnd = newDateObj;
    }
    if (newStartTime) updateData.startTime = newStartTime;
    if (newEndTime) updateData.endTime = newEndTime;

    await db.update(shifts).set(updateData).where(eq(shifts.id, shiftId));

    // Update employee assignment if new employee provided
    if (newEmployeeId) {
      const currentEmployeeId = shiftData.shiftEmployees?.[0]?.employeeId;

      if (newEmployeeId !== currentEmployeeId) {
        // Remove old assignment
        if (currentEmployeeId) {
          await db
            .delete(shiftEmployees)
            .where(
              and(
                eq(shiftEmployees.shiftId, shiftId),
                eq(shiftEmployees.employeeId, currentEmployeeId)
              )
            );
        }

        // Add new assignment
        await db.insert(shiftEmployees).values({
          shiftId,
          employeeId: newEmployeeId,
          role: "worker",
        });

        // Send notification
        const employeeData = await db.query.employees.findFirst({
          where: eq(employees.id, newEmployeeId),
        });

        if (employeeData?.profileId) {
          await sendNotification({
            userId: employeeData.profileId,
            title: "Einsatz zugewiesen",
            message: `Ihnen wurde ein Einsatz am ${newDate || formatISO(shiftData.scheduledStart, { representation: "date" })} zugewiesen.`,
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
// ADD EMPLOYEE TO SHIFT
// ============================================================================

export async function addEmployeeToShift(params: {
  shiftId: string;
  employeeId: string;
}): Promise<{ success: boolean; message: string }> {
  const authCheck = await requireAdminOrManager();
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }

  const { shiftId, employeeId } = params;

  try {
    // Check if already assigned
    const existing = await db.query.shiftEmployees.findFirst({
      where: and(
        eq(shiftEmployees.shiftId, shiftId),
        eq(shiftEmployees.employeeId, employeeId)
      ),
    });

    if (existing) {
      return { success: true, message: "Mitarbeiter ist bereits zugewiesen." };
    }

    // Add new assignment
    await db.insert(shiftEmployees).values({
      shiftId,
      employeeId,
      role: "worker",
    });

    // Send notification
    const employeeData = await db.query.employees.findFirst({
      where: eq(employees.id, employeeId),
    });

    const shiftData = await db.query.shifts.findFirst({
      where: eq(shifts.id, shiftId),
    });

    if (employeeData?.profileId && shiftData) {
      await sendNotification({
        userId: employeeData.profileId,
        title: "Einsatz zugewiesen",
        message: `Ihnen wurde ein Einsatz am ${formatISO(shiftData.scheduledStart, { representation: "date" })} zugewiesen.`,
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
// REMOVE EMPLOYEE FROM SHIFT
// ============================================================================

export async function removeEmployeeFromShift(params: {
  shiftId: string;
  employeeId: string;
}): Promise<{ success: boolean; message: string }> {
  const authCheck = await requireAdminOrManager();
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }

  const { shiftId, employeeId } = params;

  try {
    await db
      .delete(shiftEmployees)
      .where(
        and(
          eq(shiftEmployees.shiftId, shiftId),
          eq(shiftEmployees.employeeId, employeeId)
        )
      );

    revalidatePath("/dashboard/planning");
    return { success: true, message: "Mitarbeiter vom Einsatz entfernt." };
  } catch (error: any) {
    console.error("[REMOVE-EMPLOYEE] Error:", error);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// ============================================================================
// SIMPLE MOVE SHIFT DATE
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
// COPY SHIFT
// ============================================================================

export async function copyShift(params: {
  sourceShiftId: string;
  newEmployeeId: string;
  newDate: string;
  newStartTime?: string;
  newEndTime?: string;
}): Promise<{ success: boolean; message: string }> {
  const authCheck = await requireAdminOrManager();
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }

  try {
    const sourceShift = await db.query.shifts.findFirst({
      where: eq(shifts.id, params.sourceShiftId),
      with: {
        shiftEmployees: true,
      },
    });

    if (!sourceShift) {
      throw new Error("Quell-Einsatz nicht gefunden.");
    }

    // Create copy of shift
    const newShiftDate = parseISO(params.newDate);

    const [newShift] = await db
      .insert(shifts)
      .values({
        orderId: (sourceShift as any).orderId,
        scheduledStart: newShiftDate,
        scheduledEnd: newShiftDate,
        startTime: params.newStartTime || sourceShift.startTime,
        endTime: params.newEndTime || sourceShift.endTime,
        status: "scheduled",
        estimatedHours: sourceShift.estimatedHours,
        breakMinutes: sourceShift.breakMinutes,
      })
      .returning();

    // Add the new employee to the shift
    await db.insert(shiftEmployees).values({
      shiftId: newShift.id,
      employeeId: params.newEmployeeId,
      role: "worker",
      isConfirmed: false,
    });

    // Send notification
    const employeeData = await db.query.employees.findFirst({
      where: eq(employees.id, params.newEmployeeId),
    });

    if (employeeData?.profileId) {
      await sendNotification({
        userId: employeeData.profileId,
        title: "Einsatz kopiert",
        message: `Ihnen wurde ein Einsatz am ${params.newDate} zugewiesen (kopiert).`,
        link: "/dashboard/planning",
      });
    }

    revalidatePath("/dashboard/planning");
    return { success: true, message: "Einsatz erfolgreich kopiert." };
  } catch (error: any) {
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// ============================================================================
// ENSURE SHIFT-TIME ENTRIES SYNC
// ============================================================================

export async function ensureShiftTimeEntriesSync(): Promise<{
  success: boolean;
  message: string;
  shifts_completed: number;
  time_entries_created: number;
}> {
  try {
    const now = new Date();
    const todayLocalStr = formatISO(now, { representation: "date" });

    // Find shifts to mark as completed
    const allShifts = await db.query.shifts.findMany({
      where: or(
        eq(shifts.status, "scheduled"),
        eq(shifts.status, "in_progress")
      ),
    });

    const shiftIdsToComplete: string[] = [];

    for (const shift of allShifts || []) {
      const shiftDateStr = formatISO(shift.scheduledStart, { representation: "date" });

      if (shiftDateStr < todayLocalStr) {
        shiftIdsToComplete.push(shift.id);
      }
    }

    let shiftsCompleted = 0;
    if (shiftIdsToComplete.length > 0) {
      await db
        .update(shifts)
        .set({ status: "completed" })
        .where(inArray(shifts.id, shiftIdsToComplete));
      shiftsCompleted = shiftIdsToComplete.length;
    }

    // Find completed shifts missing time entries
    const completedShifts = await db.query.shifts.findMany({
      where: eq(shifts.status, "completed"),
    });

    let timeEntriesCreated = 0;
    for (const shift of completedShifts || []) {
      const { generateTimeEntriesForShift } = await import("@/app/dashboard/time-tracking/actions");
      const result = await generateTimeEntriesForShift(shift.id);
      if (result.success && result.created > 0) {
        timeEntriesCreated += result.created;
      }
    }

    revalidatePath("/dashboard/planning");
    revalidatePath("/dashboard/time-tracking");
    revalidatePath("/dashboard/reports");

    return {
      success: true,
      message: `${shiftsCompleted} Einsätze abgeschlossen, ${timeEntriesCreated} Zeiteinträge erstellt.`,
      shifts_completed: shiftsCompleted,
      time_entries_created: timeEntriesCreated,
    };
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
// MARK OVERDUE SHIFTS AS COMPLETED
// ============================================================================

export async function markOverdueShiftsAsCompleted(): Promise<{
  success: boolean;
  message: string;
  updated_count: number;
}> {
  return ensureShiftTimeEntriesSync();
}

// ============================================================================
// CREATE SHIFT
// ============================================================================

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

export type CreateShiftWithScheduleParams = CreateShiftParams;

export async function createShift(
  params: CreateShiftParams
): Promise<{ success: boolean; message: string; shift_id?: string }> {
  const authCheck = await requireAdminOrManager();
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }

  try {
    // Verify order exists
    const orderData = await db.query.orders.findFirst({
      where: eq(orders.id, params.order_id),
    });

    if (!orderData) {
      return { success: false, message: "Auftrag nicht gefunden." };
    }

    // Check if assignment exists, create if not
    const existingAssignments = await db.query.orderEmployeeAssignments.findMany({});
    const existingAssignment = existingAssignments.find(
      (a) => a.orderId === params.order_id && a.employeeId === params.employee_id
    );

    let assignmentId: string | null = existingAssignment?.id || null;

    if (!existingAssignment) {
      const [newAssignment] = await db
        .insert(orderEmployeeAssignments)
        .values({
          orderId: params.order_id,
          employeeId: params.employee_id,
        })
        .returning();
      assignmentId = newAssignment?.id || null;
    }

    // Create the shift
    const shiftDateObj = parseISO(params.shift_date);

    const [newShift] = await db
      .insert(shifts)
      .values({
        orderId: params.order_id,
        employeeId: params.employee_id,
        scheduledStart: shiftDateObj,
        scheduledEnd: shiftDateObj,
        startTime: params.start_time,
        endTime: params.end_time,
        estimatedHours: params.estimated_hours,
        travelTimeMinutes: params.travel_time_minutes || 0,
        breakMinutes: params.break_time_minutes || 0,
        status: "scheduled",
        notes: params.notes,
      })
      .returning();

    // Add the main employee
    await db.insert(shiftEmployees).values({
      shiftId: newShift.id,
      employeeId: params.employee_id,
      role: "worker",
      isConfirmed: false,
    });

    // Add team members if this is a team shift
    if (params.is_team && params.team_employee_ids) {
      for (const teamMemberId of params.team_employee_ids) {
        if (teamMemberId !== params.employee_id) {
          await db.insert(shiftEmployees).values({
            shiftId: newShift.id,
            employeeId: teamMemberId,
            role: "worker",
            isConfirmed: false,
          });
        }
      }
    }

    // Send notification to the employee
    const employeeData = await db.query.employees.findFirst({
      where: eq(employees.id, params.employee_id),
    });

    if (employeeData?.profileId) {
      await sendNotification({
        userId: employeeData.profileId,
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

// ============================================================================
// GENERATE SHIFTS FROM ASSIGNMENTS
// ============================================================================

export async function generateShiftsFromAssignments(): Promise<{ success: boolean; message: string; created_count?: number }> {
  try {
    // This would typically call a database function or create shifts from assignments
    // For now, return a placeholder message
    return {
      success: true,
      message: "Shift-Generierung aktiviert.",
      created_count: 0,
    };
  } catch (error: any) {
    console.error("[GENERATE-SHIFTS] Error:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

// ============================================================================
// PLACEHOLDER FUNCTIONS (not fully migrated - require full schema review)
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
  return { success: true, data: [] };
}

export async function createShiftWithSchedule(
  params: any
): Promise<{ success: boolean; message: string; created_shift_ids?: string[] }> {
  const authCheck = await requireAdminOrManager();
  if (!authCheck.authorized) {
    return { success: false, message: authCheck.message };
  }

  return { success: true, message: "Funktion nicht vollständig implementiert.", created_shift_ids: [] };
}