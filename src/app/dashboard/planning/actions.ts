"use server";
// Force rebuild

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendNotification } from "@/lib/actions/notifications";
import { generateShiftsFromAssignments, ensureShiftTimeEntriesSync } from "@/lib/actions/shift-planning";
import { startOfWeek, endOfWeek, eachDayOfInterval, formatISO, parseISO, getDay, differenceInDays, format, addMinutes, getWeek, subDays, addDays } from 'date-fns';
import { de } from 'date-fns/locale';

// ============================================================================
// AUTO-COMPLETE OVERDUE SHIFTS ON PAGE VISIT
// ============================================================================

/**
 * Ensures shift-time entry synchronization.
 * This function is called automatically when the planning page loads.
 * It marks overdue shifts as completed and creates any missing time entries.
 */
export async function checkAndCompleteOverdueShifts(): Promise<{
  success: boolean;
  message: string;
  updated_count: number;
  time_entries_created: number;
}> {
  try {
    const result = await ensureShiftTimeEntriesSync();
    return {
      success: result.success,
      message: result.message,
      updated_count: result.shifts_completed,
      time_entries_created: result.time_entries_created,
    };
  } catch (error: any) {
    return { success: false, message: error.message, updated_count: 0, time_entries_created: 0 };
  }
}

export interface EmployeePlanningData {
  name: string;
  totalHoursAvailable: number;
  totalHoursPlanned: number;
  raw: any; // Add raw employee data for edit dialog
  schedule: {
    [date: string]: { // YYYY-MM-DD
      isAvailable: boolean;
      totalHours: number;
      availableHours: number;
      isAbsence: boolean;
      absenceType: string | null;
      assignments: {
        id: string; // Assignment ID
        orderId: string; // Order ID
        title: string;
        startTime: string | null;
        endTime: string | null;
        hours: number;
        isRecurring: boolean;
        isTeam: boolean;
        status: 'completed' | 'pending' | 'future';
        service_type: string | null;
        service_color: string | null;
        isSubstitution: boolean; // Hinzugefügt für Badge-Logik
      }[];
    };
  };
}

export interface PlanningData {
  [employeeId: string]: EmployeePlanningData;
}


export interface UnassignedOrder {
  id: string;
  title: string;
  total_estimated_hours: number | null;
  service_type: string | null;
  end_date: string | null; // Fixed: was due_date
}

export interface PlanningPageData {
  planningData: PlanningData;
  unassignedOrders: UnassignedOrder[];
  weekNumber: number;
}

const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

// Helper function to calculate break minutes based on gross duration (same as in reports/actions.ts)
function calculateBreakMinutesFallback(grossDurationMinutes: number): number {
  if (grossDurationMinutes >= 9 * 60) { // More than 9 hours (540 minutes)
    return 45;
  } else if (grossDurationMinutes >= 6 * 60) { // More than 6 hours (360 minutes)
    return 30;
  }
  return 0;
}

