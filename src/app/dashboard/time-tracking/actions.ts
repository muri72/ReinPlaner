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

// TODO: Implement updateTimeEntry and deleteTimeEntry in future phases