"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendNotification } from "@/lib/actions/notifications";
import { startOfWeek, endOfWeek, eachDayOfInterval, formatISO, parseISO, getDay, differenceInDays } from 'date-fns';

export interface PlanningData {
  [employeeId: string]: {
    name: string;
    schedule: {
      [date: string]: { // YYYY-MM-DD
        totalHours: number;
        isAbsence: boolean;
        absenceType: string | null;
        assignments: {
          title: string;
          hours: number;
          startTime: string | null;
          endTime: string | null;
          recurrence?: string; // Added for display
        }[];
      };
    };
  };
}

export interface UnassignedOrder {
  id: string;
  title: string;
  total_estimated_hours: number | null;
  service_type: string | null;
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

export async function getPlanningDataForWeek(currentDate: Date): Promise<{ success: boolean; data: PlanningPageData | null; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, data: null, message: "Benutzer nicht authentifiziert." };
  }

  const start = startOfWeek(currentDate, { weekStartsOn: 1 });
  const end = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start, end });
  const start_date_iso = formatISO(start, { representation: 'date' });
  const end_date_iso = formatISO(end, { representation: 'date' });

  try {
    // 1. Fetch all active employees
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('status', 'active'); // Filter for active employees
    if (employeesError) throw employeesError;

    // 2. Fetch all approved absences in the period
    const { data: absences, error: absencesError } = await supabase
      .from('absence_requests')
      .select('employee_id, start_date, end_date, type')
      .eq('status', 'approved')
      .lte('start_date', end_date_iso)
      .gte('end_date', start_date_iso);
    if (absencesError) throw absencesError;

    // 3. Fetch assignments for one-time orders in the week
    const selectString = `
      *,
      orders!inner(
          id, title, order_type, due_date, total_estimated_hours,
          recurring_start_date, recurring_end_date
      )
    `;

    const { data: oneTimeAssignments, error: oneTimeError } = await supabase
      .from('order_employee_assignments')
      .select(selectString)
      .eq('orders.request_status', 'approved')
      .eq('orders.order_type', 'one_time')
      .gte('orders.due_date', start_date_iso)
      .lte('orders.due_date', end_date_iso);
    if (oneTimeError) throw oneTimeError;

    // 4. Fetch assignments for recurring orders in the week
    const { data: recurringAssignments, error: recurringError } = await supabase
      .from('order_employee_assignments')
      .select(`
        *,
        orders!inner(
            id, title, order_type, due_date, total_estimated_hours,
            recurring_start_date, recurring_end_date,
            objects ( recurrence_interval_weeks, start_week_offset, daily_schedules )
        )
      `)
      .eq('orders.request_status', 'approved')
      .in('orders.order_type', ['recurring', 'permanent', 'substitution'])
      .lte('orders.recurring_start_date', end_date_iso)
      .or(`recurring_end_date.is.null,recurring_end_date.gte.${start_date_iso}`, { foreignTable: 'orders' });
    if (recurringError) throw recurringError;

    const activeAssignments = [...oneTimeAssignments, ...recurringAssignments];

    // 5. Fetch unassigned orders
    const { data: unassignedOrdersData, error: unassignedOrdersError } = await supabase.rpc('get_unassigned_orders');
    if (unassignedOrdersError) throw unassignedOrdersError;

    // 6. Process data
    const planningData: PlanningData = {};

    for (const employee of employees) {
      planningData[employee.id] = {
        name: `${employee.first_name} ${employee.last_name}`,
        schedule: {},
      };

      const employeeAssignments = activeAssignments.filter(a => a.employee_id === employee.id);

      for (const day of weekDays) {
        const dateString = formatISO(day, { representation: 'date' });
        const dayOfWeek = getDay(day); // 0=So, 1=Mo, ...

        planningData[employee.id].schedule[dateString] = {
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
          planningData[employee.id].schedule[dateString].isAbsence = true;
          planningData[employee.id].schedule[dateString].absenceType = absence.type;
          continue; // Skip order processing if absent
        }

        // Process assignments for the current day
        for (const assignment of employeeAssignments) {
          const order = assignment.orders;
          if (!order) continue;

          // Check if the order is active on the current day
          let isOrderActiveToday = false;
          if (order.order_type === 'one_time' && order.due_date && formatISO(parseISO(order.due_date), { representation: 'date' }) === dateString) {
            isOrderActiveToday = true;
          } else if (['recurring', 'permanent', 'substitution'].includes(order.order_type) && order.recurring_start_date) {
            const startDate = parseISO(order.recurring_start_date);
            const endDate = order.recurring_end_date ? parseISO(order.recurring_end_date) : null;
            if (startDate <= day && (!endDate || endDate >= day)) {
              isOrderActiveToday = true;
            }
          }
          
          if (!isOrderActiveToday) continue;

          // If active, get the hours for this specific day
          let dailyHours = 0;
          let assignedStartTime: string | null = null;
          let assignedEndTime: string | null = null;
          let recurrenceLabel: string | undefined;

          if (order.order_type === 'one_time') {
            dailyHours = order.total_estimated_hours || 0;
          } else {
            // *** KORRIGIERTE, ROBUSTERE LOGIK FÜR WIEDERHOLUNGEN ***
            const recurrenceIntervalWeeks = assignment.assigned_recurrence_interval_weeks || order.objects?.[0]?.recurrence_interval_weeks || 1;
            const startWeekOffset = assignment.assigned_start_week_offset || order.objects?.[0]?.start_week_offset || 0;
            
            const orderStartDate = parseISO(order.recurring_start_date!);
            const daysPassed = differenceInDays(day, orderStartDate);
            
            if (daysPassed < 0) continue;

            const weeksPassed = Math.floor(daysPassed / 7);
            const effectiveWeekIndex = (weeksPassed + startWeekOffset) % recurrenceIntervalWeeks;

            const employeeDailySchedules = assignment.assigned_daily_schedules;
            if (employeeDailySchedules && employeeDailySchedules.length > effectiveWeekIndex) {
              const weekSchedule = employeeDailySchedules[effectiveWeekIndex];
              const daySchedule = (weekSchedule as any)?.[dayNames[dayOfWeek === 0 ? 0 : dayOfWeek]]; // Corrected day index
              if (daySchedule) {
                dailyHours = daySchedule.hours || 0;
                assignedStartTime = daySchedule.start;
                assignedEndTime = daySchedule.end;
              }
            }
            
            if (recurrenceIntervalWeeks > 1) {
              recurrenceLabel = `(Alle ${recurrenceIntervalWeeks} Wo.)`;
            }
          }

          if (dailyHours > 0) {
            planningData[employee.id].schedule[dateString].totalHours += dailyHours;
            planningData[employee.id].schedule[dateString].assignments.push({
              title: order.title,
              hours: dailyHours,
              startTime: assignedStartTime,
              endTime: assignedEndTime,
              recurrence: recurrenceLabel,
            });
          }
        }
      }
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