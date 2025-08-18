"use server";

import { createClient } from "@/lib/supabase/server";
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
  total_estimated_hours: number | null; // Changed from estimated_hours
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

    // 2. Alle relevanten Aufträge abrufen (alle Typen mit Objekt-ID)
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
        object_id,
        objects (
          monday_hours, tuesday_hours, wednesday_hours, thursday_hours,
          friday_hours, saturday_hours, sunday_hours
        ),
        order_employee_assignments ( employee_id, assigned_daily_hours )
      `)
      .not('object_id', 'is', null) // Only orders linked to an object for scheduling
      .eq('request_status', 'approved'); // Only approved orders
    if (ordersError) throw ordersError;

    // 3. Alle genehmigten Abwesenheiten im Zeitraum abrufen
    const { data: absences, error: absencesError } = await supabase
      .from('absence_requests')
      .select('employee_id, start_date, end_date, type')
      .eq('status', 'approved')
      .lte('start_date', formatISO(end, { representation: 'date' }))
      .gte('end_date', formatISO(start, { representation: 'date' }));
    if (absencesError) throw absencesError;

    // 4. NEU: Ungeplante Aufträge abrufen (ohne Mitarbeiterzuweisung)
    const { data: unassignedOrdersData, error: unassignedOrdersError } = await supabase
      .from('orders')
      .select('id, title, total_estimated_hours, service_type')
      .is('object_id', null) // Only orders not linked to an object for now (simplification for planning)
      .is('employee_id', null) // Ensure no direct employee_id on order
      .eq('request_status', 'approved');
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

        // Filter orders that this employee is assigned to
        const employeeAssignedOrders = orders.filter(o =>
          o.order_employee_assignments.some(assignment => assignment.employee_id === employee.id)
        );

        for (const order of employeeAssignedOrders) {
          let dailyHours = 0;
          let assignmentTitle = order.title;

          const objectSchedule = Array.isArray(order.objects) ? order.objects[0] : order.objects;
          const employeeAssignment = order.order_employee_assignments.find(a => a.employee_id === employee.id);

          if (['permanent', 'recurring', 'substitution'].includes(order.order_type)) {
            if (order.recurring_start_date && parseISO(order.recurring_start_date) <= day && (!order.recurring_end_date || parseISO(order.recurring_end_date) >= day)) {
              if (objectSchedule) {
                let totalObjectDailyHours = 0;
                switch (dayOfWeek) {
                  case 1: totalObjectDailyHours = objectSchedule.monday_hours || 0; break;
                  case 2: totalObjectDailyHours = objectSchedule.tuesday_hours || 0; break;
                  case 3: totalObjectDailyHours = objectSchedule.wednesday_hours || 0; break;
                  case 4: totalObjectDailyHours = objectSchedule.thursday_hours || 0; break;
                  case 5: totalObjectDailyHours = objectSchedule.friday_hours || 0; break;
                  case 6: totalObjectDailyHours = objectSchedule.saturday_hours || 0; break;
                  case 0: totalObjectDailyHours = objectSchedule.sunday_hours || 0; break;
                }

                if (employeeAssignment?.assigned_daily_hours !== null) {
                  dailyHours = employeeAssignment?.assigned_daily_hours || 0;
                  assignmentTitle = `${order.title} (Individuell)`;
                } else {
                  // Calculate equally distributed hours if no individual hours are set
                  const assignedEmployeesCountForOrder = order.order_employee_assignments.length;
                  if (assignedEmployeesCountForOrder > 0) {
                    dailyHours = totalObjectDailyHours / assignedEmployeesCountForOrder;
                    assignmentTitle = `${order.title} (Verteilt)`;
                  }
                }
              }
            }
          } else if (order.order_type === 'one_time') {
            if (order.due_date && formatISO(parseISO(order.due_date), { representation: 'date' }) === dateString) {
              // For one-time orders, if assigned_daily_hours is set, use it. Otherwise, use total_estimated_hours divided by assigned employees.
              if (employeeAssignment?.assigned_daily_hours !== null) {
                dailyHours = employeeAssignment?.assigned_daily_hours || 0;
                assignmentTitle = `${order.title} (Individuell)`;
              } else {
                const assignedEmployeesCountForOrder = order.order_employee_assignments.length;
                if (assignedEmployeesCountForOrder > 0) {
                  dailyHours = (order.total_estimated_hours || 0) / assignedEmployeesCountForOrder;
                  assignmentTitle = `${order.title} (Verteilt)`;
                }
              }
            }
          }

          if (dailyHours > 0) {
            planningData[employee.id].schedule[dateString].totalHours += dailyHours;
            planningData[employee.id].schedule[dateString].assignments.push({
              title: assignmentTitle,
              hours: parseFloat(dailyHours.toFixed(1)), // Round for display
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