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
  estimated_hours: number | null;
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
        title,
        employee_id,
        order_type,
        due_date,
        estimated_hours,
        recurring_start_date,
        recurring_end_date,
        objects (
          monday_hours, tuesday_hours, wednesday_hours, thursday_hours,
          friday_hours, saturday_hours, sunday_hours
        )
      `)
      .not('employee_id', 'is', null);
    if (ordersError) throw ordersError;

    // 3. Alle genehmigten Abwesenheiten im Zeitraum abrufen
    const { data: absences, error: absencesError } = await supabase
      .from('absence_requests')
      .select('employee_id, start_date, end_date, type')
      .eq('status', 'approved')
      .lte('start_date', formatISO(end, { representation: 'date' }))
      .gte('end_date', formatISO(start, { representation: 'date' }));
    if (absencesError) throw absencesError;

    // 4. NEU: Ungeplante Aufträge abrufen
    const { data: unassignedOrdersData, error: unassignedOrdersError } = await supabase
      .from('orders')
      .select('id, title, estimated_hours, service_type')
      .is('employee_id', null)
      .in('order_type', ['one_time', 'substitution']) // Nur planbare Typen
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

        const employeeOrders = orders.filter(o => o.employee_id === employee.id);

        for (const order of employeeOrders) {
          let dailyHours = 0;
          let assignmentTitle = order.title;

          if (['permanent', 'recurring', 'substitution'].includes(order.order_type)) {
            if (order.recurring_start_date && parseISO(order.recurring_start_date) <= day && (!order.recurring_end_date || parseISO(order.recurring_end_date) >= day)) {
              if (order.objects) {
                const schedule = Array.isArray(order.objects) ? order.objects[0] : order.objects;
                if (schedule) {
                  switch (dayOfWeek) {
                    case 1: dailyHours = schedule.monday_hours || 0; break;
                    case 2: dailyHours = schedule.tuesday_hours || 0; break;
                    case 3: dailyHours = schedule.wednesday_hours || 0; break;
                    case 4: dailyHours = schedule.thursday_hours || 0; break;
                    case 5: dailyHours = schedule.friday_hours || 0; break;
                    case 6: dailyHours = schedule.saturday_hours || 0; break;
                    case 0: dailyHours = schedule.sunday_hours || 0; break;
                  }
                  assignmentTitle = `${order.title} (Plan)`;
                }
              }
            }
          } else if (order.order_type === 'one_time') {
            if (order.due_date && formatISO(parseISO(order.due_date), { representation: 'date' }) === dateString) {
              dailyHours = order.estimated_hours || 0;
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
    console.error("Fehler beim Laden der Plandaten:", error);
    return { success: false, data: null, message: error.message };
  }
}