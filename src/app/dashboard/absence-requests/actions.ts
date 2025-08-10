"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import * as z from "zod";

// Define the schema for absence request form values
export const absenceRequestSchema = z.object({
  employeeId: z.string().uuid("Ungültige Mitarbeiter-ID").min(1, "Mitarbeiter ist erforderlich"),
  startDate: z.date({ required_error: "Startdatum ist erforderlich" }),
  endDate: z.date({ required_error: "Enddatum ist erforderlich" }),
  type: z.enum(["vacation", "sick_leave", "training", "other"], { required_error: "Abwesenheitstyp ist erforderlich" }).default("vacation"),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  notes: z.string().max(500, "Notizen sind zu lang").optional().nullable(),
  adminNotes: z.string().max(500, "Admin-Notizen sind zu lang").optional().nullable(),
}).refine((data) => data.endDate >= data.startDate, {
  message: "Enddatum muss nach oder am Startdatum liegen.",
  path: ["endDate"],
});

export type AbsenceRequestFormValues = z.infer<typeof absenceRequestSchema>;

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

export async function updateAbsenceRequest(requestId: string, data: AbsenceRequestFormValues): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
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

  // Fetch the existing request to check ownership/permissions
  const { data: existingRequest, error: fetchError } = await supabase
    .from('absence_requests')
    .select('user_id, status')
    .eq('id', requestId)
    .single();

  if (fetchError || !existingRequest) {
    console.error("Fehler beim Abrufen des bestehenden Antrags:", fetchError);
    return { success: false, message: "Abwesenheitsantrag nicht gefunden oder Fehler beim Abrufen." };
  }

  // Determine which fields can be updated based on role and current status
  const updateData: Partial<AbsenceRequestFormValues> = {
    employee_id: data.employeeId,
    start_date: data.startDate.toISOString().split('T')[0],
    end_date: data.endDate.toISOString().split('T')[0],
    type: data.type,
    notes: data.notes,
    updated_at: new Date().toISOString(),
  };

  // Admins/Managers can change status and admin_notes
  if (isAdminOrManager) {
    updateData.status = data.status;
    updateData.admin_notes = data.adminNotes;
  } else {
    // Employees can only update their own pending requests
    if (existingRequest.user_id !== user.id || existingRequest.status !== 'pending') {
      return { success: false, message: "Sie können diesen Antrag nicht aktualisieren." };
    }
    // Ensure employees don't try to change status or admin_notes
    delete updateData.status;
    delete updateData.admin_notes;
  }

  const { error } = await supabase
    .from('absence_requests')
    .update(updateData)
    .eq('id', requestId)
    .eq('user_id', existingRequest.user_id); // Ensure only the original submitter or admin can update via RLS

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

  // RLS policies will handle the permission check (only admins/managers or owner of pending request)
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