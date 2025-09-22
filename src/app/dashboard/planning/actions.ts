"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendNotification } from "@/lib/actions/notifications";
import { startOfWeek, endOfWeek, eachDayOfInterval, formatISO, parseISO, getDay, differenceInDays, format, addMinutes } from 'date-fns';
import { de } from 'date-fns/locale';

export interface EmployeePlanningData {
  name: string;
  totalHoursAvailable: number;
  totalHoursPlanned: number;
  schedule: {
    [date: string]: { // YYYY-MM-DD
      isAvailable: boolean;
      totalHours: number;
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
        service_type: string | null; // Hinzugefügt
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
  due_date: string | null; // Hinzugefügt
}

export interface PlanningPageData {
  planningData: PlanningData;
  unassignedOrders: UnassignedOrder[];
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

  const weekDays = eachDayOfInterval({ start: startDate, end: endDate });
  const start_date_iso = formatISO(startDate, { representation: 'date' });
  const end_date_iso = formatISO(endDate, { representation: 'date' });

  try {
    // 1. Fetch all active employees with their default schedules, applying search filter
    let employeesQuery = supabase
      .from('employees')
      .select('id, first_name, last_name, default_daily_schedules, default_recurrence_interval_weeks, default_start_week_offset')
      .eq('status', 'active');

    if (filters.query) {
      employeesQuery = employeesQuery.or(`first_name.ilike.%${filters.query}%,last_name.ilike.%${filters.query}%`);
    }

    const { data: employees, error: employeesError } = await employeesQuery;
    if (employeesError) throw employeesError;

    // 2. Fetch all approved absences in the period
    const { data: absences, error: absencesError } = await supabase
      .from('absence_requests')
      .select('employee_id, start_date, end_date, type')
      .eq('status', 'approved')
      .lte('start_date', end_date_iso)
      .gte('end_date', start_date_iso);
    if (absencesError) throw absencesError;

    // 3. Fetch all relevant assignments for the week
    const filterString = `and(order_type.eq.one_time,due_date.gte.${start_date_iso},due_date.lte.${end_date_iso}),and(order_type.in.("recurring","permanent","substitution"),recurring_start_date.lte.${end_date_iso},or(recurring_end_date.is.null,recurring_end_date.gte.${start_date_iso}))`;
    const { data: activeAssignments, error: assignmentsError } = await supabase
      .from('order_employee_assignments')
      .select(`
        *,
        orders!inner(
            id, title, order_type, due_date, total_estimated_hours, status,
            recurring_start_date, recurring_end_date, service_type,
            order_employee_assignments ( count )
        )
      `)
      .eq('orders.request_status', 'approved')
      .or(filterString, { referencedTable: 'orders' });
    if (assignmentsError) throw assignmentsError;

    // 4. Fetch unassigned orders
    const { data: unassignedOrdersData, error: unassignedOrdersError } = await supabase.rpc('get_unassigned_orders');
    if (unassignedOrdersError) throw unassignedOrdersError;

    // 5. Process data
    const planningData: PlanningData = {};

    for (const employee of employees) {
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
        
        if (defaultDaySchedule && defaultDaySchedule.hours > 0) {
          employeeSchedule[dateString].isAvailable = true;
          totalHoursAvailable += defaultDaySchedule.hours;
        }

        // Process assignments for the current day
        for (const assignment of employeeAssignments) {
          const order = assignment.orders;
          if (!order) continue;

          let dailyHours = 0;
          let assignedStartTime: string | null = null;
          let assignedEndTime: string | null = null;

          // Unified logic for all order types to prioritize assignment schedule
          const dateForScheduleLookup = order.order_type === 'one_time' ? (order.due_date ? parseISO(order.due_date) : day) : day;
          const dateStringForComparison = formatISO(dateForScheduleLookup, { representation: 'date' });

          if (dateStringForComparison !== dateString) {
            continue;
          }

          const dayOfWeekForLookup = getDay(dateForScheduleLookup);
          const dayKeyForLookup = dayNames[dayOfWeekForLookup];

          let effectiveWeekIndex = 0; // Default for one-time orders

          if (order.order_type !== 'one_time') {
            const recurrenceIntervalWeeks = assignment.assigned_recurrence_interval_weeks || 1;
            const startWeekOffset = assignment.assigned_start_week_offset || 0;
            const startDateForLookup = order.recurring_start_date ? parseISO(order.recurring_start_date) : dateForScheduleLookup;
            
            const daysPassed = differenceInDays(dateForScheduleLookup, startDateForLookup);
            if (daysPassed < 0) continue;

            const weeksPassed = Math.floor(daysPassed / 7);
            
            if ((weeksPassed + startWeekOffset) % recurrenceIntervalWeeks !== 0) {
              continue;
            }
            effectiveWeekIndex = (weeksPassed + startWeekOffset) % recurrenceIntervalWeeks;
          }

          let employeeDailySchedules: any[] = [];
          if (typeof assignment.assigned_daily_schedules === 'string') {
              try {
                  employeeDailySchedules = JSON.parse(assignment.assigned_daily_schedules);
              } catch (e) {
                  console.error(`[PLANNING_LOG] Failed to parse assigned_daily_schedules for assignment ${assignment.id}:`, e);
              }
          } else {
              employeeDailySchedules = assignment.assigned_daily_schedules || [];
          }

          if (employeeDailySchedules && employeeDailySchedules.length > effectiveWeekIndex) {
              const weekSchedule = employeeDailySchedules[effectiveWeekIndex];
              const daySchedule = (weekSchedule as any)?.[dayKeyForLookup];
              
              console.log(`[PLANNING_DEBUG] Check: Emp=${employee.id}, Order=${order.id}, Date=${dateString}, Day=${dayKeyForLookup}, WeekIndex=${effectiveWeekIndex}, Schedule Found:`, daySchedule);

              if (daySchedule && daySchedule.hours > 0) {
                  dailyHours = daySchedule.hours;
                  assignedStartTime = daySchedule.start;
                  assignedEndTime = daySchedule.end;
                  console.log(`[PLANNING_DEBUG] SUCCESS: Emp=${employee.id}, Order=${order.id}, Date=${dateString} -> Found hours: ${dailyHours}, Start: ${assignedStartTime}, End: ${assignedEndTime}`);
              }
          } else {
            console.log(`[PLANNING_DEBUG] FAIL: No schedule found for Emp=${employee.id}, Order=${order.id}, Date=${dateString}, WeekIndex=${effectiveWeekIndex}`);
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
            });
          }
        }
      }

      planningData[employee.id] = {
        name: `${employee.first_name} ${employee.last_name}`,
        totalHoursAvailable,
        totalHoursPlanned,
        schedule: employeeSchedule,
      };
    }

