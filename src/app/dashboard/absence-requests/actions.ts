"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { AbsenceRequestFormValues } from "@/components/absence-request-form";
import { startOfMonth, endOfMonth } from "date-fns";
import { sendNotification } from "@/lib/actions/notifications";

export async function createAbsenceRequest(data: AbsenceRequestFormValues): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();
  const { data: { user: creator } } = await supabase.auth.getUser();

  if (!creator) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('user_id, first_name, last_name')
    .eq('id', data.employeeId)
    .single();

  if (employeeError || !employee || !employee.user_id) {
    console.error("Fehler beim Abrufen des Mitarbeiter-Benutzers:", employeeError?.message || employeeError);
    return { success: false, message: "Der ausgewählte Mitarbeiter ist keinem Benutzerkonto zugeordnet." };
  }

  const { error } = await supabase
    .from('absence_requests')
    .insert({
      user_id: employee.user_id,
      employee_id: data.employeeId,
      start_date: data.startDate.toISOString().split('T')[0],
      end_date: data.endDate.toISOString().split('T')[0],
      type: data.type,
      status: data.status,
      notes: data.notes,
      admin_notes: data.adminNotes,
    });

  if (error) {
    console.error("Fehler beim Erstellen des Abwesenheitsantrags:", error?.message || error);
    return { success: false, message: `Fehler beim Erstellen des Antrags: ${error.message}` };
  }

  // Notify admins and managers
  const supabaseAdmin = createAdminClient();
  const { data: adminsAndManagers } = await supabaseAdmin.from('profiles').select('id').in('role', ['admin', 'manager']);
  if (adminsAndManagers) {
    for (const admin of adminsAndManagers) {
      await sendNotification({
        userId: admin.id,
        title: "Neuer Abwesenheitsantrag",
        message: `Ein neuer Antrag von ${employee.first_name} ${employee.last_name} wurde eingereicht.`,
        link: "/dashboard/absence-requests"
      });
    }
  }

  revalidatePath("/dashboard/absence-requests");
  return { success: true, message: "Abwesenheitsantrag erfolgreich hinzugefügt!" };
}

export async function updateAbsenceRequest(requestId: string, data: Partial<AbsenceRequestFormValues>): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { data: originalRequest } = await supabase.from('absence_requests').select('user_id, status').eq('id', requestId).single();

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (data.employeeId) updateData.employee_id = data.employeeId;
  if (data.startDate) updateData.start_date = data.startDate.toISOString().split('T')[0];
  if (data.endDate) updateData.end_date = data.endDate.toISOString().split('T')[0];
  if (data.type) updateData.type = data.type;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profileError) { // Added error logging for profile fetching
    console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || profileError);
    return { success: false, message: "Fehler beim Überprüfen der Berechtigungen." };
  }

  if (profile?.role === 'admin' || profile?.role === 'manager') {
    if (data.status) updateData.status = data.status;
    if (data.adminNotes !== undefined) updateData.admin_notes = data.adminNotes;
  }

  const { error } = await supabase
    .from('absence_requests')
    .update(updateData)
    .eq('id', requestId);

  if (error) {
    console.error("Fehler beim Aktualisieren des Abwesenheitsantrags:", error?.message || error);
    return { success: false, message: error.message };
  }

  // Notify employee if status changed
  if (originalRequest && originalRequest.user_id && data.status && data.status !== originalRequest.status) {
    await sendNotification({
      userId: originalRequest.user_id,
      title: "Status Ihres Antrags aktualisiert",
      message: `Ihr Abwesenheitsantrag wurde ${data.status === 'approved' ? 'genehmigt' : 'abgelehnt'}.`,
      link: "/dashboard/absence-requests"
    });
  }

  revalidatePath("/dashboard/absence-requests");
  return { success: true, message: "Abwesenheitsantrag erfolgreich aktualisiert!" };
}

export async function deleteAbsenceRequest(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const requestId = formData.get('requestId') as string;

  const { error } = await supabase
    .from('absence_requests')
    .delete()
    .eq('id', requestId);

  if (error) {
    console.error("Fehler beim Löschen des Abwesenheitsantrags:", error?.message || error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/absence-requests");
  return { success: true, message: "Abwesenheitsantrag erfolgreich gelöscht!" };
}

export async function getAbsencesForMonth(date: Date) {
  const supabase = createClient();
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
    console.error("Fehler beim Laden der Abwesenheiten für den Kalender:", error?.message || error);
    return { success: false, message: error.message, data: [] };
  }

  return { success: true, message: "Daten geladen", data };
}