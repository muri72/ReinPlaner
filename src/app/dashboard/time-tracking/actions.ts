"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { TimeEntryFormValues } from "@/components/time-entry-form";
import { getWeek, getDay, parseISO, formatISO, differenceInDays, startOfWeek, eachDayOfInterval } from 'date-fns';
import { de } from 'date-fns/locale';

const dayNames = [
  "sunday", "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday"
] as const;

// ============================================================================
// GENERATE MISSING SHIFTS FROM ASSIGNMENTS
// ============================================================================

export async function generateShiftsFromAssignments(
  startDate: string,
  endDate: string
): Promise<{ success: boolean; message: string; created: number }> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert.", created: 0 };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { success: false, message: "Nur Administratoren können diese Aktion ausführen.", created: 0 };
  }

  try {
    // 1. Fetch all active assignments with their schedules
    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from("order_employee_assignments")
      .select(`
        id,
        order_id,
        employee_id,
        assigned_daily_schedules,
        assigned_recurrence_interval_weeks,
        assigned_start_week_offset,
        start_date,
        end_date,
        status,
        orders!inner (
          id,
          title,
          objects (name, address)
        ),
        employees!inner (
          id,
          first_name,
          last_name
        )
      `)
      .eq("status", "active");

    if (assignmentsError) throw assignmentsError;

    // 2. Fetch existing shifts in the date range
    const { data: existingShifts, error: shiftsError } = await supabaseAdmin
      .from("shifts")
      .select("id, assignment_id, shift_date, shift_employees(employee_id)")
      .gte("shift_date", startDate)
      .lte("shift_date", endDate);

    if (shiftsError) throw shiftsError;

    // Build a map of existing shifts: key = assignment_id + date
    const existingShiftMap = new Map<string, string[]>();
    for (const shift of (existingShifts || [])) {
      if (!shift?.assignment_id || !shift?.shift_date) continue;
      const key = `${shift.assignment_id}_${shift.shift_date}`;
      if (!existingShiftMap.has(key)) {
        existingShiftMap.set(key, []);
      }
      const empIds = shift.shift_employees?.map((se: any) => se.employee_id) || [];
      existingShiftMap.set(key, empIds);
    }

    // 3. Calculate date range
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const weekDays = eachDayOfInterval({ start, end });

    // 4. Build list of shifts to create
    const shiftsToCreate: any[] = [];

    for (const assignment of (assignments || [])) {
      const empArray = Array.isArray(assignment.employees) ? assignment.employees : [assignment.employees].filter(Boolean);
      const employee = empArray[0];
      const order = Array.isArray(assignment.orders) ? assignment.orders[0] : assignment.orders;
      if (!employee || !order) continue;

      const assignmentStart = assignment.start_date ? parseISO(assignment.start_date) : null;
      const assignmentEnd = assignment.end_date ? parseISO(assignment.end_date) : null;

      const recurrenceInterval = assignment.assigned_recurrence_interval_weeks || 1;
      const startOffset = assignment.assigned_start_week_offset || 0;
      const dailySchedules = assignment.assigned_daily_schedules || [];

      const referenceDate = assignmentStart || start;
      const daysPassed = differenceInDays(start, startOfWeek(referenceDate, { weekStartsOn: 1 }));
      const weeksPassed = Math.floor(daysPassed / 7);
      const effectiveWeekIndex = (weeksPassed + startOffset) % recurrenceInterval;
      const weekSchedule = dailySchedules[effectiveWeekIndex];

      for (const day of weekDays) {
        const dateString = formatISO(day, { representation: "date" });
        const dayOfWeek = getDay(day);
        const dayKey = dayNames[dayOfWeek];

        // Skip if before assignment starts or after assignment ends
        if (assignmentStart && day < assignmentStart) continue;
        if (assignmentEnd && day > assignmentEnd) continue;

        // Get schedule for this day
        const daySchedule = (weekSchedule as any)?.[dayKey];
        if (!daySchedule || !daySchedule.hours || daySchedule.hours <= 0) continue;

        // Check if shift already exists for this assignment on this date
        const existingKey = `${assignment.id}_${dateString}`;
        const existingEmpIds = existingShiftMap.get(existingKey) || [];

        // Check if this employee already has a shift
        if (existingEmpIds.includes(employee.id)) continue;

        // Create new shift
        shiftsToCreate.push({
          assignment_id: assignment.id,
          shift_date: dateString,
          start_time: daySchedule.start || null,
          end_time: daySchedule.end || null,
          estimated_hours: daySchedule.hours,
          status: 'scheduled',
          created_at: new Date().toISOString(),
          employee_id: employee.id,
          order_id: order.id,
          order_title: order.title,
          employee_name: `${employee.first_name} ${employee.last_name}`,
        });
      }
    }

    // 5. Insert shifts in batches
    let createdCount = 0;
    const batchSize = 50;

    for (let i = 0; i < shiftsToCreate.length; i += batchSize) {
      const batch = shiftsToCreate.slice(i, i + batchSize);

      // Prepare shift data for insertion
      const shiftsData = batch.map((item) => ({
        assignment_id: item.assignment_id,
        shift_date: item.shift_date,
        start_time: item.start_time,
        end_time: item.end_time,
        estimated_hours: item.estimated_hours,
        status: item.status,
        created_at: item.created_at,
      }));

      const { data: insertedShifts, error: insertError } = await supabaseAdmin
        .from("shifts")
        .insert(shiftsData)
        .select("id, assignment_id, shift_date");

      if (insertError) {
        continue;
      }

      // Create shift_employee entries
      for (let j = 0; j < (insertedShifts || []).length; j++) {
        const shift = insertedShifts![j];
        const batchItem = batch[j];

        await supabaseAdmin.from("shift_employees").insert({
          shift_id: shift.id,
          employee_id: batchItem.employee_id,
          role: "worker",
          is_confirmed: false,
        });

        createdCount++;
      }
    }

    revalidatePath("/dashboard/planning");
    revalidatePath("/dashboard/time-tracking");

    return {
      success: true,
      message: `${createdCount} Einsätze wurden erfolgreich generiert.`,
      created: createdCount,
    };
  } catch (error: any) {
    return { success: false, message: `Fehler: ${error.message}`, created: 0 };
  }
}

