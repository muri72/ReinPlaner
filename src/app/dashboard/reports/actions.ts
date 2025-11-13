// This file contains client-side functions for fetching report data
// Server Actions are not used here to avoid 404 errors

import { createClient } from "@/lib/supabase/client";
import { endOfMonth, startOfMonth } from "date-fns";

// Definieren Sie die Schnittstellen hier, damit sie importiert und importiert werden können
export interface ReportEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  employeeName: string;
  duration: number; // in minutes (gross duration)
  breakMinutes: number; // calculated or stored break minutes
  // notes: string; // Entfernt
}

export interface WorkTimeReportData {
  entries: ReportEntry[];
  totalHours: number; // net hours (gross - breaks)
}

// Neue Schnittstellen für den Mitarbeiterbericht
export interface EmployeeReportEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  objectName: string;
  customerName: string;
  duration: number;
  breakMinutes: number;
}

export interface EmployeeWorkTimeReportData {
  entries: EmployeeReportEntry[];
  totalHours: number;
  employeeName: string;
}


// Helper function to calculate break minutes based on gross duration (fallback)
function calculateBreakMinutesFallback(grossDurationMinutes: number): number {
  if (grossDurationMinutes >= 9 * 60) { // More than 9 hours (540 minutes)
    return 45;
  } else if (grossDurationMinutes >= 6 * 60) { // More than 6 hours (360 minutes)
    return 30;
  }
  return 0;
}

