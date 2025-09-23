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
    first_name,
    last_name,
    email,
    phone,
    hire_date,
    status,
    contract_type,
    contract_end_date,
    hourly_rate,
    start_date,
    job_title,
    department,
    notes,
    address,
    date_of_birth,
    social_security_number,
    tax_id_number,
    health_insurance_provider,
    default_daily_schedules,
    default_recurrence_interval_weeks,
    default_start_week_offset,
  } = data;

  const { error } = await supabase
    .from('employees')
    .insert({
      user_id: user.id,
      first_name: first_name,
      last_name: last_name,
      email,
      phone,
      hire_date: hire_date ? hire_date.toISOString() : null,
      status,
      contract_type: contract_type,
      contract_end_date: contract_end_date ? contract_end_date.toISOString().split('T')[0] : null,
      hourly_rate: hourly_rate,
      start_date: start_date ? start_date.toISOString().split('T')[0] : null,
      job_title: job_title,
      department,
      notes,
      address,
      date_of_birth: date_of_birth ? date_of_birth.toISOString().split('T')[0] : null,
      social_security_number: social_security_number,
      tax_id_number: tax_id_number,
      health_insurance_provider: health_insurance_provider,
      default_daily_schedules,
      default_recurrence_interval_weeks,
      default_start_week_offset,
    });

  if (error) {
    console.error("Fehler beim Erstellen des Mitarbeiters:", error?.message || error);
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

  const { error } = await supabase
    .from('employees')
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      hire_date: data.hire_date ? data.hire_date.toISOString() : null,
      status: data.status,
      contract_type: data.contract_type,
      contract_end_date: data.contract_end_date ? data.contract_end_date.toISOString().split('T')[0] : null,
      hourly_rate: data.hourly_rate,
      start_date: data.start_date ? data.start_date.toISOString().split('T')[0] : null,
      job_title: data.job_title,
      department: data.department,
      notes: data.notes,
      address: data.address,
      date_of_birth: data.date_of_birth ? data.date_of_birth.toISOString().split('T')[0] : null,
      social_security_number: data.social_security_number,
      tax_id_number: data.tax_id_number,
      health_insurance_provider: data.health_insurance_provider,
      default_daily_schedules: data.default_daily_schedules,
      default_recurrence_interval_weeks: data.default_recurrence_interval_weeks,
      default_start_week_offset: data.default_start_week_offset,
    })
    .eq('id', employeeId);

  if (error) {
    console.error("Fehler beim Aktualisieren des Mitarbeiters:", error?.message || error);
    return { success: false, message: `Aktualisierung fehlgeschlagen: ${error.message}` };
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

  const employeeId = formData.get('employeeId') as string;

  // RLS will handle the permission check
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', employeeId);

  if (error) {
    console.error("Fehler beim Löschen des Mitarbeiters:", error?.message || error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/employees");
  return { success: true, message: "Mitarbeiter erfolgreich gelöscht!" };
}