// ============================================================================
// GENERATE TIME ENTRIES FROM COMPLETED SHIFTS
// ============================================================================

export async function generateTimeEntriesFromShifts(
  startDate: string,
  endDate: string
): Promise<{ success: boolean; message: string; created: number; skipped: number }> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert.", created: 0, skipped: 0 };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { success: false, message: "Nur Administratoren können diese Aktion ausführen.", created: 0, skipped: 0 };
  }

  try {
    // 1. Fetch completed shifts with their employees and related data
    // Note: shifts table has order_id, not job_id. Join via orders to get customer_id/object_id
    const { data: shifts, error: shiftsError } = await supabaseAdmin
      .from("shifts")
      .select(`
        id,
        shift_date,
        start_time,
        end_time,
        estimated_hours,
        status,
        assignment_id,
        order_id,
        notes,
        shift_employees (
          id,
          employee_id,
          role,
          is_confirmed,
          actual_start_time,
          actual_end_time,
          actual_hours,
          employees (
            id,
            user_id,
            first_name,
            last_name
          )
        ),
        orders!inner (
          id,
          customer_id,
          object_id
        )
      `)
      .eq("status", "completed")
      .gte("shift_date", startDate)
      .lte("shift_date", endDate);

    if (shiftsError) throw shiftsError;

    // 2. Fetch existing time entries for these shifts to avoid duplicates
    const shiftIds = (shifts || []).map(s => s.id);
    const { data: existingTimeEntries, error: existingError } = await supabaseAdmin
      .from("time_entries")
      .select("shift_id, employee_id")
      .in("shift_id", shiftIds);

    if (existingError) throw existingError;

    // Build a map of existing time entries: key = shift_id_employee_id
    const existingEntryMap = new Set<string>();
    for (const entry of (existingTimeEntries || [])) {
      if (entry.shift_id && entry.employee_id) {
        existingEntryMap.add(`${entry.shift_id}_${entry.employee_id}`);
      }
    }

    // 3. Build list of time entries to create
    const timeEntriesToCreate: any[] = [];

    for (const shift of (shifts || [])) {
      for (const se of (shift.shift_employees || [])) {
        const empArray = Array.isArray(se.employees) ? se.employees : [se.employees].filter(Boolean);
        const employee = empArray[0];
        if (!employee) continue;

        // Check if time entry already exists for this shift-employee combination
        const entryKey = `${shift.id}_${employee.id}`;
        if (existingEntryMap.has(entryKey)) {
          continue;
        }

        // Build time entry data
        const timeEntryData = buildTimeEntryData(shift, se, employee);
        if (timeEntryData) {
          timeEntriesToCreate.push(timeEntryData);
        }
      }
    }

    // 4. Insert time entries in batches
    let createdCount = 0;
    let skippedCount = 0;
    const batchSize = 50;

    for (let i = 0; i < timeEntriesToCreate.length; i += batchSize) {
      const batch = timeEntriesToCreate.slice(i, i + batchSize);

      const { data: insertedEntries, error: insertError } = await supabaseAdmin
        .from("time_entries")
        .insert(batch)
        .select("id");

      if (insertError) {
        skippedCount += batch.length;
        continue;
      }

      createdCount += insertedEntries?.length || 0;
    }

    revalidatePath("/dashboard/planning");
    revalidatePath("/dashboard/time-tracking");

    return {
      success: true,
      message: `${createdCount} Zeiteinträge wurden erfolgreich aus abgeschlossenen Einsätzen generiert. ${skippedCount > 0 ? `(${skippedCount} bereits vorhanden)` : ''}`,
      created: createdCount,
      skipped: skippedCount,
    };
  } catch (error: any) {
    return { success: false, message: `Fehler: ${error.message}`, created: 0, skipped: 0 };
  }
}

