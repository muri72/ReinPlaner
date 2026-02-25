"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { EmployeeFormValues } from "@/components/employee-form";
import { logDataChange } from "@/lib/audit-log";
import { trackSupabaseError, addBreadcrumb } from "@/lib/sentry";

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

// Helper function to convert empty strings to null for database
const emptyStringToNull = (value: string | null | undefined): string | null => {
  if (value === "" || value === undefined || value === null) return null;
  return value;
};

// Helper function to convert empty strings to null for numeric fields
const emptyStringToNullNumber = (value: number | string | null | undefined): number | null => {
  if (value === "" || value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }
  return value;
};

export async function createEmployee(data: EmployeeFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Add breadcrumb for employee creation start
  addBreadcrumb('Creating new employee', 'employee', 'info', {
    firstName: data.first_name,
    lastName: data.last_name,
    contractType: data.contract_type,
  });

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  // Build insert data
  const insertData = {
    user_id: user.id,
    first_name: data.first_name,
    last_name: data.last_name,
    email: emptyStringToNull(data.email),
    phone: emptyStringToNull(data.phone),
    hire_date: formatDateForDB(data.hire_date),
    status: data.status,
    // Convert null/undefined to null for database
    contract_type: data.contract_type || null,
    contract_end_date: formatDateForDB(data.contract_end_date),
    hourly_rate: emptyStringToNullNumber(data.hourly_rate),
    start_date: formatDateForDB(data.start_date),
    job_title: emptyStringToNull(data.job_title),
    department: emptyStringToNull(data.department),
    notes: emptyStringToNull(data.notes),
    address: emptyStringToNull(data.address),
    date_of_birth: formatDateForDB(data.date_of_birth),
    social_security_number: emptyStringToNull(data.social_security_number),
    tax_id_number: emptyStringToNull(data.tax_id_number),
    health_insurance_provider: emptyStringToNull(data.health_insurance_provider),
    can_work_holidays: data.can_work_holidays,
    default_daily_schedules: data.default_daily_schedules,
    default_recurrence_interval_weeks: data.default_recurrence_interval_weeks,
    default_start_week_offset: data.default_start_week_offset,
    // Vacation & Work settings - convert empty strings to null for database
    working_days_per_week: emptyStringToNullNumber(data.working_days_per_week),
    contract_hours_per_week: emptyStringToNullNumber(data.contract_hours_per_week),
    vacation_balance: emptyStringToNullNumber(data.vacation_balance),
    // Lohngruppen settings (TV GD 2026)
    wage_group: data.wage_group || null,
    qualification: emptyStringToNull(data.qualification),
    has_professional_education: data.has_professional_education || false,
    lohngruppen_eingruppung_datum: formatDateForDB(data.lohngruppen_eingruppung_datum),
    psa_type: data.psa_type || null,
  };

  const { data: newEmployee, error } = await supabase
    .from('employees')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    // Track Supabase error in Sentry
    trackSupabaseError(error, 'INSERT', 'employees');

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
    email: emptyStringToNull(data.email),
    phone: emptyStringToNull(data.phone),
    hire_date: formatDateForDB(data.hire_date),
    status: data.status,
    contract_end_date: formatDateForDB(data.contract_end_date),
    hourly_rate: emptyStringToNullNumber(data.hourly_rate),
    start_date: formatDateForDB(data.start_date),
    job_title: emptyStringToNull(data.job_title),
    department: emptyStringToNull(data.department),
    notes: emptyStringToNull(data.notes),
    address: emptyStringToNull(data.address),
    date_of_birth: formatDateForDB(data.date_of_birth),
    social_security_number: emptyStringToNull(data.social_security_number),
    tax_id_number: emptyStringToNull(data.tax_id_number),
    health_insurance_provider: emptyStringToNull(data.health_insurance_provider),
    can_work_holidays: data.can_work_holidays,
    default_daily_schedules: data.default_daily_schedules,
    default_recurrence_interval_weeks: data.default_recurrence_interval_weeks,
    default_start_week_offset: data.default_start_week_offset,
    // Vacation & Work settings - convert empty strings to null for database
    working_days_per_week: emptyStringToNullNumber(data.working_days_per_week),
    contract_hours_per_week: emptyStringToNullNumber(data.contract_hours_per_week),
    vacation_balance: emptyStringToNullNumber(data.vacation_balance),
    // Lohngruppen settings (TV GD 2026)
    wage_group: data.wage_group || null,
    qualification: emptyStringToNull(data.qualification),
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