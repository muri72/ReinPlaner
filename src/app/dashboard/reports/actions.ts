"use server";

import { createClient } from "@/lib/supabase/server";
import { endOfMonth, startOfMonth } from "date-fns";

// Definieren Sie die Schnittstellen hier, damit sie exportiert und importiert werden können
export interface ReportEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  employeeName: string;
  duration: number; // in minutes
  notes: string;
}

export interface WorkTimeReportData {
  entries: ReportEntry[];
  totalHours: number;
}

export async function getWorkTimeReport(objectId: string, month: number, year: number): Promise<{ success: boolean; message: string; data: WorkTimeReportData | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert.", data: null };
  }

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

  // Calculate total duration
  const totalMinutes = timeEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
  const totalHours = totalMinutes / 60;

  const reportData: WorkTimeReportData = {
    entries: timeEntries.map(entry => ({
      id: entry.id,
      date: new Date(entry.start_time).toLocaleDateString('de-DE'),
      startTime: new Date(entry.start_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      endTime: entry.end_time ? new Date(entry.end_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      // Korrektur: Zugriff auf das erste Element des employees-Arrays
      employeeName: `${entry.employees?.[0]?.first_name || ''} ${entry.employees?.[0]?.last_name || ''}`.trim() || 'Unbekannt',
      duration: entry.duration_minutes || 0, // in minutes
      notes: entry.notes || '',
    })),
    totalHours: parseFloat(totalHours.toFixed(2)),
  };

  return {
    success: true,
    message: "Arbeitszeitnachweis erfolgreich geladen.",
    data: reportData,
  };
}