// ============================================================================
// HELPER: Build time entry data for a single shift-employee combination
// ============================================================================

function buildTimeEntryData(shift: any, shiftEmployee: any, employee: any): any | null {
  // Calculate duration from actual hours or estimated hours
  let durationMinutes: number | null = null;
  if (shiftEmployee.actual_hours) {
    durationMinutes = Number(shiftEmployee.actual_hours) * 60;
  } else if (shift.estimated_hours) {
    durationMinutes = Number(shift.estimated_hours) * 60;
  }

  // Calculate break based on duration
  let breakMinutes = 0;
  if (durationMinutes !== null) {
    breakMinutes = calculateBreakMinutesFallback(durationMinutes);
  }

  // Build datetime from shift_date and start_time/end_time
  // IMPORTANT: Shift times are stored as local time (TIME type), so we need to preserve them
  // by creating the timestamp with the correct timezone offset (Europe/Berlin = UTC+1 in winter)
  let startTime: string | null = null;
  let endTime: string | null = null;

  if (shift.start_time && shift.shift_date) {
    // Create timestamp with explicit timezone offset to preserve local time
    // Europe/Berlin is UTC+1 in winter, UTC+2 in summer
    const month = parseInt(shift.shift_date.split('-')[1]);
    const offset = (month >= 3 && month <= 10) ? '+02:00' : '+01:00'; // DST aware
    // Handle both HH:mm and HH:mm:ss formats
    const timePart = shift.start_time.split(':').length === 2 ? `${shift.start_time}:00` : shift.start_time;
    startTime = `${shift.shift_date}T${timePart}${offset}`;
  }

  if (shift.end_time && shift.shift_date) {
    const month = parseInt(shift.shift_date.split('-')[1]);
    const offset = (month >= 3 && month <= 10) ? '+02:00' : '+01:00';
    // Handle both HH:mm and HH:mm:ss formats
    const timePart = shift.end_time.split(':').length === 2 ? `${shift.end_time}:00` : shift.end_time;
    let endTimestamp = `${shift.shift_date}T${timePart}${offset}`;

    // Handle overnight shifts
    if (shift.start_time && shift.end_time) {
      const [startH] = shift.start_time.split(':').map(Number);
      const [endH] = shift.end_time.split(':').map(Number);
      if (endH < startH) {
        // End time is next day - add one day to the date
        const nextDay = new Date(shift.shift_date);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split('T')[0];
        endTimestamp = `${nextDayStr}T${timePart}${offset}`;
      }
    }

    endTime = endTimestamp;
  }

  // Get customer_id and object_id from orders (shifts join orders via order_id)
  const orderArray = Array.isArray(shift.orders) ? shift.orders : [shift.orders].filter(Boolean);
  const order = orderArray[0];

  return {
    // user_id komplett entfernt - Zeiteinträge werden nur mit employee_id verknüpft
    // Mitarbeiter können ohne Login-Account (user_id = NULL) Zeiteinträge haben
    employee_id: employee.id,
    customer_id: order?.customer_id || null,
    object_id: order?.object_id || null,
    order_id: order?.id || null,
    shift_id: shift.id,
    start_time: startTime,
    end_time: endTime,
    duration_minutes: durationMinutes,
    break_minutes: breakMinutes,
    type: 'shift',
    notes: shift.notes || null,
    created_at: new Date().toISOString(),
  };
}