    const pageData: PlanningPageData = {
      planningData,
      unassignedOrders: unassignedOrdersData || [],
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

    // 3. Update order (set due_date for one_time orders)
    if (order.order_type === 'one_time') {
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ due_date: dateString, status: 'pending' })
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

export async function reassignRecurringOrder(
  params: {
    assignmentId: string;
    originalDate: string;
    newEmployeeId: string;
    newDate: string;
    updateType: 'single' | 'series';
  }
): Promise<{ success: boolean; message: string }> {
  const supabaseAdmin = createAdminClient();
  const { assignmentId, originalDate, newEmployeeId, newDate, updateType } = params;

  try {
    // 1. Fetch the original assignment and order details
    const { data: originalAssignment, error: assignmentError } = await supabaseAdmin
      .from('order_employee_assignments')
      .select(`
        *,
        orders!inner(*)
      `)
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !originalAssignment || !originalAssignment.orders) {
      throw new Error("Originale Zuweisung nicht gefunden.");
    }

    const originalOrder = originalAssignment.orders;

    if (updateType === 'single') {
      // --- Handle single instance change ---

      // 1. Create or update an exception for the original assignment on the original date
      const { error: exceptionError } = await supabaseAdmin
        .from('assignment_exceptions')
        .upsert({
          assignment_id: assignmentId,
          original_date: originalDate,
          reason: `Verschoben zu ${newDate} für Mitarbeiter ${newEmployeeId}`,
        }, { onConflict: 'assignment_id, original_date' });
      if (exceptionError) throw new Error(`Ausnahme konnte nicht erstellt werden: ${exceptionError.message}`);

      // 2. Create a new one-time order as a copy
      const { data: newOneTimeOrder, error: newOrderError } = await supabaseAdmin
        .from('orders')
        .insert({
          // Copy most fields, but adjust for one-time nature
          user_id: originalOrder.user_id,
          title: `${originalOrder.title} (Sondertermin)`,
          description: originalOrder.description,
          status: 'pending', // New one-time orders are pending
          due_date: newDate,
          customer_id: originalOrder.customer_id,
          object_id: originalOrder.object_id,
          customer_contact_id: originalOrder.customer_contact_id,
          priority: originalOrder.priority,
          total_estimated_hours: originalOrder.total_estimated_hours, // This might need adjustment
          notes: `Verschoben von wiederkehrendem Auftrag am ${originalDate}. Original-Auftrag: ${originalOrder.id}`,
          order_type: 'one_time',
          request_status: 'approved',
          service_type: originalOrder.service_type,
          fixed_monthly_price: null, // One-time orders don't have fixed monthly price
          recurring_start_date: null,
          recurring_end_date: null,
        })
        .select('id')
        .single();

      if (newOrderError || !newOneTimeOrder) throw new Error(`Einmaliger Auftrag konnte nicht erstellt werden: ${newOrderError?.message}`);

      // 3. Assign the new one-time order to the new employee
      const { error: newAssignmentError } = await supabaseAdmin
        .from('order_employee_assignments')
        .insert({
          order_id: newOneTimeOrder.id,
          employee_id: newEmployeeId,
          // For a one-time order, the schedule is not strictly necessary but can be copied for consistency
          assigned_daily_schedules: originalAssignment.assigned_daily_schedules,
          assigned_recurrence_interval_weeks: 1,
          assigned_start_week_offset: 0,
        });

      if (newAssignmentError) throw new Error(`Neuer Auftrag konnte nicht zugewiesen werden: ${newAssignmentError.message}`);

    } else { // updateType === 'series'
      // --- Handle series change ---
      // For now, we only support reassigning the employee for the entire series.
      // A date change for the whole series is a more complex operation.
      if (originalAssignment.employee_id === newEmployeeId) {
         return { success: false, message: "Das Ändern des Datums für eine ganze Serie wird noch nicht unterstützt. Nur die Mitarbeiterzuweisung kann für die Serie geändert werden." };
      }

      const { error: updateAssignmentError } = await supabaseAdmin
        .from('order_employee_assignments')
        .update({ employee_id: newEmployeeId })
        .eq('id', assignmentId);

      if (updateAssignmentError) throw new Error(`Serie konnte nicht neu zugewiesen werden: ${updateAssignmentError.message}`);
    }

    revalidatePath("/dashboard/planning");
    return { success: true, message: "Einsatz erfolgreich verschoben." };

  } catch (error: any) {
    console.error("Fehler beim Verschieben des Einsatzes:", error.message);
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

    // 2. Update the order's due date
    const { error: orderUpdateError } = await supabaseAdmin
      .from('orders')
      .update({ due_date: newDate })
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

  try {
    // 1. Delete all existing assignments for this order
    const { error: deleteError } = await supabaseAdmin
      .from('order_employee_assignments')
      .delete()
      .eq('order_id', orderId);

    if (deleteError) {
      throw new Error(`Fehler beim Löschen alter Zuweisungen: ${deleteError.message}`);
    }

    // 2. Create new assignments for all selected employees with the new shared schedule
    if (employeeIds.length > 0) {
      const newAssignments = employeeIds.map(employeeId => ({
        order_id: orderId,
        employee_id: employeeId,
        assigned_daily_schedules,
        assigned_recurrence_interval_weeks,
        assigned_start_week_offset,
      }));

      const { error: insertError } = await supabaseAdmin
        .from('order_employee_assignments')
        .insert(newAssignments);

      if (insertError) {
        throw new Error(`Fehler beim Erstellen neuer Zuweisungen: ${insertError.message}`);
      }
    }

    // 3. Send notifications (optional, can be added later)

    revalidatePath("/dashboard/planning");
    revalidatePath("/dashboard/orders");
    return { success: true, message: "Team und Zeitplan für den Auftrag erfolgreich aktualisiert." };
  } catch (error: any) {
    console.error("Fehler beim Aktualisieren der Auftragszuweisungen:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}