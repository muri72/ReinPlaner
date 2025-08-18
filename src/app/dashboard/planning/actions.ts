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
          friday_hours, saturday_hours, sunday_hours
        ),
        order_employee_assignments ( employee_id, assigned_daily_hours )
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

          // Find the specific assignment for this employee and order to get assigned_daily_hours
          const employeeAssignment = order.order_employee_assignments.find((assignment: any) => assignment.employee_id === employee.id);
          const assignedDailyHours = employeeAssignment?.assigned_daily_hours;

          if (['permanent', 'recurring', 'substitution'].includes(order.order_type)) {
            if (order.recurring_start_date && parseISO(order.recurring_start_date) <= day && (!order.recurring_end_date || parseISO(order.recurring_end_date) >= day)) {
              if (assignedDailyHours !== null && assignedDailyHours !== undefined) {
                dailyHours = assignedDailyHours; // Use explicitly assigned daily hours
              } else if (order.objects) {
                const schedule = Array.isArray(order.objects) ? order.objects[0] : order.objects;
                if (schedule) {
                  // Fallback to object's daily hours if no specific assignment
                  switch (dayOfWeek) {
                    case 1: dailyHours = schedule.monday_hours || 0; break;
                    case 2: dailyHours = schedule.tuesday_hours || 0; break;
                    case 3: dailyHours = schedule.wednesday_hours || 0; break;
                    case 4: dailyHours = schedule.thursday_hours || 0; break;
                    case 5: dailyHours = schedule.friday_hours || 0; break;
                    case 6: dailyHours = schedule.saturday_hours || 0; break;
                    case 0: dailyHours = schedule.sunday_hours || 0; break;
                  }
                }
              }
              assignmentTitle = `${order.title} (Plan)`;
            }
          } else if (order.order_type === 'one_time') {
            if (order.due_date && formatISO(parseISO(order.due_date), { representation: 'date' }) === dateString) {
              dailyHours = assignedDailyHours !== null && assignedDailyHours !== undefined ? assignedDailyHours : (order.total_estimated_hours || 0); // Use assigned or total estimated
              assignmentTitle = `${order.title} (Einmalig)`;
            }
          }

          if (dailyHours > 0) {
            planningData[employee.id].schedule[dateString].totalHours += dailyHours;
            planningData[employee.id].schedule[dateString].assignments.push({
              title: assignmentTitle,
              hours: dailyHours,
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

export async function assignOrderToEmployee(orderId: string, employeeId: string, dateString: string, assignedDailyHours: number | null): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  // Check if user is admin or manager
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || (profile?.role !== 'admin' && profile?.role !== 'manager')) {
    console.error("Berechtigungsfehler:", profileError?.message || profileError);
    return { success: false, message: "Nicht autorisiert. Nur Admins und Manager können Aufträge zuweisen." };
  }

  try {
    // Check if assignment already exists
    const { data: existingAssignment, error: fetchError } = await supabase
      .from('order_employee_assignments')
      .select('id')
      .eq('order_id', orderId)
      .eq('employee_id', employeeId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw fetchError;
    }

    if (existingAssignment) {
      // Update existing assignment (e.g., assigned_daily_hours if needed, though currently it's null from drag-drop)
      const { error: updateError } = await supabase
        .from('order_employee_assignments')
        .update({ assigned_daily_hours: assignedDailyHours })
        .eq('id', existingAssignment.id);
      if (updateError) throw updateError;
    } else {
      // Create new assignment
      const { error: insertError } = await supabase
        .from('order_employee_assignments')
        .insert({
          order_id: orderId,
          employee_id: employeeId,
          assigned_daily_hours: assignedDailyHours,
        });
      if (insertError) throw insertError;
    }

    // Update order status to 'in_progress' if it was 'pending' or 'approved'
    // This is a business logic decision. If an order is assigned, it's likely in progress.
    const { data: orderStatus, error: orderStatusError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (orderStatusError) throw orderStatusError;

    if (orderStatus?.status === 'pending' || orderStatus?.status === 'approved') { // Assuming 'approved' is a request status, not work status
      const { error: updateOrderStatusError } = await supabase
        .from('orders')
        .update({ status: 'in_progress' })
        .eq('id', orderId);
      if (updateOrderStatusError) throw updateOrderStatusError;
    }

    // Notify the assigned employee
    const supabaseAdmin = createAdminClient();
    const { data: employeeUser, error: employeeUserError } = await supabaseAdmin
      .from('employees')
      .select('user_id, first_name, last_name')
      .eq('id', employeeId)
      .single();

    const { data: orderTitle, error: orderTitleError } = await supabaseAdmin
      .from('orders')
      .select('title')
      .eq('id', orderId)
      .single();

    if (employeeUser?.user_id && orderTitle?.title) {
      await sendNotification({
        userId: employeeUser.user_id,
        title: "Neuer Auftrag zugewiesen",
        message: `Ihnen wurde der Auftrag "${orderTitle.title}" zugewiesen.`,
        link: "/employee/dashboard" // Link to employee dashboard
      });
    } else {
      console.warn(`Could not send notification for order assignment to employee ${employeeId}. User ID or order title missing.`);
    }

    revalidatePath("/dashboard/planning");
    revalidatePath("/dashboard/orders");
    revalidatePath("/employee/dashboard"); // Revalidate employee dashboard
    return { success: true, message: "Auftrag erfolgreich zugewiesen!" };

  } catch (error: any) {
    console.error("Fehler beim Zuweisen des Auftrags:", error?.message || error);
    return { success: false, message: error.message };
  }
}