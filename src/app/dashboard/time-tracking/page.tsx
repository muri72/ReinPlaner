import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TimeEntryForm } from "@/components/time-entry-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createTimeEntry } from "./actions";
import { EmployeeTimeTracker } from "@/components/employee-time-tracker";
import { DeleteTimeEntryButton } from "@/components/delete-time-entry-button";
import { Clock, UserRound, Building, Briefcase, FileText } from "lucide-react";
import { getWeek } from 'date-fns';
import { TimeTrackingCharts } from '@/components/time-tracking-charts';
import { Badge } from "@/components/ui/badge";
import { AdminTimeEntriesOverview } from "@/components/admin-time-entries-overview";
import { TimeEntryEditDialog } from "@/components/time-entry-edit-dialog";

// Definieren Sie die Schnittstelle für die Zeiteintrag-Daten, wie sie auf dieser Seite verwendet werden
interface DisplayTimeEntry {
  id: string;
  user_id: string;
  employee_id: string | null;
  customer_id: string | null;
  object_id: string | null;
  order_id: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  type: string;
  notes: string | null;
  employee_first_name: string | null; // Direkte Felder für Namen
  employee_last_name: string | null;
  customer_name: string | null;
  object_name: string | null;
  order_title: string | null;
}

// Schnittstelle für die Ergebnisse der Supabase RPC-Funktion search_time_entries
interface TimeEntryRpcResult {
  id: string;
  user_id: string;
  employee_id: string | null;
  customer_id: string | null;
  object_id: string | null;
  order_id: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employee_first_name: string | null;
  employee_last_name: string | null;
  customer_name: string | null;
  object_name: string | null;
  order_title: string | null;
}

