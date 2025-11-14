"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { EmployeeFormValues } from "@/components/employee-form";

// Helper function to format date for database
const formatDateForDB = (date: Date | null | undefined): string | null => {
  if (!date) return null;
  try {
    // Convert to ISO string and extract date part
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
};

export async function createEmployee(data: EmployeeFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { error } = await supabase
    .from('employees')
    .insert({
      user_id: user.id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      hire_date: formatDateForDB(data.hire_date),
      status: data.status,
      contract_type: data.contract_type,
      contract_end_date: formatDateForDB(data.contract_end_date),
      hourly_rate: data.hourly_rate,
      start_date: formatDateForDB(data.start_date),
      job_title: data.job_title,
      department: data.department,
      notes: data.notes,
      address: data.address,
      date_of_birth: formatDateForDB(data.date_of_birth),
      social_security_number: data.social_security_number,
      tax_id_number: data.tax_id_number,
      health_insurance_provider: data.health_insurance_provider,
      can_work_holidays: data.can_work_holidays,
      default_daily_schedules: data.default_daily_schedules,
      default_recurrence_interval_weeks: data.default_recurrence_interval_weeks,
      default_start_week_offset: data.default_start_week_offset,
    });

  if (error) {
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

  if (!data.first_name || !data.last_name) {
    return { success: false, message: "Vorname und Nachname sind erforderlich." };
  }

  const updateData = {
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone,
    hire_date: formatDateForDB(data.hire_date),
    status: data.status,
    contract_type: data.contract_type,
    contract_end_date: formatDateForDB(data.contract_end_date),
    hourly_rate: data.hourly_rate,
    start_date: formatDateForDB(data.start_date),
    job_title: data.job_title,
    department: data.department,
    notes: data.notes,
    address: data.address,
    date_of_birth: formatDateForDB(data.date_of_birth),
    social_security_number: data.social_security_number,
    tax_id_number: data.tax_id_number,
    health_insurance_provider: data.health_insurance_provider,
    can_work_holidays: data.can_work_holidays,
    default_daily_schedules: data.default_daily_schedules,
    default_recurrence_interval_weeks: data.default_recurrence_interval_weeks,
    default_start_week_offset: data.default_start_week_offset,
  };

  const { data: updatedRows, error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', employeeId)
    .select();

  if (error) {
    return { success: false, message: `Aktualisierung fehlgeschlagen: ${error.message}` };
  }

  if (!updatedRows || updatedRows.length === 0) {
    return { success: false, message: "Mitarbeiter konnte nicht aktualisiert werden. Möglicherweise haben Sie keine Berechtigung." };
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

  const { data: deletedRows, error } = await supabase
    .from('employees')
    .delete()
    .eq('id', employeeId)
    .select();

  if (error) {
    return { success: false, message: error.message };
  }
  
  if (!deletedRows || deletedRows.length === 0) {
    return { success: false, message: "Mitarbeiter konnte nicht gelöscht werden. Möglicherweise haben Sie keine Berechtigung." };
  }

  revalidatePath("/dashboard/employees");
  return { success: true, message: "Mitarbeiter erfolgreich gelöscht!" };
}