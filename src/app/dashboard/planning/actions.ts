"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendNotification } from "@/lib/actions/notifications";
import { startOfWeek, endOfWeek, eachDayOfInterval, formatISO, parseISO, getDay } from 'date-fns';

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
          startTime: string | null; // New
          endTime: string | null;   // New
        }[];
      };
    };
  };
}

export interface UnassignedOrder {
  id: string;
  title: string;
  total_estimated_hours: number | null; // Corrected column name
  service_type: string | null;
}

export interface PlanningPageData {
  planningData: PlanningData;
  unassignedOrders: UnassignedOrder[];
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
    // 1. Fetch all employees
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, first_name, last_name');
    if (employeesError) throw employeesError;

    // 2. Fetch all approved absences for the week
    const { data: absences, error: absencesError } = await supabase
      .from('absence_requests')
      .select('employee_id, start_date, end_date, type')
      .eq('status', 'approved')
      .lte('start_date', end_date_iso)
      .gte('end_date', start_date_iso);
    if (absencesError) throw absencesError;

    // 3. Fetch all relevant assignments for the week in one go
    const { data: activeAssignments, error: assignmentsError } = await supabase
      .from('order_employee_assignments')
      .select(`
        *,
        orders!inner(
            id, title, order_type, due_date, total_estimated_hours,
            recurring_start_date, recurring_end_date
        )
      `)
      .eq('orders.request_status', 'approved')
      .or(
        `and(orders.order_type.eq.one_time,orders.due_date.gte.${start_date_iso},orders.due_date.lte.${end_date_iso}),` +
        `and(orders.order_type.in.("recurring","permanent","substitution"),orders.recurring_start_date.lte.${end_date_iso},or(orders.recurring_end_date.is.null,orders.recurring_end_date.gte.${start_date_iso}))`
      );
    if (assignmentsError) throw assignmentsError;

    // 4. Fetch unassigned orders
    const { data: unassignedOrdersData, error: unassignedOrdersError } = await supabase.rpc('get_unassigned_orders');
    if (unassignedOrdersError) throw unassignedOrdersError;

    // 5. Process data
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

          let dailyHours = 0;
          let assignedStartTime: string | null = null;
          let assignedEndTime: string | null = null;

          if (order.order_type === 'one_time' && order.due_date === dateString) {
            dailyHours = order.total_estimated_hours || 0;
          } else if (['permanent', 'recurring', 'substitution'].includes(order.order_type)) {
            switch (dayOfWeek) {
              case 1: dailyHours = assignment.assigned_monday_hours || 0; assignedStartTime = assignment.assigned_monday_start_time; assignedEndTime = assignment.assigned_monday_end_time; break;
              case 2: dailyHours = assignment.assigned_tuesday_hours || 0; assignedStartTime = assignment.assigned_tuesday_start_time; assignedEndTime = assignment.assigned_tuesday_end_time; break;
              case 3: dailyHours = assignment.assigned_wednesday_hours || 0; assignedStartTime = assignment.assigned_wednesday_start_time; assignedEndTime = assignment.assigned_wednesday_end_time; break;
              case 4: dailyHours = assignment.assigned_thursday_hours || 0; assignedStartTime = assignment.assigned_thursday_start_time; assignedEndTime = assignment.assigned_thursday_end_time; break;
              case 5: dailyHours = assignment.assigned_friday_hours || 0; assignedStartTime = assignment.assigned_friday_start_time; assignedEndTime = assignment.assigned_friday_end_time; break;
              case 6: dailyHours = assignment.assigned_saturday_hours || 0; assignedStartTime = assignment.assigned_saturday_start_time; assignedEndTime = assignment.assigned_saturday_end_time; break;
              case 0: dailyHours = assignment.assigned_sunday_hours || 0; assignedStartTime = assignment.assigned_sunday_start_time; assignedEndTime = assignment.assigned_sunday_end_time; break;
            }
          }

          if (dailyHours > 0) {
            planningData[employee.id].schedule[dateString].totalHours += dailyHours;
            planningData[employee.id].schedule[dateString].assignments.push({
              title: order.title,
              hours: dailyHours,
              startTime: assignedStartTime,
              endTime: assignedEndTime,
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
  assignedDailyHours: number | null
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
      .select('title, total_estimated_hours, order_type')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Auftrag nicht gefunden.");
    }

    // 2. Update order (set due_date for one_time orders)
    if (order.order_type === 'one_time') {
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ due_date: dateString, status: 'pending' })
        .eq('id', orderId);
      if (updateError) throw updateError;
    }

    // 3. Create or update assignment
    const { error: assignmentError } = await supabaseAdmin
      .from('order_employee_assignments')
      .upsert({
        order_id: orderId,
        employee_id: employeeId,
        assigned_daily_hours: assignedDailyHours ?? order.total_estimated_hours,
      }, { onConflict: 'order_id,employee_id' });

    if (assignmentError) throw assignmentError;

    // 4. Send notification
    const { data: employee } = await supabaseAdmin.from('employees').select('user_id, first_name, last_name').eq('id', employeeId).single();
    if (employee?.user_id) {
      await sendNotification({
        userId: employee.user_id,
        title: "Neuer Auftrag zugewiesen",
        message: `Ihnen wurde der Auftrag "${order.title}" für den ${formatISO(parseISO(dateString), { representation: 'date' })} zugewiesen.`,
        link: "/dashboard/orders"
      });
    }

    // 5. Revalidate paths
    revalidatePath("/dashboard/planning");
    revalidatePath("/dashboard/orders");

    return { success: true, message: "Auftrag erfolgreich zugewiesen." };
  } catch (error: any) {
    console.error("Fehler bei der Zuweisung des Auftrags:", error.message);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}