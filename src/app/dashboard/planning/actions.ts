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
        order_employee_assignments ( 
          employee_id, 
          assigned_daily_hours,
          assigned_monday_hours, assigned_tuesday_hours, assigned_wednesday_hours,
          assigned_thursday_hours, assigned_friday_hours, assigned_saturday_hours,
          assigned_sunday_hours
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

          // Find the specific assignment for this employee and order
          const employeeAssignment = order.order_employee_assignments.find((assignment: any) => assignment.employee_id === employee.id);
          
          // Determine the correct daily hours based on the new fields
          let assignedHoursForDay: number | null = null;
          switch (dayOfWeek) {
            case 1: assignedHoursForDay = employeeAssignment?.assigned_monday_hours || null; break;
            case 2: assignedHoursForDay = employeeAssignment?.assigned_tuesday_hours || null; break;
            case 3: assignedHoursForDay = employeeAssignment?.assigned_wednesday_hours || null; break;
            case 4: assignedHoursForDay = employeeAssignment?.assigned_thursday_hours || null; break;
            case 5: assignedHoursForDay = employeeAssignment?.assigned_friday_hours || null; break;
            case 6: assignedHoursForDay = employeeAssignment?.assigned_saturday_hours || null; break;
            case 0: assignedHoursForDay = employeeAssignment?.assigned_sunday_hours || null; break;
          }

          if (assignedHoursForDay !== null && assignedHoursForDay !== undefined) {
            dailyHours = assignedHoursForDay; // Use explicitly assigned daily hours
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
    // Fetch the object's daily hours to use as default if assignedDailyHours is null
    const { data: orderDetails, error: orderDetailsError } = await supabase
      .from('orders')
      .select(`
        object_id,
        objects (
          monday_hours, tuesday_hours, wednesday_hours, thursday_hours,
          friday_hours, saturday_hours, sunday_hours
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderDetailsError) throw orderDetailsError;

    const objectSchedule = Array.isArray(orderDetails?.objects) ? orderDetails?.objects[0] : orderDetails?.objects;
    const dayOfWeek = new Date(dateString).getDay(); // 0=So, 1=Mo, ...

    let defaultDailyHoursFromObject: number | null = null;
    if (objectSchedule) {
      switch (dayOfWeek) {
        case 1: defaultDailyHoursFromObject = objectSchedule.monday_hours || null; break;
        case 2: defaultDailyHoursFromObject = objectSchedule.tuesday_hours || null; break;
        case 3: defaultDailyHoursFromObject = objectSchedule.wednesday_hours || null; break;
        case 4: defaultDailyHoursFromObject = objectSchedule.thursday_hours || null; break;
        case 5: defaultDailyHoursFromObject = objectSchedule.friday_hours || null; break;
        case 6: defaultDailyHoursFromObject = objectSchedule.saturday_hours || null; break;
        case 0: defaultDailyHoursFromObject = objectSchedule.sunday_hours || null; break;
      }
    }

    // Use assignedDailyHours if provided, otherwise fallback to object's daily hours
    const finalAssignedDailyHours = assignedDailyHours !== null ? assignedDailyHours : defaultDailyHoursFromObject;

    // Prepare the daily hours object for upsert
    const dailyHoursToUpsert: { [key: string]: number | null } = {};
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    dayNames.forEach((day, index) => {
      // For drag-and-drop, we only have a single `assignedDailyHours` which applies to the dropped day.
      // For other days, we should either keep existing values or set to null.
      // For simplicity, when dragging, we'll set the dropped day's hours and clear others.
      // A more complex solution would involve fetching existing assignment and merging.
      if (index === dayOfWeek) { // If it's the day the order was dropped on
        dailyHoursToUpsert[`assigned_${day}_hours`] = finalAssignedDailyHours;
      } else {
        dailyHoursToUpsert[`assigned_${day}_hours`] = null; // Clear other days for this assignment
      }
    });

    // Check if assignment already exists
    const { data: existingAssignment, error: fetchError } = await supabase
      .from('order_employee_assignments')
      .select('id')
      .eq('order_id', orderId)
      .eq('employee_id', employeeId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existingAssignment) {
      // Update existing assignment
      const { error: updateError } = await supabase
        .from('order_employee_assignments')
        .update({ ...dailyHoursToUpsert })
        .eq('id', existingAssignment.id);
      if (updateError) throw updateError;
    } else {
      // Create new assignment
      const { error: insertError } = await supabase
        .from('order_employee_assignments')
        .insert({
          order_id: orderId,
          employee_id: employeeId,
          ...dailyHoursToUpsert,
        });
      if (insertError) throw insertError;
    }

    // Update order status to 'in_progress' if it was 'pending' or 'approved'
    const { data: orderStatus, error: orderStatusError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (orderStatusError) throw orderStatusError;

    if (orderStatus?.status === 'pending' || orderStatus?.status === 'approved') {
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
        link: "/employee/dashboard"
      });
    } else {
      console.warn(`Could not send notification for order assignment to employee ${employeeId}. User ID or order title missing.`);
    }

    revalidatePath("/dashboard/planning");
    revalidatePath("/dashboard/orders");
    revalidatePath("/employee/dashboard");
    return { success: true, message: "Auftrag erfolgreich zugewiesen!" };

  } catch (error: any) {
    console.error("Fehler beim Zuweisen des Auftrags:", error?.message || error);
    return { success: false, message: error.message };
  }
}