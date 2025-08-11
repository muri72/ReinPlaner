import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TimeEntryForm } from "@/components/time-entry-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createTimeEntry } from "./actions";
import { EmployeeTimeTracker } from "@/components/employee-time-tracker";
import { DeleteTimeEntryButton } from "@/components/delete-time-entry-button";
import { Clock, UserRound, Building, Briefcase, FileText, PlusCircle } from "lucide-react";
import { getWeek } from 'date-fns';
import { TimeTrackingCharts } from '@/components/time-tracking-charts';
import { Badge } from "@/components/ui/badge";
import { AdminTimeEntriesOverview } from "@/components/admin-time-entries-overview";
import { TimeEntryEditDialog } from "@/components/time-entry-edit-dialog";
import { TriggerAutoTimeEntryButton } from "@/components/trigger-auto-time-entry-button";

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
  break_minutes: number | null; // Neues Feld
  type: string;
  notes: string | null;
  employee_first_name: string | null; // Direkte Felder für Namen
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

  // Zeiteinträge zur Anzeige abrufen
  let timeEntries: DisplayTimeEntry[] = [];
  let recentTimeEntries: { start_time: string; end_time: string | null; duration_minutes: number | null; break_minutes: number | null; }[] = []; // break_minutes hinzugefügt
  let error: any = null; // Initialisiere error mit null

  // Daten für die Hauptliste der Zeiteinträge abrufen
  let queryBuilder = supabase
    .from('time_entries')
    .select(`
      id,
      user_id,
      employee_id,
      customer_id,
      object_id,
      order_id,
      start_time,
      end_time,
      duration_minutes,
      break_minutes,
      type,
      notes,
      employees ( first_name, last_name ),
      customers ( name ),
      objects ( name ),
      orders ( title )
    `)
    .order('start_time', { ascending: false });

  // Wenn der Benutzer KEIN Admin ist, filtern Sie nach seiner eigenen user_id
  if (!isAdmin) {
    queryBuilder = queryBuilder.eq('user_id', currentUser.id);
  }

  const { data: entriesData, error: entriesError } = await queryBuilder;

  timeEntries = entriesData?.map(entry => {
    const employee = Array.isArray(entry.employees) ? entry.employees[0] : entry.employees;
    const customer = Array.isArray(entry.customers) ? entry.customers[0] : entry.customers;
    const object = Array.isArray(entry.objects) ? entry.objects[0] : entry.objects;
    const order = Array.isArray(entry.orders) ? entry.orders[0] : entry.orders;
    return {
      id: entry.id,
      user_id: entry.user_id,
      employee_id: entry.employee_id,
      customer_id: entry.customer_id,
      object_id: entry.object_id,
      order_id: entry.order_id,
      start_time: entry.start_time,
      end_time: entry.end_time,
      duration_minutes: entry.duration_minutes,
      break_minutes: entry.break_minutes, // Neues Feld mappen
      type: entry.type,
      notes: entry.notes,
      employee_first_name: employee?.first_name || null,
      employee_last_name: employee?.last_name || null,
      customer_name: customer?.name || null,
      object_name: object?.name || null,
      order_title: order?.title || null,
    }
  }) || [];
  error = entriesError;

  // Daten für die Visualisierung (Charts) abrufen
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  let recentQueryBuilder = supabase
    .from('time_entries')
    .select('start_time, end_time, duration_minutes, break_minutes') // break_minutes hinzugefügt
    .gte('start_time', threeMonthsAgo.toISOString())
    .lt('start_time', new Date().toISOString()) // Ensure it's up to current date
    .order('start_time', { ascending: true });

  // Wenn der Benutzer KEIN Admin ist, filtern Sie auch hier nach seiner eigenen user_id
  if (!isAdmin) {
    recentQueryBuilder = recentQueryBuilder.eq('user_id', currentUser.id);
  }

  const { data: recentData, error: recentError } = await recentQueryBuilder;

  recentTimeEntries = recentData || [];
  if (recentError) console.error("Fehler beim Laden der letzten Zeiteinträge für Charts:", recentError);


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
      const grossDurationHours = entry.duration_minutes / 60;
      const breakHours = (entry.break_minutes || 0) / 60; // Pausenminuten in Stunden umwandeln
      const netDurationHours = grossDurationHours - breakHours; // Netto-Stunden berechnen

      // Nach Woche aggregieren
      const year = startDate.getFullYear();
      const week = getWeek(startDate, { weekStartsOn: 1 }); // Montag als Wochenanfang
      const weekKey = `${year}-${String(week).padStart(2, '0')}`;
      weeklyData[weekKey] = (weeklyData[weekKey] || 0) + netDurationHours; // Netto-Stunden verwenden

      // Nach Monat aggregieren
      const month = startDate.getMonth() + 1; // 1-12
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + netDurationHours; // Netto-Stunden verwenden
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Automatische Zeiterfassung</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Lösen Sie die automatische Erstellung von Zeiteinträgen für alle geplanten Aufträge aus. Dies füllt fehlende Einträge für vergangene Tage auf.
              </p>
              <TriggerAutoTimeEntryButton />
            </CardContent>
          </Card>
          <AdminTimeEntriesOverview currentUserId={currentUser.id} isAdmin={isAdmin} />
          <h2 className="text-2xl font-bold mt-8">Neuen Zeiteintrag hinzufügen (Admin)</h2>
          <TimeEntryForm onSubmit={createTimeEntry} currentUserId={currentUser.id} isAdmin={isAdmin} submitButtonText="Zeiteintrag hinzufügen" />
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
              <div className="col-span-full text-center text-muted-foreground py-8">
                <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold">Noch keine Zeiteinträge vorhanden</p>
                <p className="text-sm">Beginnen Sie, indem Sie Ihre Arbeitszeit erfassen oder einen Eintrag manuell hinzufügen.</p>
                <div className="mt-4">
                  <TimeEntryForm onSubmit={createTimeEntry} currentUserId={currentUser.id} isAdmin={isAdmin} submitButtonText="Zeiteintrag hinzufügen" />
                </div>
              </div>
            ) : (
              timeEntries.map((entry) => (
                <Card key={entry.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-semibold">
                      Zeiteintrag
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getTypeBadgeVariant(entry.type)}>{entry.type === 'automatic_scheduled_order' ? 'Automatisch' : entry.type}</Badge>
                      <TimeEntryEditDialog timeEntry={entry} currentUserId={currentUser.id} isAdmin={isAdmin} />
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
                    {entry.break_minutes !== null && entry.break_minutes > 0 && (
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Pause: {formatDuration(entry.break_minutes)}</span>
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