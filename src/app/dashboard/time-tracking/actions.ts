"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { TimeEntryFormValues } from "@/components/time-entry-form";
import { getWeek, getDay, parseISO, formatISO } from 'date-fns';

export async function createTimeEntry(data: TimeEntryFormValues): Promise<{ success: boolean; message: string; newEntryId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const {
    employeeId,
    customerId,
    objectId,
    orderId,
    startDate,
    startTime,
    endDate,
    endTime,
    durationMinutes,
    breakMinutes,
    type,
    notes,
  } = data;

  let finalUserId = user.id;

  // If an admin/manager is creating an entry for a specific employee, find that employee's user_id
  if (employeeId) {
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('user_id')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee || !employee.user_id) {
      console.error("Fehler beim Abrufen des Mitarbeiter-Benutzers für Zeiteintrag:", employeeError?.message || employeeError);
      return { success: false, message: "Der ausgewählte Mitarbeiter ist keinem Benutzerkonto zugeordnet." };
    }
    finalUserId = employee.user_id;
  }

  // Combine date and time for start_time
  const startDateTime = new Date(startDate);
  const [startH, startM] = startTime.split(':').map(Number);
  startDateTime.setHours(startH, startM, 0, 0);

  let endDateTime: Date | null = null;
  if (endDate && endTime) {
    endDateTime = new Date(endDate);
    const [endH, endM] = endTime.split(':').map(Number);
    endDateTime.setHours(endH, endM, 0, 0);
  }

  // Calculate duration if start and end times are provided and durationMinutes is not
  let finalDurationMinutes = durationMinutes;
  if (startDateTime && endDateTime && finalDurationMinutes === null) {
    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    finalDurationMinutes = diffMs / (1000 * 60); // Convert milliseconds to minutes
  }

  const supabaseAdmin = createAdminClient();
  const { data: newEntry, error } = await supabaseAdmin
    .from('time_entries')
    .insert({
      user_id: finalUserId, // Use the correct user_id
      employee_id: employeeId,
      customer_id: customerId,
      object_id: objectId,
      order_id: orderId,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime ? endDateTime.toISOString() : null,
      duration_minutes: finalDurationMinutes,
      break_minutes: breakMinutes,
      type,
      notes,
    })
    .select('id')
    .single();

  if (error) {
    console.error("Fehler beim Erstellen des Zeiteintrags:", error?.message || error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/time-tracking");
  revalidatePath("/dashboard/planning"); // Revalidiere Planungsseite
  return { success: true, message: "Zeiteintrag erfolgreich hinzugefügt!", newEntryId: newEntry?.id };
}

export async function updateTimeEntry(entryId: string, data: Partial<TimeEntryFormValues>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const {
    employeeId,
    customerId,
    objectId,
    orderId,
    startDate,
    startTime,
    endDate,
    endTime,
    durationMinutes,
    breakMinutes, // Neues Feld
    type,
    notes,
  } = data;

  let startDateTime: Date | undefined;
  if (startDate && startTime) {
    startDateTime = new Date(startDate);
    const [startH, startM] = startTime.split(':').map(Number);
    startDateTime.setHours(startH, startM, 0, 0);
  }

  let endDateTime: Date | null | undefined = null;
  if (endDate && endTime) {
    endDateTime = new Date(endDate);
    const [endH, endM] = endTime.split(':').map(Number);
    endDateTime.setHours(endH, endM, 0, 0);
  } else if (endDate === null && endTime === null) {
    endDateTime = null; // Explizit auf null setzen, wenn beides null ist
  }


  // Dauer berechnen, falls Start- und Endzeiten angegeben sind und durationMinutes nicht
  let finalDurationMinutes = durationMinutes;
  if (startDateTime && endDateTime && finalDurationMinutes === null) {
    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    finalDurationMinutes = diffMs / (1000 * 60); // Millisekunden in Minuten umwandeln
  }

  const { error } = await supabase
    .from('time_entries')
    .update({
      employee_id: employeeId,
      customer_id: customerId,
      object_id: objectId,
      order_id: orderId,
      start_time: startDateTime ? startDateTime.toISOString() : undefined,
      end_time: endDateTime ? endDateTime.toISOString() : null,
      duration_minutes: finalDurationMinutes,
      break_minutes: breakMinutes, // Neues Feld aktualisieren
      type,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId);
    // RLS will handle the permission check for updates

  if (error) {
    console.error("Fehler beim Aktualisieren des Zeiteintrags:", error?.message || error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/time-tracking");
  revalidatePath("/dashboard/planning"); // Revalidiere Planungsseite
  return { success: true, message: "Zeiteintrag erfolgreich aktualisiert!" };
}

export async function deleteTimeEntry(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const entryId = formData.get('entryId') as string;

  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', entryId);
    // RLS will handle the permission check for deletes

  if (error) {
    console.error("Fehler beim Löschen des Zeiteintrags:", error?.message || error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/time-tracking");
  revalidatePath("/dashboard/planning"); // Revalidiere Planungsseite
  return { success: true, message: "Zeiteintrag erfolgreich gelöscht!" };
}

// Helper to parse daily schedules from JSONB
const parseDailySchedules = (jsonb: any): { day_of_week: string; week_offset_in_cycle: number; hours: number; start_time: string; end_time: string }[] => {
  if (!jsonb) return [];
  return Array.isArray(jsonb) ? jsonb : [];
};

export async function triggerAutomaticTimeEntryCreation(): Promise<{ success: boolean; message: string; createdCount?: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || profileError);
    return { success: false, message: "Nur Admins können diese Aktion ausführen." };
  }

  const supabaseAdmin = createAdminClient();
  const today = new Date();
  const currentWeekNumber = getWeek(today, { weekStartsOn: 1 }); // ISO week number, starts Monday
  const dayOfWeek = getDay(today); // 0=So, 1=Mo, ..., 6=Sa
  const dayNamesArray = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDayName = dayNamesArray[dayOfWeek];

  let createdCount = 0;

  try {
    // 1. Fetch all approved recurring/permanent/substitution orders with their objects and assignments
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select(`
        id, user_id, customer_id, object_id, title, recurring_start_date, recurring_end_date, due_date,
        objects ( recurrence_interval_weeks, start_week_offset, daily_schedules ),
        order_employee_assignments ( employee_id, assigned_recurrence_interval_weeks, assigned_start_week_offset, assigned_daily_schedules, employees ( user_id ) )
      `)
      .eq('request_status', 'approved')
      .in('order_type', ['permanent', 'recurring', 'substitution'])
      .lte('recurring_start_date', formatISO(today, { representation: 'date' }))
      .or(`recurring_end_date.is.null,recurring_end_date.gte.${formatISO(today, { representation: 'date'})}`);

    if (ordersError) throw ordersError;

    for (const order of orders) {
      const objectData = Array.isArray(order.objects) ? order.objects[0] : order.objects;
      const assignments = order.order_employee_assignments;

      if (!assignments || assignments.length === 0) continue;

      for (const assignment of assignments) {
        const employeeData = Array.isArray(assignment.employees) ? assignment.employees[0] : assignment.employees;
        if (!employeeData?.user_id) continue;

        // Determine recurrence settings, prioritizing assignment over object defaults
        const finalRecurrenceIntervalWeeks = assignment.assigned_recurrence_interval_weeks || objectData?.recurrence_interval_weeks || 1;
        const finalStartWeekOffset = assignment.assigned_start_week_offset || objectData?.start_week_offset || 0;

        // Determine the start week number for the order's recurrence calculation
        const orderStartDateForWeekCalc = order.recurring_start_date ? parseISO(order.recurring_start_date) : (order.due_date ? parseISO(order.due_date) : today);
        const startWeekNumber = getWeek(orderStartDateForWeekCalc, { weekStartsOn: 1 });

        // Check if the current week falls within the recurrence pattern
        const weekDifference = currentWeekNumber - startWeekNumber;
        if (finalRecurrenceIntervalWeeks > 1 && (weekDifference % finalRecurrenceIntervalWeeks) !== finalStartWeekOffset) {
          continue; // Skip this order/assignment if it's not in the correct recurrence week
        }

        // Get daily schedules, prioritizing assignment over object defaults
        const finalDailySchedules = parseDailySchedules(assignment.assigned_daily_schedules || objectData?.daily_schedules || '[]');
        const scheduleForToday = finalDailySchedules.find(s => 
          s.day_of_week === currentDayName && 
          s.week_offset_in_cycle === (weekDifference % finalRecurrenceIntervalWeeks)
        );

        if (!scheduleForToday || scheduleForToday.hours === null || scheduleForToday.hours <= 0 || !scheduleForToday.start_time || !scheduleForToday.end_time) {
          continue; // No valid schedule for today
        }

        // Check if an entry already exists for this employee, order, and date
        const { count: existingEntryCount, error: existingEntryError } = await supabaseAdmin
          .from('time_entries')
          .select('id', { count: 'exact', head: true })
          .eq('employee_id', assignment.employee_id)
          .eq('order_id', order.id)
          .eq('start_time', `${formatISO(today, { representation: 'date' })}T${scheduleForToday.start_time}:00.000Z`); // Match exact start time

        if (existingEntryError) throw existingEntryError;

        if (existingEntryCount === 0) {
          const startDateTime = new Date(today);
          const [startH, startM] = scheduleForToday.start_time.split(':').map(Number);
          startDateTime.setHours(startH, startM, 0, 0);

          const endDateTime = new Date(today);
          const [endH, endM] = scheduleForToday.end_time.split(':').map(Number);
          endDateTime.setHours(endH, endM, 0, 0);

          const grossDurationMinutes = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60);

          // Calculate break minutes based on gross duration
          let breakMinutes = 0;
          if (grossDurationMinutes > 9 * 60) {
              breakMinutes = 45;
          } else if (grossDurationMinutes > 6 * 60) {
              breakMinutes = 30;
          }

          // Insert the new time entry
          const { error: insertError } = await supabaseAdmin
            .from('time_entries')
            .insert({
              user_id: employeeData.user_id,
              employee_id: assignment.employee_id,
              customer_id: order.customer_id,
              object_id: order.object_id,
              order_id: order.id,
              start_time: startDateTime.toISOString(),
              end_time: endDateTime.toISOString(),
              duration_minutes: grossDurationMinutes,
              break_minutes: breakMinutes,
              type: 'automatic_scheduled_order',
              notes: `Automatisch erstellter Eintrag für ${order.title}`,
            });

          if (insertError) throw insertError;
          createdCount++;
        }
      }
    }

    revalidatePath("/dashboard/time-tracking");
    revalidatePath("/dashboard/planning");
    return { success: true, message: `Überprüfung abgeschlossen. ${createdCount} neue Zeiteinträge erstellt.`, createdCount: createdCount ?? 0 };
  } catch (error: any) {
    console.error("Fehler beim Ausführen der automatischen Zeiteintragserstellung:", error?.message || error);
    return { success: false, message: `Fehler bei der Erstellung: ${error.message}` };
  }
}