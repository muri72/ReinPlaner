"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { AbsenceRequestFormValues } from "@/components/absence-request-form";
import { startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { sendNotification } from "@/lib/actions/notifications";
import { logDataChange } from "@/lib/audit-log";
import { calculateWorkingDays } from "@/lib/utils/date-utils";

export async function createAbsenceRequest(data: AbsenceRequestFormValues): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
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

  // Create audit log
  await logDataChange(
    creator.id,
    "INSERT",
    "absence_requests",
    data.employeeId,
    null,
    { employeeId: data.employeeId, type: data.type, startDate: data.startDate, endDate: data.endDate }
  );

  return { success: true, message: "Abwesenheitsantrag erfolgreich hinzugefügt!" };
}

export async function updateAbsenceRequest(requestId: string, data: Partial<AbsenceRequestFormValues>): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { data: originalRequest } = await supabase.from('absence_requests').select('user_id, status').eq('id', requestId).single();

  // Get old request data for audit log
  const { data: oldRequest } = await supabase
    .from('absence_requests')
    .select('*')
    .eq('id', requestId)
    .single();

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

  // Create audit log
  await logDataChange(
    user.id,
    "UPDATE",
    "absence_requests",
    requestId,
    oldRequest,
    { status: data.status, type: data.type }
  );

  return { success: true, message: "Abwesenheitsantrag erfolgreich aktualisiert!" };
}

export async function deleteAbsenceRequest(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const requestId = formData.get('requestId') as string;

  // Get request data before deletion for audit log
  const { data: requestToDelete } = await supabase
    .from('absence_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  const { error } = await supabase
    .from('absence_requests')
    .delete()
    .eq('id', requestId);

  if (error) {
    console.error("Fehler beim Löschen des Abwesenheitsantrags:", error?.message || error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/absence-requests");

  // Create audit log
  if (requestToDelete) {
    await logDataChange(
      user.id,
      "DELETE",
      "absence_requests",
      requestId,
      requestToDelete,
      null
    );
  }

  return { success: true, message: "Abwesenheitsantrag erfolgreich gelöscht!" };
}

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
      id,
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

export async function getVacationBalance(employeeId: string) {
  const supabase = await createClient();

  // Get employee vacation balance and working days
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('vacation_balance, vacation_days_used, contract_hours_per_week, working_days_per_week, first_name, last_name')
    .eq('id', employeeId)
    .single();

  if (employeeError || !employee) {
    return { success: false, message: "Mitarbeiter nicht gefunden", data: null };
  }

  // Get approved vacation days used
  const { data: vacationRequests, error: requestsError } = await supabase
    .from('absence_requests')
    .select('start_date, end_date')
    .eq('employee_id', employeeId)
    .eq('type', 'vacation')
    .eq('status', 'approved');

  if (requestsError) {
    console.error("Fehler beim Laden der Urlaubsanträge:", requestsError.message);
  }

  // Calculate total vacation days used using working days calculation
  let totalDaysUsed = employee.vacation_days_used || 0;
  const workingDaysPerWeek = employee.working_days_per_week || 5;
  if (vacationRequests) {
    for (const req of vacationRequests) {
      const start = new Date(req.start_date);
      const end = new Date(req.end_date);
      totalDaysUsed += await calculateWorkingDays(start, end, workingDaysPerWeek);
    }
  }

  const balance = (employee.vacation_balance || 30) - totalDaysUsed;

  return {
    success: true,
    data: {
      employeeName: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
      totalDays: employee.vacation_balance || 30,
      daysUsed: totalDaysUsed,
      remainingDays: balance,
      contractHoursPerWeek: employee.contract_hours_per_week || 40,
      workingDaysPerWeek: workingDaysPerWeek,
    }
  };
}

export async function updateEmployeeVacationBalance(employeeId: string, newBalance: number) {
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from('employees')
    .update({ vacation_balance: newBalance })
    .eq('id', employeeId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/absence-requests");
  return { success: true, message: "Urlaubssaldo aktualisiert" };
}

export async function getEmployeeAbsenceKPIs(employeeId: string, year?: number) {
  const supabase = await createClient();
  const targetYear = year || new Date().getFullYear();

  // Get employee working days info
  const { data: employee } = await supabase
    .from('employees')
    .select('working_days_per_week, vacation_balance')
    .eq('id', employeeId)
    .single();

  const workingDaysPerWeek = employee?.working_days_per_week || 5;

  // Get all approved absence requests for the employee in the target year
  const startOfYear = `${targetYear}-01-01`;
  const endOfYear = `${targetYear}-12-31`;

  const { data: absences, error } = await supabase
    .from('absence_requests')
    .select('start_date, end_date, type, status, created_at')
    .eq('employee_id', employeeId)
    .eq('status', 'approved')
    .gte('end_date', startOfYear)
    .lte('start_date', endOfYear);

  if (error) {
    console.error("Fehler beim Laden der Abwesenheiten:", error.message);
    return { success: false, message: error.message, data: null };
  }

  // Initialize KPI structure
  const kpis = {
    vacation: { total: 0, byMonth: {} as Record<string, number> },
    sick_leave: { total: 0, byMonth: {} as Record<string, number>, occurrences: 0 },
    training: { total: 0, byMonth: {} as Record<string, number> },
    other: { total: 0, byMonth: {} as Record<string, number> },
    unpaid_leave: { total: 0, byMonth: {} as Record<string, number> },
  };

  // Aggregate absences by type and month
  for (const req of absences || []) {
    const days = await calculateWorkingDays(
      new Date(req.start_date),
      new Date(req.end_date),
      workingDaysPerWeek
    );

    // Get month key
    const monthKey = req.start_date.substring(0, 7); // "2024-03"

    // Add to appropriate type
    if (req.type === 'vacation') {
      kpis.vacation.total += days;
      kpis.vacation.byMonth[monthKey] = (kpis.vacation.byMonth[monthKey] || 0) + days;
    } else if (req.type === 'sick_leave') {
      kpis.sick_leave.total += days;
      kpis.sick_leave.byMonth[monthKey] = (kpis.sick_leave.byMonth[monthKey] || 0) + days;
      kpis.sick_leave.occurrences += 1;
    } else if (req.type === 'training') {
      kpis.training.total += days;
      kpis.training.byMonth[monthKey] = (kpis.training.byMonth[monthKey] || 0) + days;
    } else if (req.type === 'other') {
      kpis.other.total += days;
      kpis.other.byMonth[monthKey] = (kpis.other.byMonth[monthKey] || 0) + days;
    } else if (req.type === 'unpaid_leave') {
      kpis.unpaid_leave.total += days;
      kpis.unpaid_leave.byMonth[monthKey] = (kpis.unpaid_leave.byMonth[monthKey] || 0) + days;
    }
  }

  // Calculate remaining vacation days
  const totalVacation = employee?.vacation_balance || 30;
  const remainingVacation = totalVacation - kpis.vacation.total;

  return {
    success: true,
    data: {
      year: targetYear,
      workingDaysPerWeek,
      totalVacation,
      remainingVacation,
      kpis,
    }
  };
}