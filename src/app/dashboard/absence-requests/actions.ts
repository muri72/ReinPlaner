"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { AbsenceRequestFormValues } from "@/components/absence-request-form";
import { startOfMonth, endOfMonth } from "date-fns";

export async function createAbsenceRequest(data: AbsenceRequestFormValues): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user: creator } } = await supabase.auth.getUser();

  if (!creator) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  // Get the user_id of the employee for whom the request is being created
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('user_id')
    .eq('id', data.employeeId)
    .single();

  if (employeeError || !employee || !employee.user_id) {
    console.error("Fehler beim Abrufen des Mitarbeiter-Benutzers:", employeeError);
    return { success: false, message: "Der ausgewählte Mitarbeiter ist keinem Benutzerkonto zugeordnet und es können keine Anträge für ihn gestellt werden." };
  }

  const employeeUserId = employee.user_id;

  // The RLS policies will now handle the permission check.
  // Admins/managers can insert due to the new policy.
  // Employees can insert for themselves due to the existing policy.
  const { error } = await supabase
    .from('absence_requests')
    .insert({
      user_id: employeeUserId, // Use the employee's user_id
      employee_id: data.employeeId,
      start_date: data.startDate.toISOString().split('T')[0],
      end_date: data.endDate.toISOString().split('T')[0],
      type: data.type,
      status: data.status,
      notes: data.notes,
      admin_notes: data.adminNotes,
    });

  if (error) {
    console.error("Fehler beim Erstellen des Abwesenheitsantrags:", error);
    return { success: false, message: `Fehler beim Erstellen des Antrags: ${error.message}` };
  }

  revalidatePath("/dashboard/absence-requests");
  return { success: true, message: "Abwesenheitsantrag erfolgreich hinzugefügt!" };
}

export async function updateAbsenceRequest(requestId: string, data: Partial<AbsenceRequestFormValues>): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  // Map form values to database columns
  if (data.employeeId) updateData.employee_id = data.employeeId;
  if (data.startDate) updateData.start_date = data.startDate.toISOString().split('T')[0];
  if (data.endDate) updateData.end_date = data.endDate.toISOString().split('T')[0];
  if (data.type) updateData.type = data.type;
  if (data.notes !== undefined) updateData.notes = data.notes;

  // Only admins/managers can update status and admin_notes
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role === 'admin' || profile?.role === 'manager') {
    if (data.status) updateData.status = data.status;
    if (data.adminNotes !== undefined) updateData.admin_notes = data.adminNotes;
  }

  const { error } = await supabase
    .from('absence_requests')
    .update(updateData)
    .eq('id', requestId);

  if (error) {
    console.error("Fehler beim Aktualisieren des Abwesenheitsantrags:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/absence-requests");
  return { success: true, message: "Abwesenheitsantrag erfolgreich aktualisiert!" };
}

export async function deleteAbsenceRequest(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const requestId = formData.get('requestId') as string;

  // RLS policies will handle the permission check
  const { error } = await supabase
    .from('absence_requests')
    .delete()
    .eq('id', requestId);

  if (error) {
    console.error("Fehler beim Löschen des Abwesenheitsantrags:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/absence-requests");
  return { success: true, message: "Abwesenheitsantrag erfolgreich gelöscht!" };
}

// New server action for the calendar
export async function getAbsencesForMonth(date: Date) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert.", data: [] };
  }

  const firstDay = startOfMonth(date);
  const lastDay = endOfMonth(date);

  const { data, error } = await supabase
    .from('absence_requests')
    .select(`
      start_date,
      end_date,
      type,
      employees ( id, first_name, last_name )
    `)
    .eq('status', 'approved')
    .lte('start_date', lastDay.toISOString().split('T')[0])
    .gte('end_date', firstDay.toISOString().split('T')[0]);

  if (error) {
    console.error("Fehler beim Laden der Abwesenheiten für den Kalender:", error);
    return { success: false, message: error.message, data: [] };
  }

  return { success: true, message: "Daten geladen", data };
}