// ============================================================================
// GENERATE TIME ENTRIES FOR A SINGLE SHIFT (used when shift is completed)
// ============================================================================

export async function generateTimeEntriesForShift(shiftId: string): Promise<{ success: boolean; message: string; created: number }> {
  const supabaseAdmin = createAdminClient();

  try {
    // 1. Fetch the completed shift with its employees and related data
    // Note: employees!inner changed to employees (left join) to support employees without user_id
    const { data: shift, error: shiftError } = await supabaseAdmin
      .from("shifts")
      .select(`
        id,
        shift_date,
        start_time,
        end_time,
        estimated_hours,
        status,
        assignment_id,
        order_id,
        notes,
        shift_employees (
          id,
          employee_id,
          role,
          is_confirmed,
          actual_start_time,
          actual_end_time,
          actual_hours,
          employees (
            id,
            user_id,
            first_name,
            last_name
          )
        ),
        orders!inner (
          id,
          customer_id,
          object_id
        )
      `)
      .eq("id", shiftId)
      .eq("status", "completed")
      .single();

    if (shiftError) {
      return { success: false, message: "Shift nicht gefunden oder nicht abgeschlossen.", created: 0 };
    }

    // 2. Fetch existing time entries for this shift to avoid duplicates
    const { data: existingTimeEntries, error: existingError } = await supabaseAdmin
      .from("time_entries")
      .select("employee_id")
      .eq("shift_id", shiftId);

    if (existingError) throw existingError;

    // Build a set of existing employee IDs
    const existingEmployees = new Set((existingTimeEntries || []).map(e => e.employee_id));

    // 3. Build and insert time entries for employees without existing entries
    const timeEntriesToCreate: any[] = [];

    for (const se of (shift.shift_employees || [])) {
      const empArray = Array.isArray(se.employees) ? se.employees : [se.employees].filter(Boolean);
      const employee = empArray[0];
      if (!employee) {
        continue;
      }

      // Check if time entry already exists for this shift-employee combination
      if (existingEmployees.has(employee.id)) {
        continue;
      }

      // Build time entry data
      const timeEntryData = buildTimeEntryData(shift, se, employee);
      if (timeEntryData) {
        timeEntriesToCreate.push(timeEntryData);
      }
    }

    if (timeEntriesToCreate.length === 0) {
      return { success: true, message: "Keine neuen Zeiteinträge erforderlich.", created: 0 };
    }

    // 4. Insert time entries
    const { data: insertedEntries, error: insertError } = await supabaseAdmin
      .from("time_entries")
      .insert(timeEntriesToCreate)
      .select("id");

    if (insertError) {
      // If it's a duplicate key error, the entry already exists - treat as success
      if (insertError.code === '23505') {
        return { success: true, message: "Zeiteintrag bereits vorhanden.", created: 0 };
      }
      return { success: false, message: `Fehler beim Erstellen der Zeiteinträge: ${insertError.message}`, created: 0 };
    }

    const createdCount = insertedEntries?.length || 0;

    revalidatePath("/dashboard/planning");
    revalidatePath("/dashboard/time-tracking");

    return {
      success: true,
      message: `${createdCount} Zeiteintrag${createdCount === 1 ? '' : 'e'} automatisch erstellt.`,
      created: createdCount,
    };
  } catch (error: any) {
    return { success: false, message: `Fehler: ${error.message}`, created: 0 };
  }
}

