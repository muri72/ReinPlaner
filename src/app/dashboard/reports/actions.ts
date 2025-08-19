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

// Helper function to calculate break minutes based on gross duration (fallback)
function calculateBreakMinutesFallback(grossDurationMinutes: number): number {
  if (grossDurationMinutes >= 9 * 60) { // More than 9 hours (540 minutes)
    return 45;
  } else if (grossDurationMinutes >= 6 * 60) { // More than 6 hours (360 minutes)
    return 30;
  }
  return 0;
}

export async function getObjectWorkTimeReport(objectId: string, month: number, year: number): Promise<{ success: boolean; message: string; data: WorkTimeReportData | null }> {
  const supabase = createAdminClient();

  console.log(`[getObjectWorkTimeReport] Aufruf mit: objectId=${objectId}, month=${month}, year=${year}`);

  const startDate = startOfMonth(new Date(year, month - 1, 1));
  const nextMonthStartDate = new Date(year, month, 1); // JS Date handles month overflow (e.g., month 12 becomes next year's month 0)

  console.log(`[getObjectWorkTimeReport] Datumsbereich: startDate=${startDate.toISOString()}, nextMonthStartDate=${nextMonthStartDate.toISOString()}`);

  const { data, error } = await supabase
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
    .lt('start_time', nextMonthStartDate.toISOString()) // Use less than the start of the next month
    .order('start_time', { ascending: true });

  if (error) {
    console.error(`[getObjectWorkTimeReport] Supabase-Fehler:`, error?.message || error);
    return { success: false, message: error.message, data: null };
  }

  console.log(`[getObjectWorkTimeReport] Daten von Supabase erhalten: ${data.length} Einträge.`);
  // Optional: console.log(JSON.stringify(data, null, 2)); // Nur für detaillierte Prüfung, kann sehr viel Output erzeugen

  let totalNetMinutes = 0;

  const reportEntries: ReportEntry[] = data.map((entry: any) => {
    const grossDurationMinutes = entry.duration_minutes || 0;
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
      duration: grossDurationMinutes,
      breakMinutes: breakMins,
      netDuration: netDurationMinutes,
    };
  });

  const reportData: WorkTimeReportData = {
    entries: reportEntries,
    totalHours: parseFloat((totalNetMinutes / 60).toFixed(2)),
  };

  console.log(`[getObjectWorkTimeReport] Generierter Bericht: totalHours=${reportData.totalHours}, entriesCount=${reportData.entries.length}`);

  return {
    success: true,
    message: "Arbeitszeitnachweis erfolgreich geladen.",
    data: reportData,
  };
}

// Funktion für den Mitarbeiter-Arbeitszeitnachweis
export async function getEmployeeWorkTimeReport(employeeId: string, month: number, year: number): Promise<{ success: boolean; message: string; data: EmployeeWorkTimeReportData | null }> {
  const supabase = createAdminClient();
  const startDate = startOfMonth(new Date(year, month - 1, 1));
  const nextMonthStartDate = new Date(year, month, 1);

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
    .lt('start_time', nextMonthStartDate.toISOString()) // Use less than the start of the next month
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