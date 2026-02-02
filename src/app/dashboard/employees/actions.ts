"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { EmployeeFormValues } from "@/components/employee-form";
import { logDataChange } from "@/lib/audit-log";

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

  const { data: newEmployee, error } = await supabase
    .from('employees')
    .insert({
      user_id: user.id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      hire_date: formatDateForDB(data.hire_date),
      status: data.status,
      // Convert null/undefined to null for database
      contract_type: data.contract_type || null,
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
      // Vacation & Work settings
      working_days_per_week: data.working_days_per_week,
      contract_hours_per_week: data.contract_hours_per_week,
      vacation_balance: data.vacation_balance,
      // Lohngruppen settings (TV GD 2026)
      wage_group: data.wage_group || null,
      qualification: data.qualification || null,
      has_professional_education: data.has_professional_education || false,
      lohngruppen_eingruppung_datum: formatDateForDB(data.lohngruppen_eingruppung_datum),
      psa_type: data.psa_type || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: error.message };
  }

  // Create audit log
  await logDataChange(
    user.id,
    "INSERT",
    "employees",
    newEmployee.id,
    null,
    newEmployee
  );

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

  // Get old employee data for audit log
  const { data: oldEmployee } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .single();

  // Build update data
  const updateData: any = {
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone,
    hire_date: formatDateForDB(data.hire_date),
    status: data.status,
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
    // Vacation & Work settings
    working_days_per_week: data.working_days_per_week,
    contract_hours_per_week: data.contract_hours_per_week,
    vacation_balance: data.vacation_balance,
    // Lohngruppen settings (TV GD 2026)
    wage_group: data.wage_group || null,
    qualification: data.qualification || null,
    has_professional_education: data.has_professional_education || false,
    lohngruppen_eingruppung_datum: formatDateForDB(data.lohngruppen_eingruppung_datum),
    psa_type: data.psa_type || null,
  };

  // Conditionally add contract_type only if it has a value
  if (data.contract_type !== undefined) {
    updateData.contract_type = data.contract_type;
  }

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

  // Create audit log
  await logDataChange(
    user.id,
    "UPDATE",
    "employees",
    employeeId,
    oldEmployee,
    updatedRows[0]
  );

  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/absence-requests");
  return { success: true, message: "Mitarbeiter erfolgreich aktualisiert!" };
}

export async function deleteEmployee(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const employeeId = formData.get('employeeId') as string;

  // Get employee data before deletion for audit log
  const { data: employeeToDelete } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .single();

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

  // Create audit log
  if (employeeToDelete) {
    await logDataChange(
      user.id,
      "DELETE",
      "employees",
      employeeId,
      employeeToDelete,
      null
    );
  }

  revalidatePath("/dashboard/employees");
  return { success: true, message: "Mitarbeiter erfolgreich gelöscht!" };
}