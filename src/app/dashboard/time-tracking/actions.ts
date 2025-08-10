"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { TimeEntryFormValues } from "@/components/time-entry-form";

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
      console.error("Fehler beim Abrufen des Mitarbeiter-Benutzers für Zeiteintrag:", employeeError);
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
    console.error("Fehler beim Erstellen des Zeiteintrags:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/time-tracking");
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
    console.error("Fehler beim Aktualisieren des Zeiteintrags:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/time-tracking");
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
    console.error("Fehler beim Löschen des Zeiteintrags:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/time-tracking");
  return { success: true, message: "Zeiteintrag erfolgreich gelöscht!" };
}

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
    return { success: false, message: "Nur Admins können diese Aktion ausführen." };
  }

  const { data: createdCount, error: rpcError } = await supabase.rpc('create_missing_scheduled_time_entries');

  if (rpcError) {
    console.error("Fehler beim Ausführen der DB-Funktion:", rpcError);
    return { success: false, message: `Fehler bei der Erstellung: ${rpcError.message}` };
  }

  revalidatePath("/dashboard/time-tracking");
  return { success: true, message: `Überprüfung abgeschlossen. ${createdCount} neue Zeiteinträge erstellt.`, createdCount: createdCount ?? 0 };
}