export async function getWorkTimeReport(objectId: string, month: number, year: number): Promise<{ success: boolean; message: string; data: WorkTimeReportData | null }> {
  const supabase = createClient();

  const startDate = startOfMonth(new Date(year, month - 1, 1)); // month is 1-indexed from form
  const endDate = endOfMonth(new Date(year, month - 1, 1));

  const { data: timeEntries, error } = await supabase
    .from('time_entries')
    .select(`
      id,
      start_time,
      end_time,
      duration_minutes,
      break_minutes,
      notes,
      employees ( first_name, last_name ),
      objects ( name )
    `)
    .eq('object_id', objectId)
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())
    .order('start_time', { ascending: true });

  if (error) {
    console.error("Fehler beim Laden des Arbeitszeitnachweises:", error?.message || error);
    return { success: false, message: error.message, data: null };
  }

  let totalNetMinutes = 0;

  const reportEntries: ReportEntry[] = timeEntries.map(entry => {
    const grossDurationMinutes = entry.duration_minutes || 0;
    // Verwende gespeicherte Pausenminuten, wenn vorhanden, sonst Fallback-Berechnung
    const breakMins = entry.break_minutes !== null ? entry.break_minutes : calculateBreakMinutesFallback(grossDurationMinutes);
    const netDurationMinutes = grossDurationMinutes - breakMins;
    totalNetMinutes += netDurationMinutes;
    
    const employee = Array.isArray(entry.employees) ? entry.employees[0] : entry.employees;

    return {
      id: entry.id,
      date: new Date(entry.start_time).toLocaleDateString('de-DE'),
      startTime: new Date(entry.start_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      endTime: entry.end_time ? new Date(entry.end_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      employeeName: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || 'Unbekannt',
      duration: grossDurationMinutes, // Store gross duration
      breakMinutes: breakMins,
      // notes: entry.notes || '', // Entfernt
    };
  });

  const reportData: WorkTimeReportData = {
    entries: reportEntries,
    totalHours: parseFloat((totalNetMinutes / 60).toFixed(2)),
  };

  return {
    success: true,
    message: "Arbeitszeitnachweis erfolgreich geladen.",
    data: reportData,
  };
}

// Neue Funktion für den Mitarbeiter-Arbeitszeitnachweis
export async function getEmployeeWorkTimeReport(employeeId: string, month: number, year: number): Promise<{ success: boolean; message: string; data: EmployeeWorkTimeReportData | null }> {
  const supabase = createClient();
  const startDate = startOfMonth(new Date(year, month - 1, 1));
  const endDate = endOfMonth(new Date(year, month - 1, 1));

  const { data: employeeDetails, error: employeeError } = await supabase
    .from('employees')
    .select('first_name, last_name')
    .eq('id', employeeId)
    .single();

  if (employeeError || !employeeDetails) {
    console.error("Fehler beim Laden der Mitarbeiterdetails:", employeeError?.message || employeeError);
    return { success: false, message: "Mitarbeiter nicht gefunden.", data: null };
  }

  const { data: timeEntries, error } = await supabase
    .from('time_entries')
    .select(`
      id,
      start_time,
      end_time,
      duration_minutes,
      break_minutes,
      objects ( name ),
      customers ( name )
    `)
    .eq('employee_id', employeeId)
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())
    .order('start_time', { ascending: true });

  if (error) {
    console.error("Fehler beim Laden des Mitarbeiter-Arbeitszeitnachweises:", error?.message || error);
    return { success: false, message: error.message, data: null };
  }

  let totalNetMinutes = 0;
  const reportEntries: EmployeeReportEntry[] = timeEntries.map(entry => {
    const grossDurationMinutes = entry.duration_minutes || 0;
    const breakMins = entry.break_minutes !== null ? entry.break_minutes : calculateBreakMinutesFallback(grossDurationMinutes);
    const netDurationMinutes = grossDurationMinutes - breakMins;
    totalNetMinutes += netDurationMinutes;

    const object = Array.isArray(entry.objects) ? entry.objects[0] : entry.objects;
    const customer = Array.isArray(entry.customers) ? entry.customers[0] : entry.customers;

    return {
      id: entry.id,
      date: new Date(entry.start_time).toLocaleDateString('de-DE'),
      startTime: new Date(entry.start_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      endTime: entry.end_time ? new Date(entry.end_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      objectName: object?.name || 'N/A',
      customerName: customer?.name || 'N/A',
      duration: grossDurationMinutes,
      breakMinutes: breakMins,
    };
  });

  const reportData: EmployeeWorkTimeReportData = {
    entries: reportEntries,
    totalHours: parseFloat((totalNetMinutes / 60).toFixed(2)),
    employeeName: `${employeeDetails.first_name} ${employeeDetails.last_name}`,
  };

  return {
    success: true,
    message: "Arbeitszeitnachweis für Mitarbeiter erfolgreich geladen.",
    data: reportData,
  };
}

export async function sendWorkTimeReportToCustomer(
  reportType: 'object' | 'employee',
  id: string, // objectId or employeeId
  month: number,
  year: number,
  customerEmail: string,
  customerName: string,
  reportTitle: string,
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();

  let reportData: WorkTimeReportData | EmployeeWorkTimeReportData | null = null;
  let reportResult;

  if (reportType === 'object') {
    reportResult = await getWorkTimeReport(id, month, year);
  } else { // reportType === 'employee'
    reportResult = await getEmployeeWorkTimeReport(id, month, year);
  }

  if (!reportResult.success || !reportResult.data) {
    return { success: false, message: reportResult.message || "Fehler beim Generieren des Berichts." };
  }
  reportData = reportResult.data;

  // Construct a simple HTML email body
  let emailHtml = `
    <p>Sehr geehrte/r ${customerName},</p>
    <p>anbei erhalten Sie Ihren Arbeitszeitnachweis für ${reportTitle} im Monat ${new Date(year, month - 1).toLocaleString('de-DE', { month: 'long', year: 'numeric' })}.</p>
    <p><strong>Gesamtstunden:</strong> ${reportData.totalHours} Stunden</p>
    <p>Sie können den vollständigen Bericht jederzeit in Ihrem Kundenportal einsehen:</p>
    <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/portal/reports?reportType=${reportType}&id=${id}&month=${month}&year=${year}">Bericht im Portal ansehen</a></p>
    <p>Mit freundlichen Grüßen,</p>
    <p>Ihr ARIS Management Team</p>
  `;

  try {
    const { error: functionError } = await supabase.functions.invoke('send-email', {
      body: {
        to: customerEmail,
        subject: `Ihr Arbeitszeitnachweis für ${reportTitle} (${new Date(year, month - 1).toLocaleString('de-DE', { month: 'long', year: 'numeric' })})`,
        html: emailHtml,
      },
    });

    if (functionError) {
      throw functionError;
    }
    return { success: true, message: "Arbeitszeitnachweis erfolgreich per E-Mail versendet!" };
  } catch (error: any) {
    console.error(`Fehler beim Versenden der E-Mail für Arbeitszeitnachweis an ${customerEmail}:`, error?.message || error);
    return { success: false, message: `Fehler beim Versenden der E-Mail: ${error.message}` };
  }
}