// ============================================================================
// TIME ENTRY FUNCTIONS
// ============================================================================

// Helper function to calculate break minutes based on gross duration (same as in reports/actions.ts)
function calculateBreakMinutesFallback(grossDurationMinutes: number): number {
  if (grossDurationMinutes >= 9 * 60) { // More than 9 hours (540 minutes)
    return 45;
  } else if (grossDurationMinutes >= 6 * 60) { // More than 6 hours (360 minutes)
    return 30;
  }
  return 0;
}

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
    shiftId,
    startDate,
    startTime,
    endDate,
    endTime,
    durationMinutes,
    breakMinutes,
    type,
    notes,
  } = data;

  // Verify employee exists if employeeId is provided
  if (employeeId) {
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      console.error("Fehler beim Abrufen des Mitarbeiters für Zeiteintrag:", employeeError?.message || employeeError);
      return { success: false, message: "Mitarbeiter nicht gefunden." };
    }
    // user_id Prüfung entfernt - Zeiteintrag wird nur mit employee_id verknüpft
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
  let finalBreakMinutes = breakMinutes;

  if (startDateTime && endDateTime && finalDurationMinutes === null) {
    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    finalDurationMinutes = diffMs / (1000 * 60); // Convert milliseconds to minutes
    // If breakMinutes is not explicitly set, calculate it based on the gross duration
    if (finalBreakMinutes === null) {
      finalBreakMinutes = calculateBreakMinutesFallback(finalDurationMinutes ?? 0); // Use ?? 0
    }
  } else if (finalDurationMinutes !== null && finalBreakMinutes === null) {
    // If durationMinutes is provided but breakMinutes is not, calculate breakMinutes based on provided duration
    finalBreakMinutes = calculateBreakMinutesFallback(finalDurationMinutes ?? 0); // Use ?? 0
  }


  const supabaseAdmin = createAdminClient();
  const { data: newEntry, error } = await supabaseAdmin
    .from('time_entries')
    .insert({
      user_id: null, // Kein user_id mehr benötigt - employee_id reicht
      employee_id: employeeId,
      customer_id: customerId,
      object_id: objectId,
      order_id: orderId,
      shift_id: shiftId,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime ? endDateTime.toISOString() : null,
      duration_minutes: finalDurationMinutes,
      break_minutes: finalBreakMinutes,
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
    shiftId,
    startDate,
    startTime,
    endDate,
    endTime,
    durationMinutes,
    breakMinutes,
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
  let finalBreakMinutes = breakMinutes;
  if (startDateTime && endDateTime && finalDurationMinutes === null) {
    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    finalDurationMinutes = diffMs / (1000 * 60); // Millisekunden in Minuten umwandeln
    // If breakMinutes is not explicitly set, calculate it based on the gross duration
    if (finalBreakMinutes === null) {
      finalBreakMinutes = calculateBreakMinutesFallback(finalDurationMinutes ?? 0); // Use ?? 0
    }
  } else if (finalDurationMinutes !== null && finalBreakMinutes === null) {
    // If durationMinutes is provided but breakMinutes is not, calculate breakMinutes based on provided duration
    finalBreakMinutes = calculateBreakMinutesFallback(finalDurationMinutes ?? 0); // Use ?? 0
  }

  const { error } = await supabase
    .from('time_entries')
    .update({
      employee_id: employeeId,
      customer_id: customerId,
      object_id: objectId,
      order_id: orderId,
      shift_id: shiftId,
      start_time: startDateTime ? startDateTime.toISOString() : undefined,
      end_time: endDateTime ? endDateTime.toISOString() : null,
      duration_minutes: finalDurationMinutes,
      break_minutes: finalBreakMinutes, // Neues Feld aktualisieren
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

/**
 * Delete time entries for a specific shift and employee.
 * Used when reassigning a shift to a different employee.
 */
export async function deleteTimeEntriesForShiftAndEmployee(
  shiftId: string,
  employeeId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  try {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('shift_id', shiftId)
      .eq('employee_id', employeeId);

    if (error) {
      console.error("Fehler beim Löschen der Zeiteinträge:", error?.message || error);
      return { success: false, message: error.message };
    }

    revalidatePath("/dashboard/time-tracking");
    revalidatePath("/dashboard/planning");
    return { success: true, message: "Zeiteinträge erfolgreich gelöscht!" };
  } catch (error: any) {
    console.error("Fehler beim Löschen der Zeiteinträge:", error?.message || error);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}

interface TimeEntry {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  break_minutes: number | null;
  type: string;
  notes: string | null;
  user_id: string | null;  // Optional - Zeiteinträge können ohne Login-Account existieren
  employee_id: string | null;
  customer_id: string | null;
  object_id: string | null;
  order_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function stopTimeEntry(entryId: string): Promise<{ success: boolean; message: string; data?: TimeEntry }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const now = new Date();
  
  const { data: entry, error } = await supabase
    .from('time_entries')
    .update({
      end_time: now.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId)
    .select('*')
    .single();

  if (error) {
    console.error("Fehler beim Beenden des Zeiteintrags:", error?.message || error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/time-tracking");
  revalidatePath("/dashboard/planning");
  return { success: true, message: "Zeiteintrag beendet!", data: entry };
}

// ============================================================================
// MIGRATION: Fix existing time entries where break was incorrectly subtracted
// ============================================================================

export async function migrateExistingTimeEntries(): Promise<{
  success: boolean;
  message: string;
  fixed_count: number;
}> {
  const supabaseAdmin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert.", fixed_count: 0 };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { success: false, message: "Nur Administratoren können diese Aktion ausführen.", fixed_count: 0 };
  }

  try {
    // Alle shift-Zeiträge mit Start/Ende laden
    const { data: entries, error } = await supabaseAdmin
      .from("time_entries")
      .select("id, start_time, end_time, duration_minutes, break_minutes")
      .eq("type", "shift")
      .not("start_time", "is", null)
      .not("end_time", "is", null);

    if (error) throw error;

    let fixedCount = 0;

    for (const entry of entries || []) {
      // Berechne die tatsächliche Brutto-Dauer aus Start/Ende
      const start = new Date(entry.start_time);
      const end = new Date(entry.end_time);
      const grossDurationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

      // Wenn die gespeicherte duration kleiner ist als die Brutto-Dauer,
      // wurde die Pause bereits abgezogen → korrigieren
      if (entry.duration_minutes && entry.duration_minutes < grossDurationMinutes) {
        const { error: updateError } = await supabaseAdmin
          .from("time_entries")
          .update({ duration_minutes: grossDurationMinutes })
          .eq("id", entry.id);

        if (!updateError) {
          fixedCount++;
        }
      }
    }

    revalidatePath("/dashboard/time-tracking");
    revalidatePath("/dashboard/planning");

    return {
      success: true,
      message: `${fixedCount} Zeiteinträge wurden korrigiert.`,
      fixed_count: fixedCount,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Fehler: ${error.message}`,
      fixed_count: 0,
    };
  }
}