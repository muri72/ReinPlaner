"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { TimeEntryFormValues } from "@/components/time-entry-form";

export async function createTimeEntry(data: TimeEntryFormValues) {
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
    type,
    notes,
  } = data;

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

  const { error } = await supabase
    .from('time_entries')
    .insert({
      user_id: user.id,
      employee_id: employeeId,
      customer_id: customerId,
      object_id: objectId,
      order_id: orderId,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime ? endDateTime.toISOString() : null,
      duration_minutes: finalDurationMinutes,
      type,
      notes,
    });

  if (error) {
    console.error("Fehler beim Erstellen des Zeiteintrags:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/time-tracking");
  return { success: true, message: "Zeiteintrag erfolgreich hinzugefügt!" };
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
      type,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId)
    .eq('user_id', user.id); // Sicherstellen, dass der Benutzer nur eigene Einträge aktualisieren kann

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
    .eq('id', entryId)
    .eq('user_id', user.id); // Sicherstellen, dass der Benutzer nur eigene Einträge löschen kann

  if (error) {
    console.error("Fehler beim Löschen des Zeiteintrags:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/time-tracking");
  return { success: true, message: "Zeiteintrag erfolgreich gelöscht!" };
}