export async function getPlanningDataForRange(startDate: Date, endDate: Date, filters: { query?: string }): Promise<{ success: boolean; data: PlanningPageData | null; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, data: null, message: "Benutzer nicht authentifiziert." };
  }

  const weekNumber = getWeek(startDate, { weekStartsOn: 1, locale: de });
  const weekDays = eachDayOfInterval({ start: startDate, end: endDate });
  const start_date_iso = formatISO(startDate, { representation: 'date' });
  const end_date_iso = formatISO(endDate, { representation: 'date' });

  try {
    // NOTE: Auto-generation of shifts removed to prevent duplicate creation
    // Shifts are now created via the shift edit dialog or manual assignment only

    // 1. Fetch all active employees with their default schedules, applying search filter
    let employeesQuery = supabase
      .from('employees')
      .select('*, user_id')
      .eq('status', 'active');

    if (filters.query) {
      employeesQuery = employeesQuery.or(`first_name.ilike.%${filters.query}%,last_name.ilike.%${filters.query}%`);
    }

    const { data: employees, error: employeesError } = await employeesQuery;
    if (employeesError) throw employeesError;

    // Get user IDs to fetch profiles with avatars
    const userIds = employees.map(e => e.user_id).filter((id): id is string => id !== null);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, avatar_url')
      .in('id', userIds);
    if (profilesError) throw profilesError;

    const profilesMap = new Map(profiles.map(p => [p.id, p.avatar_url]));

    const employeesWithAvatars = employees.map(employee => ({
      ...employee,
      avatar_url: employee.user_id ? profilesMap.get(employee.user_id) : null,
    }));


    // 2. Fetch all approved absences in the period
    const { data: absences, error: absencesError } = await supabase
      .from('absence_requests')
      .select('employee_id, start_date, end_date, type')
      .eq('status', 'approved')
      .lte('start_date', end_date_iso)
      .gte('end_date', start_date_iso);
    if (absencesError) throw absencesError;

    // 3. Fetch all relevant assignments for the week
    const filterString = `and(order_type.eq.one_time,end_date.gte.${start_date_iso},end_date.lte.${end_date_iso}),and(order_type.in.("recurring","permanent","substitution"),start_date.lte.${end_date_iso},or(end_date.is.null,end_date.gte.${start_date_iso}))`;
    const { data: activeAssignments, error: assignmentsError } = await supabase
      .from('order_employee_assignments')
      .select(`
        *,
        orders!inner(
            id, title, order_type, end_date, total_estimated_hours, status,
            start_date, service_type,
            order_employee_assignments ( count )
        )
      `)
      .eq('orders.request_status', 'approved')
      .or(filterString, { referencedTable: 'orders' });
    if (assignmentsError) throw assignmentsError;

    // 4. Fetch unassigned orders
    const { data: unassignedOrdersData, error: unassignedOrdersError } = await supabase.rpc('get_unassigned_orders');
    if (unassignedOrdersError) throw unassignedOrdersError;


    // 6. Fetch service colors
    const { data: servicesData, error: servicesError } = await supabase
      .from('services')
      .select('title, color');

    if (servicesError) console.error("Error fetching services:", servicesError);

    const serviceColorMap = new Map<string, string>();
    if (servicesData) {
      servicesData.forEach(s => {
        if (s.title && s.color) {
          serviceColorMap.set(s.title, s.color);
        }
      });
    }

    // 7. Process data
    const planningData: PlanningData = {};

    for (const employee of employeesWithAvatars) {
      let totalHoursAvailable = 0;
      let totalHoursPlanned = 0;

      const employeeAssignments = activeAssignments.filter(a => a.employee_id === employee.id);
      const employeeSchedule: EmployeePlanningData['schedule'] = {};

      for (const day of weekDays) {
        const dateString = formatISO(day, { representation: 'date' });
        const dayOfWeek = getDay(day); // 0=So, 1=Mo, ...
        const dayKey = dayNames[dayOfWeek];

        employeeSchedule[dateString] = {
          isAvailable: false,
          totalHours: 0,
          availableHours: 0,
          isAbsence: false,
          absenceType: null,
          assignments: [],
        };

        // Check for absence first
        const absence = absences.find(a =>
          a.employee_id === employee.id &&
          parseISO(a.start_date) <= day &&
          parseISO(a.end_date) >= day
        );

        if (absence) {
          employeeSchedule[dateString].isAbsence = true;
          employeeSchedule[dateString].absenceType = absence.type;
          continue; // Skip further processing for this day
        }

        // Determine availability and available hours from employee's default schedule
        const defaultRecurrenceInterval = employee.default_recurrence_interval_weeks || 1;
        const defaultStartOffset = employee.default_start_week_offset || 0;
        const daysPassedDefault = differenceInDays(day, startOfWeek(new Date(), { weekStartsOn: 1 }));
        const weeksPassedDefault = Math.floor(daysPassedDefault / 7);
        const effectiveWeekIndexDefault = (weeksPassedDefault + defaultStartOffset) % defaultRecurrenceInterval;

        const defaultWeekSchedule = employee.default_daily_schedules?.[effectiveWeekIndexDefault];
        const defaultDaySchedule = (defaultWeekSchedule as any)?.[dayKey];
        const defaultHours = Number(defaultDaySchedule?.hours ?? 0);

        employeeSchedule[dateString].availableHours = defaultHours;

        if (defaultHours > 0) {
          employeeSchedule[dateString].isAvailable = true;
          totalHoursAvailable += defaultHours;
        }

        // Process assignments for the current day
        for (const assignment of employeeAssignments) {
          const order = assignment.orders;
          if (!order) continue;

          let dailyHours = 0;
          let assignedStartTime: string | null = null;
          let assignedEndTime: string | null = null;
          let isCancelled = false;

          if (order.order_type === 'one_time') {
            if (order.end_date && formatISO(parseISO(order.end_date), { representation: 'date' }) === dateString) {
              const dueDate = parseISO(order.end_date);
              const dayOfWeekForLookup = getDay(dueDate);
              const dayKeyForLookup = dayNames[dayOfWeekForLookup];

              // For one-time orders, we assume the schedule is in the first week of the assignment's schedule array
              const weekSchedule = assignment.assigned_daily_schedules?.[0];
              const daySchedule = (weekSchedule as any)?.[dayKeyForLookup];

              if (daySchedule && daySchedule.hours > 0) {
                dailyHours = daySchedule.hours;
                assignedStartTime = daySchedule.start;
                assignedEndTime = daySchedule.end;
              }
            }
          } else { // For recurring, permanent, substitution
            const dateForScheduleLookup = day;
            const dayOfWeekForLookup = getDay(dateForScheduleLookup);
            const dayKeyForLookup = dayNames[dayOfWeekForLookup];

            const recurrenceIntervalWeeks = assignment.assigned_recurrence_interval_weeks || 1;
            const startWeekOffset = assignment.assigned_start_week_offset || 0;
            const startDateForLookup = order.start_date ? parseISO(order.start_date) : dateForScheduleLookup;

            const daysPassed = differenceInDays(dateForScheduleLookup, startDateForLookup);
            if (daysPassed >= 0) {
              const weeksPassed = Math.floor(daysPassed / 7);

              if ((weeksPassed + startWeekOffset) % recurrenceIntervalWeeks === 0) {
                const effectiveWeekIndex = (weeksPassed + startWeekOffset) % recurrenceIntervalWeeks;

                let employeeDailySchedules: any[] = [];
                if (typeof assignment.assigned_daily_schedules === 'string') {
                  try {
                    employeeDailySchedules = JSON.parse(assignment.assigned_daily_schedules);
                  } catch (e) {
                    console.error("Failed to parse assigned_daily_schedules:", e);
                  }
                } else {
                  employeeDailySchedules = assignment.assigned_daily_schedules || [];
                }

                if (employeeDailySchedules && employeeDailySchedules.length > effectiveWeekIndex) {
                  const weekSchedule = employeeDailySchedules[effectiveWeekIndex];
                  const daySchedule = (weekSchedule as any)?.[dayKeyForLookup];
                  if (daySchedule && daySchedule.hours > 0) {
                    dailyHours = daySchedule.hours;
                    assignedStartTime = daySchedule.start;
                    assignedEndTime = daySchedule.end;
                  }
                }
              }
            }
          }

          if (dailyHours > 0) {
            const totalAssignmentsForOrder = order.order_employee_assignments[0]?.count || 1;
            const isTeam = totalAssignmentsForOrder > 1;

            employeeSchedule[dateString].totalHours += dailyHours;
            totalHoursPlanned += dailyHours;
            employeeSchedule[dateString].assignments.push({
              id: assignment.id,
              orderId: order.id,
              title: order.title,
              hours: dailyHours,
              startTime: assignedStartTime,
              endTime: assignedEndTime,
              isRecurring: order.order_type !== 'one_time',
              isTeam: isTeam,
              status: order.status === 'completed' ? 'completed' : (new Date() > day ? 'pending' : 'future'),
              service_type: order.service_type,
              service_color: order.service_type ? serviceColorMap.get(order.service_type) || null : null,
              isSubstitution: order.order_type === 'substitution',
            });
          }
        }
      }

      planningData[employee.id] = {
        name: `${employee.first_name} ${employee.last_name}`,
        totalHoursAvailable,
        totalHoursPlanned,
        raw: employee,
        schedule: employeeSchedule,
      };
    }

    const pageData: PlanningPageData = {
      planningData,
      unassignedOrders: unassignedOrdersData || [],
      weekNumber,
    };

    return { success: true, data: pageData, message: "Plandaten erfolgreich geladen." };

  } catch (error: any) {
    console.error("Fehler beim Laden der Plandaten:", error?.message || error);
    return { success: false, data: null, message: error.message };
  }
}

