"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { AbsenceRequestFormValues } from "@/components/absence-request-form";

export async function createAbsenceRequest(data: AbsenceRequestFormValues): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  // Check if the user is linked to the selected employee (for non-admins)
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id, user_id')
    .eq('id', data.employeeId)
    .single();

  if (employeeError || !employee) {
    console.error("Fehler beim Abrufen des Mitarbeiters:", employeeError);
    return { success: false, message: "Mitarbeiter nicht gefunden oder Fehler beim Abrufen." };
  }

  // Check user's role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error("Fehler beim Abrufen des Benutzerprofils:", profileError);
    return { success: false, message: "Fehler beim Überprüfen der Berechtigungen." };
  }

  const isAdminOrManager = profile?.role === 'admin' || profile?.role === 'manager';

  // If not admin/manager, ensure the request is for their own linked employee
  if (!isAdminOrManager && employee.user_id !== user.id) {
    return { success: false, message: "Sie können nur Abwesenheitsanträge für sich selbst einreichen." };
  }

  const { error } = await supabase
    .from('absence_requests')
    .insert({
      user_id: user.id, // The user who submits the request
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
    return { success: false, message: error.message };
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