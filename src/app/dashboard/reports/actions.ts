"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
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
  netDuration: number; // NEW: net duration in minutes
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
  netDuration: number; // NEW
}

export interface EmployeeWorkTimeReportData {
  entries: EmployeeReportEntry[];
  totalHours: number;
  employeeName: string;
}

// Schnittstelle für die Daten, die von der RPC-Funktion zurückgegeben werden
interface RpcReportEntry {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  break_minutes: number | null;
  notes: string | null;
  employee_first_name: string | null;
  employee_last_name: string | null;
  object_name: string | null; // Although not directly used in this map, it's part of the RPC return
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
  const supabase = createAdminClient(); // HIER: createAdminClient() verwenden

  const startDate = startOfMonth(new Date(year, month - 1, 1)); // month is 1-indexed from form
  const endDate = endOfMonth(new Date(year, month - 1, 1));

  // Use the RPC function to get the work time report for the object
  const { data: rpcData, error } = await supabase.rpc('get_work_time_report_for_object', {
    p_object_id: objectId,
    p_start_date: startDate.toISOString().split('T')[0],
    p_end_date: endDate.toISOString().split('T')[0],
  });

  if (error) {
    console.error("Fehler beim Laden des Arbeitszeitnachweises über RPC:", error?.message || error);
    return { success: false, message: error.message, data: null };
  }

  let totalNetMinutes = 0;

  const reportEntries: ReportEntry[] = rpcData.map((entry: RpcReportEntry) => {
    const grossDurationMinutes = entry.duration_minutes || 0;
    // Verwende gespeicherte Pausenminuten, wenn vorhanden, sonst Fallback-Berechnung
    const breakMins = entry.break_minutes !== null ? entry.break_minutes : calculateBreakMinutesFallback(grossDurationMinutes);
    const netDurationMinutes = grossDurationMinutes - breakMins;
    totalNetMinutes += netDurationMinutes;
    
    return {
      id: entry.id,
      date: new Date(entry.start_time).toLocaleDateString('de-DE'),
      startTime: new Date(entry.start_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      endTime: entry.end_time ? new Date(entry.end_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      employeeName: `${entry.employee_first_name || ''} ${entry.employee_last_name || ''}`.trim() || 'Unbekannt',
      duration: grossDurationMinutes, // Store gross duration
      breakMinutes: breakMins,
      netDuration: netDurationMinutes, // NEW
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
  const supabase = createAdminClient();
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
      netDuration: netDurationMinutes, // NEW
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