export async function assignOrderToEmployee(
  orderId: string,
  employeeId: string,
  dateString: string,
  assignedDailyHours: number | null // This parameter is now deprecated, but kept for compatibility
): Promise<{ success: boolean; message: string }> {
  const supabaseAdmin = createAdminClient();
  const supabaseUserClient = await createClient();
  const { data: { user } } = await supabaseUserClient.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  try {
    // 1. Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('title, total_estimated_hours, order_type, object_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Auftrag nicht gefunden.");
    }

    // 2. Get object recurrence details and daily schedules if object_id exists
    let objectRecurrenceIntervalWeeks = 1;
    let objectStartWeekOffset = 0;
    let objectDailySchedules: any[] = [];

    if (order.object_id) {
      const { data: objectData, error: objectError } = await supabaseAdmin
        .from('objects')
        .select('recurrence_interval_weeks, start_week_offset, daily_schedules')
        .eq('id', order.object_id)
        .single();
      if (objectError) console.warn("Fehler beim Laden der Objekt-Wiederholungsdetails:", objectError.message);
      if (objectData) {
        objectRecurrenceIntervalWeeks = objectData.recurrence_interval_weeks;
        objectStartWeekOffset = objectData.start_week_offset;
        objectDailySchedules = objectData.daily_schedules;
      }
    }

    // 3. Update order (set end_date for one_time orders)
    if (order.order_type === 'one_time') {
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ end_date: dateString, status: 'pending' })
        .eq('id', orderId);
      if (updateError) throw updateError;
    }

    // 4. Prepare assigned_daily_schedules for the new assignment
    // For drag-and-drop, we'll assign the object's default schedule to the employee
    // If multiple employees are assigned later, this will be redistributed by the form.
    const newAssignedDailySchedules = objectDailySchedules.length > 0 ? objectDailySchedules : [{}]; // Default to one empty week if no object schedule

    // 5. Create or update assignment
    const { error: assignmentError } = await supabaseAdmin
      .from('order_employee_assignments')
      .upsert({
        order_id: orderId,
        employee_id: employeeId,
        assigned_daily_schedules: newAssignedDailySchedules,
        assigned_recurrence_interval_weeks: objectRecurrenceIntervalWeeks,
        assigned_start_week_offset: objectStartWeekOffset,
      }, { onConflict: 'order_id,employee_id' });

    if (assignmentError) throw assignmentError;

    // Generate shifts from the new assignment
    await generateShiftsFromAssignments();
    // Sync time entries for all completed shifts (including past ones)
    await ensureShiftTimeEntriesSync();

    // 6. Send notification
    const { data: employee } = await supabaseAdmin.from('employees').select('user_id, first_name, last_name').eq('id', employeeId).single();
    if (employee?.user_id) {
      await sendNotification({
        userId: employee.user_id,
        title: "Neuer Auftrag zugewiesen",
        message: `Ihnen wurde der Auftrag "${order.title}" für den ${formatISO(parseISO(dateString), { representation: 'date' })} zugewiesen.`,
        link: "/dashboard/orders"
      });
    }

    // 7. Revalidate paths
    revalidatePath("/dashboard/planning");
    revalidatePath("/dashboard/orders");

    return { success: true, message: "Auftrag erfolgreich zugewiesen." };
  } catch (error: any) {
    console.error("Fehler bei der Zuweisung des Auftrags:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}


export async function reassignSingleOrder(
  assignmentId: string,
  newEmployeeId: string,
  newDate: string
): Promise<{ success: boolean; message: string }> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  try {
    // 1. Get the original assignment to find the order ID
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('order_employee_assignments')
      .select('order_id, employee_id')
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignment) {
      throw new Error("Originale Zuweisung nicht gefunden.");
    }

    // 2. Update the order's end date
    const { error: orderUpdateError } = await supabaseAdmin
      .from('orders')
      .update({ end_date: newDate })
      .eq('id', assignment.order_id);

    if (orderUpdateError) {
      throw new Error(`Fehler beim Aktualisieren des Auftragsdatums: ${orderUpdateError.message}`);
    }

    // 3. Update the employee assignment
    const { error: assignmentUpdateError } = await supabaseAdmin
      .from('order_employee_assignments')
      .update({ employee_id: newEmployeeId })
      .eq('id', assignmentId);

    if (assignmentUpdateError) {
      throw new Error(`Fehler beim Neuzuweisen des Mitarbeiters: ${assignmentUpdateError.message}`);
    }

    // 4. Send notifications
    const { data: order } = await supabaseAdmin.from('orders').select('title').eq('id', assignment.order_id).single();
    const { data: newEmployee } = await supabaseAdmin.from('employees').select('user_id').eq('id', newEmployeeId).single();
    const { data: oldEmployee } = await supabaseAdmin.from('employees').select('user_id').eq('id', assignment.employee_id).single();

    if (newEmployee?.user_id) {
      await sendNotification({
        userId: newEmployee.user_id,
        title: "Auftrag zugewiesen",
        message: `Ihnen wurde der Auftrag "${order?.title}" für den ${newDate} zugewiesen.`,
        link: "/dashboard/orders"
      });
    }
    if (oldEmployee?.user_id && oldEmployee.user_id !== newEmployee?.user_id) {
      await sendNotification({
        userId: oldEmployee.user_id,
        title: "Auftrag entfernt",
        message: `Der Auftrag "${order?.title}" wurde Ihnen entzogen und neu zugewiesen.`,
        link: "/dashboard/orders"
      });
    }

    revalidatePath("/dashboard/planning");
    return { success: true, message: "Einmaliger Einsatz erfolgreich verschoben." };
  } catch (error: any) {
    console.error("Fehler beim Verschieben des einmaligen Einsatzes:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}


export async function updateOrderAssignments(
  orderId: string,
  data: {
    employeeIds: string[];
    assigned_daily_schedules: any[];
    assigned_recurrence_interval_weeks: number;
    assigned_start_week_offset: number;
  }
): Promise<{ success: boolean; message: string }> {
  const supabaseAdmin = createAdminClient();
  const { employeeIds, assigned_daily_schedules, assigned_recurrence_interval_weeks, assigned_start_week_offset } = data;
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. Delete FUTURE shifts for removed employees (keep completed shifts with time entries)
    // First, get all assignments for this order
    const { data: oldAssignments } = await supabaseAdmin
      .from('order_employee_assignments')
      .select('id, employee_id')
      .eq('order_id', orderId);

    if (oldAssignments && oldAssignments.length > 0) {
      const oldEmployeeIds = oldAssignments.map(a => a.employee_id);
      const newEmployeeIds = employeeIds || [];

      // Find employees that are being removed
      const removedEmployeeIds = oldEmployeeIds.filter(id => !newEmployeeIds.includes(id));

      if (removedEmployeeIds.length > 0) {
        // Delete future shifts for removed employees (keep completed ones)
        const { data: shiftsToDelete } = await supabaseAdmin
          .from('shifts')
          .select('id, shift_date, status')
          .eq('order_id', orderId)
          .in('assignment_id', oldAssignments.map(a => a.id))
          .gte('shift_date', today)
          .neq('status', 'completed');

        if (shiftsToDelete && shiftsToDelete.length > 0) {
          const shiftIdsToDelete = shiftsToDelete.map(s => s.id);

          // Delete time_entries first
          await supabaseAdmin
            .from('time_entries')
            .delete()
            .in('shift_id', shiftIdsToDelete);

          // Delete shift_employees
          await supabaseAdmin
            .from('shift_employees')
            .delete()
            .in('shift_id', shiftIdsToDelete);

          // Delete shifts
          await supabaseAdmin
            .from('shifts')
            .delete()
            .in('id', shiftIdsToDelete);
        }
      }
    }

    // 2. Delete all existing assignments for this order
    const { error: deleteError } = await supabaseAdmin
      .from('order_employee_assignments')
      .delete()
      .eq('order_id', orderId);

    if (deleteError) {
      throw new Error(`Fehler beim Löschen alter Zuweisungen: ${deleteError.message}`);
    }

    // 3. Create new assignments for all selected employees with the new shared schedule
    let insertedAssignments: any[] = [];
    if (employeeIds.length > 0) {
      const newAssignments = employeeIds.map(employeeId => ({
        order_id: orderId,
        employee_id: employeeId,
        assigned_daily_schedules,
        assigned_recurrence_interval_weeks,
        assigned_start_week_offset,
      }));

      const { data: insertedData, error: insertError } = await supabaseAdmin
        .from('order_employee_assignments')
        .insert(newAssignments)
        .select('id, employee_id');

      if (insertError) {
        throw new Error(`Fehler beim Erstellen neuer Zuweisungen: ${insertError.message}`);
      }
      insertedAssignments = insertedData || [];
    }

    // 4. Sync new assignments to existing future shifts (solves "two truths" problem)
    // This ensures that already-generated shifts reflect the new employee assignments
    if (insertedAssignments.length > 0) {
      const { syncAssignmentToShifts } = await import("@/lib/actions/shift-planning");

      for (const assignment of insertedAssignments) {
        const syncResult = await syncAssignmentToShifts(assignment.id, assignment.employee_id, "future");
        if (!syncResult.success) {
          console.warn(`[UPDATE-ASSIGNMENTS] Sync fehlgeschlagen für Assignment ${assignment.id}:`, syncResult.message);
        } else if (syncResult.updated_count > 0) {
          console.log(`[UPDATE-ASSIGNMENTS] ${syncResult.updated_count} Shifts synchronisiert für Assignment ${assignment.id}`);
        }
      }
    }

    // 5. Generate shifts for current and next month based on the updated assignments
    await generateShiftsFromAssignments();
    // Sync time entries for all completed shifts (including past ones)
    await ensureShiftTimeEntriesSync();

    // 6. Send notifications (optional, can be added later)

    revalidatePath("/dashboard/planning");
    revalidatePath("/dashboard/orders");
    return { success: true, message: "Team und Zeitplan für den Auftrag erfolgreich aktualisiert." };
  } catch (error: any) {
    console.error("Fehler beim Aktualisieren der Auftragszuweisungen:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

export type SeriesEditMode = "single" | "future" | "all";

/**
 * Reassign a series assignment with support for "only this" or "all future" modes
 *
 * - "single": Detach this specific occurrence from the series and create a one-time order
 * - "future": Update this and all future occurrences
 */
export async function reassignSeriesAssignment(
  assignmentId: string,
  newEmployeeId: string,
  newDate: string,
  mode: SeriesEditMode,
  originalDate: string
): Promise<{ success: boolean; message: string }> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  try {
    // 1. Get the original assignment with order details
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('order_employee_assignments')
      .select(`
        *,
        orders!inner(
          id, title, order_type, start_date, end_date,
          customer_id, object_id, service_type, total_estimated_hours,
          status, priority, notes, request_status
        )
      `)
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignment) {
      throw new Error("Originale Zuweisung nicht gefunden.");
    }

    const order = assignment.orders;

    if (mode === "single") {
      // Create a new one-time order for this specific date (detached from series)
      const { data: newOrder, error: newOrderError } = await supabaseAdmin
        .from('orders')
        .insert({
          user_id: user.id,
          title: `${order.title} (Einzeltermin)`,
          order_type: 'one_time',
          customer_id: order.customer_id,
          object_id: order.object_id,
          service_type: order.service_type,
          total_estimated_hours: order.total_estimated_hours,
          start_date: newDate,
          end_date: newDate,
          status: 'pending',
          priority: order.priority,
          notes: `Abgetrennt von Serie am ${originalDate}. ${order.notes || ''}`.trim(),
          request_status: 'approved',
        })
        .select('id')
        .single();

      if (newOrderError || !newOrder) {
        throw new Error(`Fehler beim Erstellen des Einzeltermins: ${newOrderError?.message}`);
      }

      // Create assignment for the new one-time order
      const dayOfWeek = new Date(originalDate).getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayKey = dayNames[dayOfWeek];

      // Extract schedule for this specific day from original assignment
      const originalSchedule = assignment.assigned_daily_schedules?.[0]?.[dayKey] || {};

      const { error: newAssignmentError } = await supabaseAdmin
        .from('order_employee_assignments')
        .insert({
          order_id: newOrder.id,
          employee_id: newEmployeeId,
          assigned_daily_schedules: [{ [dayKey]: originalSchedule }],
          assigned_recurrence_interval_weeks: 1,
          assigned_start_week_offset: 0,
        });

      if (newAssignmentError) {
        throw new Error(`Fehler beim Erstellen der Einzeltermin-Zuweisung: ${newAssignmentError.message}`);
      }

      revalidatePath("/dashboard/planning");
      revalidatePath("/dashboard/orders");
      return { success: true, message: "Einzeltermin wurde abgetrennt und neu zugewiesen." };
    }
    else if (mode === "future") {
      // Update the assignment's start week offset and/or employee for all future occurrences
      // This effectively changes the series from this point forward

      // Simply update the employee for the existing assignment
      const { error: updateError } = await supabaseAdmin
        .from('order_employee_assignments')
        .update({
          employee_id: newEmployeeId,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (updateError) {
        throw new Error(`Fehler beim Aktualisieren der Serie: ${updateError.message}`);
      }

      // Sync to existing future shifts (solves "two truths" problem)
      const { syncAssignmentToShifts } = await import("@/lib/actions/shift-planning");
      const syncResult = await syncAssignmentToShifts(assignmentId, newEmployeeId, "future");

      if (!syncResult.success) {
        console.warn(`[REASSIGN-SERIES] Sync fehlgeschlagen:`, syncResult.message);
      }

      revalidatePath("/dashboard/planning");
      revalidatePath("/dashboard/orders");
      return {
        success: true,
        message: syncResult.updated_count > 0
          ? `Alle zukünftigen Termine wurden aktualisiert (${syncResult.updated_count} Shifts synchronisiert).`
          : "Alle zukünftigen Termine wurden aktualisiert."
      };
    }
    else {
      // "all" mode - update entire series (same as future for now)
      const { error: updateError } = await supabaseAdmin
        .from('order_employee_assignments')
        .update({
          employee_id: newEmployeeId,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (updateError) {
        throw new Error(`Fehler beim Aktualisieren der Serie: ${updateError.message}`);
      }

      // Sync to all shifts (solves "two truths" problem)
      const { syncAssignmentToShifts } = await import("@/lib/actions/shift-planning");
      const syncResult = await syncAssignmentToShifts(assignmentId, newEmployeeId, "all");

      if (!syncResult.success) {
        console.warn(`[REASSIGN-SERIES] Sync fehlgeschlagen:`, syncResult.message);
      }

      revalidatePath("/dashboard/planning");
      revalidatePath("/dashboard/orders");
      return {
        success: true,
        message: syncResult.updated_count > 0
          ? `Gesamte Serie wurde aktualisiert (${syncResult.updated_count} Shifts synchronisiert).`
          : "Gesamte Serie wurde aktualisiert."
      };
    }
  } catch (error: any) {
    console.error("Fehler beim Bearbeiten der Serie:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}