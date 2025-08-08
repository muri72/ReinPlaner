"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { EmployeeFormValues } from "@/components/employee-form";

export async function createEmployee(data: EmployeeFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    hireDate,
    status,
    contractType,
    hourlyRate,
    startDate,
    jobTitle,
    department,
    notes,
    address, // Neues Feld
    dateOfBirth, // Neues Feld
    socialSecurityNumber, // Neues Feld
    taxIdNumber, // Neues Feld
    healthInsuranceProvider, // Neues Feld
  } = data;

  const { error } = await supabase
    .from('employees')
    .insert({
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      hire_date: hireDate ? hireDate.toISOString() : null,
      status,
      contract_type: contractType,
      hourly_rate: hourlyRate,
      start_date: startDate ? startDate.toISOString().split('T')[0] : null,
      job_title: jobTitle,
      department,
      notes,
      address, // Neues Feld
      date_of_birth: dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : null, // Nur Datum speichern
      social_security_number: socialSecurityNumber, // Neues Feld
      tax_id_number: taxIdNumber, // Neues Feld
      health_insurance_provider: healthInsuranceProvider, // Neues Feld
    });

  if (error) {
    console.error("Fehler beim Erstellen des Mitarbeiters:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/employees");
  return { success: true, message: "Mitarbeiter erfolgreich hinzugefügt!" };
}

export async function updateEmployee(employeeId: string, data: EmployeeFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  // Überprüfen, ob der aktuelle Benutzer ein Admin ist
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error("Fehler beim Abrufen des Benutzerprofils:", profileError);
    return { success: false, message: "Fehler beim Überprüfen der Berechtigungen." };
  }

  let query = supabase
    .from('employees')
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      hire_date: data.hireDate ? data.hireDate.toISOString() : null,
      status: data.status,
      contract_type: data.contractType,
      hourly_rate: data.hourlyRate,
      start_date: data.startDate ? data.startDate.toISOString().split('T')[0] : null,
      job_title: data.jobTitle,
      department: data.department,
      notes: data.notes,
      address: data.address,
      date_of_birth: data.dateOfBirth ? data.dateOfBirth.toISOString().split('T')[0] : null,
      social_security_number: data.socialSecurityNumber,
      tax_id_number: data.taxIdNumber,
      health_insurance_provider: data.healthInsuranceProvider,
    })
    .eq('id', employeeId);

  // Wenn der Benutzer kein Admin ist, nur eigene Mitarbeiter aktualisieren
  if (profile?.role !== 'admin') {
    query = query.eq('user_id', user.id);
  }

  const { data: updatedRows, error } = await query.select();

  if (error) {
    console.error("Fehler beim Aktualisieren des Mitarbeiters:", error);
    return { success: false, message: error.message };
  }

  if (!updatedRows || updatedRows.length === 0) {
    console.warn(`Update-Operation für Mitarbeiter-ID ${employeeId} durch Benutzer ${user.id} führte zu keiner Aktualisierung. Dies könnte ein RLS-Problem sein oder der Datensatz existiert nicht/gehört nicht dem Benutzer.`);
    return { success: false, message: "Mitarbeiter konnte nicht aktualisiert werden. Möglicherweise haben Sie keine Berechtigung oder der Mitarbeiter existiert nicht." };
  }

  revalidatePath("/dashboard/employees");
  return { success: true, message: "Mitarbeiter erfolgreich aktualisiert!" };
}

export async function deleteEmployee(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  // Überprüfen, ob der aktuelle Benutzer ein Admin ist
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error("Fehler beim Abrufen des Benutzerprofils:", profileError);
    return { success: false, message: "Fehler beim Überprüfen der Berechtigungen." };
  }

  const employeeId = formData.get('employeeId') as string;

  let query = supabase
    .from('employees')
    .delete()
    .eq('id', employeeId);

  // Wenn der Benutzer kein Admin ist, nur eigene Mitarbeiter löschen
  if (profile?.role !== 'admin') {
    query = query.eq('user_id', user.id);
  }

  const { error } = await query;

  if (error) {
    console.error("Fehler beim Löschen des Mitarbeiters:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/employees");
  return { success: true, message: "Mitarbeiter erfolgreich gelöscht!" };
}