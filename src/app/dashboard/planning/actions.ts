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

  try {
    // 1. Alle Mitarbeiter abrufen
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, first_name, last_name');
    if (employeesError) throw employeesError;

    // 2. Alle relevanten Aufträge abrufen (alle Typen mit Mitarbeiter)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        title,
        order_type,
        due_date,
        total_estimated_hours,
        recurring_start_date,
        recurring_end_date,
        objects (
          monday_hours, tuesday_hours, wednesday_hours, thursday_hours,
          friday_hours, saturday_hours, sunday_hours,
          monday_start_time, monday_end_time, tuesday_start_time, tuesday_end_time,
          wednesday_start_time, wednesday_end_time, thursday_start_time, thursday_end_time,
          friday_start_time, friday_end_time, saturday_start_time, saturday_end_time,
          sunday_start_time, sunday_end_time
        ),
        order_employee_assignments ( 
          employee_id, 
          assigned_daily_hours,
          assigned_monday_hours, assigned_tuesday_hours, assigned_wednesday_hours,
          assigned_thursday_hours, assigned_friday_hours, assigned_saturday_hours,
          assigned_sunday_hours,
          assigned_monday_start_time, assigned_monday_end_time,
          assigned_tuesday_start_time, assigned_tuesday_end_time,
          assigned_wednesday_start_time, assigned_wednesday_end_time,
          assigned_thursday_start_time, assigned_thursday_end_time,
          assigned_friday_start_time, assigned_friday_end_time,
          assigned_saturday_start_time, assigned_saturday_end_time,
          assigned_sunday_start_time, assigned_sunday_end_time
        )
      `);
    if (ordersError) throw ordersError;

    // 3. Alle genehmigten Abwesenheiten im Zeitraum abrufen
    const { data: absences, error: absencesError } = await supabase
      .from('absence_requests')
      .select('employee_id, start_date, end_date, type')
      .eq('status', 'approved')
      .lte('start_date', formatISO(end, { representation: 'date' }))
      .gte('end_date', formatISO(start, { representation: 'date' }));
    if (absencesError) throw absencesError;

    // 4. NEU: Ungeplante Aufträge über RPC-Funktion abrufen
    const { data: unassignedOrdersData, error: unassignedOrdersError } = await supabase.rpc('get_unassigned_orders');
    if (unassignedOrdersError) throw unassignedOrdersError;

    // 5. Daten verarbeiten
    const planningData: PlanningData = {};

    for (const employee of employees) {
      planningData[employee.id] = {
        name: `${employee.first_name} ${employee.last_name}`,
        schedule: {},
      };

      for (const day of weekDays) {
        const dateString = formatISO(day, { representation: 'date' });
        const dayOfWeek = getDay(day); // 0=So, 1=Mo, ...

        planningData[employee.id].schedule[dateString] = {
          totalHours: 0,
          isAbsence: false,
          absenceType: null,
          assignments: [],
        };

        const absence = absences.find(a =>
          a.employee_id === employee.id &&
          parseISO(a.start_date) <= day &&
          parseISO(a.end_date) >= day
        );

        if (absence) {
          planningData[employee.id].schedule[dateString].isAbsence = true;
          planningData[employee.id].schedule[dateString].absenceType = absence.type;
          continue;
        }

        // Filter orders assigned to this specific employee
        const employeeOrders = orders.filter(o => 
          o.order_employee_assignments && 
          o.order_employee_assignments.some((assignment: any) => assignment.employee_id === employee.id)
        );

        for (const order of employeeOrders) {
          let dailyHours = 0;
          let assignmentTitle = order.title;
          let assignedStartTime: string | null = null;
          let assignedEndTime: string | null = null;

          // Find the specific assignment for this employee and order
          const employeeAssignment = order.order_employee_assignments.find((assignment: any) => assignment.employee_id === employee.id);
          
          // Determine the correct daily hours and times based on the new fields
          let assignedHoursForDay: number | null = null;
          let assignedStartTimeForDay: string | null = null;
          let assignedEndTimeForDay: string | null = null;

          if (employeeAssignment) {
            switch (dayOfWeek) {
              case 1: 
                assignedHoursForDay = employeeAssignment.assigned_monday_hours || null; 
                assignedStartTimeForDay = employeeAssignment.assigned_monday_start_time || null;
                assignedEndTimeForDay = employeeAssignment.assigned_monday_end_time || null;
                break;
              case 2: 
                assignedHoursForDay = employeeAssignment.assigned_tuesday_hours || null; 
                assignedStartTimeForDay = employeeAssignment.assigned_tuesday_start_time || null;
                assignedEndTimeForDay = employeeAssignment.assigned_tuesday_end_time || null;
                break;
              case 3: 
                assignedHoursForDay = employeeAssignment.assigned_wednesday_hours || null; 
                assignedStartTimeForDay = employeeAssignment.assigned_wednesday_start_time || null;
                assignedEndTimeForDay = employeeAssignment.assigned_wednesday_end_time || null;
                break;
              case 4: 
                assignedHoursForDay = employeeAssignment.assigned_thursday_hours || null; 
                assignedStartTimeForDay = employeeAssignment.assigned_thursday_start_time || null;
                assignedEndTimeForDay = employeeAssignment.assigned_thursday_end_time || null;
                break;
              case 5: 
                assignedHoursForDay = employeeAssignment.assigned_friday_hours || null; 
                assignedStartTimeForDay = employeeAssignment.assigned_friday_start_time || null;
                assignedEndTimeForDay = employeeAssignment.assigned_friday_end_time || null;
                break;
              case 6: 
                assignedHoursForDay = employeeAssignment.assigned_saturday_hours || null; 
                assignedStartTimeForDay = employeeAssignment.assigned_saturday_start_time || null;
                assignedEndTimeForDay = employeeAssignment.assigned_saturday_end_time || null;
                break;
              case 0: 
                assignedHoursForDay = employeeAssignment.assigned_sunday_hours || null; 
                assignedStartTimeForDay = employeeAssignment.assigned_sunday_start_time || null;
                assignedEndTimeForDay = employeeAssignment.assigned_sunday_end_time || null;
                break;
            }
          }

          if (assignedHoursForDay !== null && assignedHoursForDay !== undefined) {
            dailyHours = assignedHoursForDay; // Use explicitly assigned daily hours
            assignedStartTime = assignedStartTimeForDay;
            assignedEndTime = assignedEndTimeForDay;
          } else if (order.objects) {
            const schedule = Array.isArray(order.objects) ? order.objects[0] : order.objects;
            if (schedule) {
              // Fallback to object's daily hours and times if no specific assignment
              switch (dayOfWeek) {
                case 1: dailyHours = schedule.monday_hours || 0; assignedStartTime = schedule.monday_start_time || null; assignedEndTime = schedule.monday_end_time || null; break;
                case 2: dailyHours = schedule.tuesday_hours || 0; assignedStartTime = schedule.tuesday_start_time || null; assignedEndTime = schedule.tuesday_end_time || null; break;
                case 3: dailyHours = schedule.wednesday_hours || 0; assignedStartTime = schedule.wednesday_start_time || null; assignedEndTime = schedule.wednesday_end_time || null; break;
                case 4: dailyHours = schedule.thursday_hours || 0; assignedStartTime = schedule.thursday_start_time || null; assignedEndTime = schedule.thursday_end_time || null; break;
                case 5: dailyHours = schedule.friday_hours || 0; assignedStartTime = schedule.friday_start_time || null; assignedEndTime = schedule.friday_end_time || null; break;
                case 6: dailyHours = schedule.saturday_hours || 0; assignedStartTime = schedule.saturday_start_time || null; assignedEndTime = schedule.saturday_end_time || null; break;
                case 0: dailyHours = schedule.sunday_hours || 0; assignedStartTime = schedule.sunday_start_time || null; assignedEndTime = schedule.sunday_end_time || null; break;
              }
            }
          }
          
          if (dailyHours > 0) {
            planningData[employee.id].schedule[dateString].totalHours += dailyHours;
            planningData[employee.id].schedule[dateString].assignments.push({
              title: assignmentTitle,
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