export default async function TimeTrackingPage({
  searchParams,
}: any) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect("/login");
  }

  // Rolle des aktuellen Benutzers abrufen
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  if (profileError) {
    console.error("Fehler beim Laden des Benutzerprofils:", profileError);
    // Standardmäßig als 'employee' behandeln, falls Profil nicht gefunden oder Fehler auftritt
  }

  const isAdmin = userProfile?.role === 'admin';
  const query = typeof searchParams?.query === 'string' ? searchParams.query : '';

  let timeEntries: DisplayTimeEntry[] = [];
  let error: any = null;

  // Bestimme filter_user_id für den RPC-Aufruf
  const rpcFilterUserId = isAdmin ? null : currentUser.id;

  // Daten für die Hauptliste der Zeiteinträge abrufen über RPC
  const { data: rpcData, error: rpcError } = await supabase.rpc('search_time_entries', {
    search_query: query,
    filter_user_id: rpcFilterUserId,
  });

  if (rpcError) {
    console.error("Fehler beim Laden der Zeiteinträge über RPC:", rpcError);
    error = rpcError;
  } else {
    timeEntries = rpcData?.map((entry: TimeEntryRpcResult) => ({
      id: entry.id,
      user_id: entry.user_id,
      employee_id: entry.employee_id,
      customer_id: entry.customer_id,
      object_id: entry.object_id,
      order_id: entry.order_id,
      start_time: entry.start_time,
      end_time: entry.end_time,
      duration_minutes: entry.duration_minutes,
      type: entry.type,
      notes: entry.notes,
      employee_first_name: entry.employee_first_name, // Diese sind jetzt direkt von RPC
      employee_last_name: entry.employee_last_name,
      customer_name: entry.customer_name,
      object_name: entry.object_name,
      order_title: entry.order_title,
    })) || [];
  }

  // Daten für die Visualisierung (Charts) abrufen
  let recentTimeEntries: { start_time: string; end_time: string | null; duration_minutes: number | null; }[] = [];
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data: recentRpcData, error: recentRpcError } = await supabase.rpc('search_time_entries', {
    search_query: '', // Keine Suchanfrage für Charts
    filter_user_id: rpcFilterUserId,
    start_date_filter: threeMonthsAgo.toISOString().split('T')[0], // Datum als String übergeben
    end_date_filter: new Date().toISOString().split('T')[0], // Datum als String übergeben
  });

  if (recentRpcError) {
    console.error("Fehler beim Laden der letzten Zeiteinträge für Charts über RPC:", recentRpcError);
  } else {
    recentTimeEntries = recentRpcData?.map((entry: TimeEntryRpcResult) => ({
      start_time: entry.start_time,
      end_time: entry.end_time,
      duration_minutes: entry.duration_minutes,
    })) || [];
  }

  if (error) {
    console.error("Fehler beim Laden der Zeiteinträge:", error);
    return <div className="p-8">Fehler beim Laden der Zeiteinträge.</div>;
  }

  // Daten nach Woche und Monat aggregieren
  const weeklyData: { [key: string]: number } = {}; // key: YYYY-WW
  const monthlyData: { [key: string]: number } = {}; // key: YYYY-MM

  recentTimeEntries.forEach(entry => {
    if (entry.start_time && entry.duration_minutes !== null) {
      const startDate = new Date(entry.start_time);
      const durationHours = entry.duration_minutes / 60;

      // Nach Woche aggregieren
      const year = startDate.getFullYear();
      const week = getWeek(startDate, { weekStartsOn: 1 }); // Montag als Wochenanfang
      const weekKey = `${year}-${String(week).padStart(2, '0')}`;
      weeklyData[weekKey] = (weeklyData[weekKey] || 0) + durationHours;

      // Nach Monat aggregieren
      const month = startDate.getMonth() + 1; // 1-12
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + durationHours;
    }
  });

  const formattedWeeklyData = Object.keys(weeklyData).sort().map(key => ({
    name: `KW ${key.substring(5)}`,
    hours: parseFloat(weeklyData[key].toFixed(2))
  }));

  const formattedMonthlyData = Object.keys(monthlyData).sort().map(key => ({
    name: `${new Date(parseInt(key.substring(0,4)), parseInt(key.substring(5,7)) - 1, 1).toLocaleString('de-DE', { month: 'short', year: '2-digit' })}`,
    hours: parseFloat(monthlyData[key].toFixed(2))
  }));

  // Helper to format duration from minutes to HH:MM
  const formatDuration = (minutes: number | null) => {
    if (minutes === null) return "N/A";
    const totalSeconds = Math.round(minutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'manual':
        return 'outline';
      case 'clock_in_out':
        return 'default';
      case 'stopwatch':
        return 'secondary';
      case 'automatic_scheduled_order':
        return 'success';
      default:
        return 'outline';
    }
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Zeiterfassung</h1>

      {isAdmin ? (
        <>
          <AdminTimeEntriesOverview />
          <h2 className="text-2xl font-bold mt-8">Neuen Zeiteintrag hinzufügen (Admin)</h2>
          <TimeEntryForm onSubmit={createTimeEntry} submitButtonText="Zeiteintrag hinzufügen" />
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold mt-8">Ihre Stempeluhr</h2>
          <EmployeeTimeTracker userId={currentUser.id} />

          <h2 className="text-2xl font-bold mt-8">Ihre Stundenübersicht (letzte 3 Monate)</h2>
          <TimeTrackingCharts weeklyData={formattedWeeklyData} monthlyData={formattedMonthlyData} />

          <h2 className="text-2xl font-bold mt-8">Ihre Zeiteinträge</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {timeEntries.length === 0 ? (
              <p className="col-span-full text-center text-muted-foreground">
                Noch keine Zeiteinträge vorhanden. Fügen Sie einen hinzu!
              </p>
            ) : (
              timeEntries.map((entry) => (
                <Card key={entry.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-medium">
                      Zeiteintrag
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getTypeBadgeVariant(entry.type)}>{entry.type === 'automatic_scheduled_order' ? 'Automatisch' : entry.type}</Badge>
                      <TimeEntryEditDialog timeEntry={entry} />
                      <DeleteTimeEntryButton entryId={entry.id} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>Start: {new Date(entry.start_time).toLocaleString()}</span>
                    </div>
                    {entry.end_time && (
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Ende: {new Date(entry.end_time).toLocaleString()}</span>
                      </div>
                    )}
                    {entry.duration_minutes !== null && (
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Dauer: {formatDuration(entry.duration_minutes)}</span>
                      </div>
                    )}
                    {entry.employee_first_name && entry.employee_last_name && (
                      <div className="flex items-center">
                        <UserRound className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Mitarbeiter: {entry.employee_first_name} {entry.employee_last_name}</span>
                      </div>
                    )}
                    {entry.customer_name && (
                      <div className="flex items-center">
                        <Building className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Kunde: {entry.customer_name}</span>
                      </div>
                    )}
                    {entry.object_name && (
                      <div className="flex items-center">
                        <Building className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Objekt: {entry.object_name}</span>
                      </div>
                    )}
                    {entry.order_title && (
                      <div className="flex items-center">
                        <Briefcase className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Auftrag: {entry.order_title}</span>
                      </div>
                    )}
                    {entry.notes && (
                      <div className="flex items-center">
                        <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Notizen: {entry.notes}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}