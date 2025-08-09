"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server"; // createAdminClient importieren
import { endOfMonth, startOfMonth } from "date-fns";

// Definieren Sie die Schnittstellen hier, damit sie exportiert und importiert werden können
export interface ReportEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  employeeName: string;
  duration: number; // in minutes (gross duration)
  breakMinutes: number; // calculated break minutes
  // notes: string; // Entfernt
}

export interface WorkTimeReportData {
  entries: ReportEntry[];
  totalHours: number; // net hours (gross - breaks)
}

// Helper function to calculate break minutes based on gross duration
function calculateBreakMinutes(grossDurationMinutes: number): number {
  if (grossDurationMinutes >= 9 * 60) { // More than 9 hours (540 minutes)
    return 45;
  } else if (grossDurationMinutes >= 6 * 60) { // More than 6 hours (360 minutes)
    return 30;
  }
  return 0;
}

export async function getWorkTimeReport(objectId: string, month: number, year: number): Promise<{ success: boolean; message: string; data: WorkTimeReportData | null }> {
  const supabase = await createAdminClient(); // HIER: createAdminClient() verwenden
  // Der Benutzer wird hier nicht mehr direkt benötigt, da der Admin Client RLS umgeht.
  // Eine Authentifizierungsprüfung für den Aufrufer der Server-Aktion ist jedoch weiterhin sinnvoll,
  // um sicherzustellen, dass nur berechtigte Benutzer diese Aktion auslösen können.
  // Diese Prüfung findet bereits auf der reports/page.tsx statt.

  const startDate = startOfMonth(new Date(year, month - 1, 1)); // month is 1-indexed from form
  const endDate = endOfMonth(new Date(year, month - 1, 1));

  const { data: timeEntries, error } = await supabase
    .from('time_entries')
    .select(`
      id,
      start_time,
      end_time,
      duration_minutes,
      notes,
      employees ( first_name, last_name ),
      objects ( name )
    `)
    .eq('object_id', objectId)
    .gte('start_time', startDate.toISOString())
    .lte('start_time', endDate.toISOString())
    .order('start_time', { ascending: true });

  if (error) {
    console.error("Fehler beim Laden des Arbeitszeitnachweises:", error);
    return { success: false, message: error.message, data: null };
  }

  let totalNetMinutes = 0;

  const reportEntries: ReportEntry[] = timeEntries.map(entry => {
    const grossDurationMinutes = entry.duration_minutes || 0;
    const breakMins = calculateBreakMinutes(grossDurationMinutes);
    const netDurationMinutes = grossDurationMinutes - breakMins;
    totalNetMinutes += netDurationMinutes;

    return {
      id: entry.id,
      date: new Date(entry.start_time).toLocaleDateString('de-DE'),
      startTime: new Date(entry.start_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      endTime: entry.end_time ? new Date(entry.end_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      employeeName: `${entry.employees?.[0]?.first_name || ''} ${entry.employees?.[0]?.last_name || ''}`.trim() || 'Unbekannt',
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