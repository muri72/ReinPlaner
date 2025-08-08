import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TimeEntryForm } from "@/components/time-entry-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createTimeEntry } from "./actions";
import { EmployeeTimeTracker } from "@/components/employee-time-tracker";
import { DeleteTimeEntryButton } from "@/components/delete-time-entry-button"; // Neuer Import
import { Clock, UserRound, Building, Briefcase, FileText } from "lucide-react"; // Icons für die Anzeige

// Definieren Sie die Schnittstelle für die Zeiteintrag-Daten, wie sie auf dieser Seite verwendet werden
interface DisplayTimeEntry {
  id: string;
  user_id: string; // Hinzugefügt, falls benötigt
  employee_id: string | null;
  customer_id: string | null;
  object_id: string | null;
  order_id: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  type: string;
  notes: string | null;
  employees: { first_name: string; last_name: string; }[] | null; // Array, da Supabase so zurückgibt
  customers: { name: string; }[] | null; // Array
  objects: { name: string; }[] | null; // Array
  orders: { title: string; }[] | null; // Array
}

export default async function TimeTrackingPage() {
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
  const { data: timeEntriesData, error } = await supabase
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
      type,
      notes,
      employees ( first_name, last_name ),
      customers ( name ),
      objects ( name ),
      orders ( title )
    `)
    .eq('user_id', currentUser.id) // Nur eigene Einträge anzeigen
    .order('start_time', { ascending: false });

  if (error) {
    console.error("Fehler beim Laden der Zeiteinträge:", error);
    return <div className="p-8">Fehler beim Laden der Zeiteinträge.</div>;
  }

  // Daten in das DisplayTimeEntry-Format mappen
  const timeEntries: DisplayTimeEntry[] = timeEntriesData?.map(entry => ({
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
    employees: entry.employees,
    customers: entry.customers,
    objects: entry.objects,
    orders: entry.orders,
  })) || [];


  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Zeiterfassung</h1>

      {isAdmin ? (
        <>
          <h2 className="text-2xl font-bold mt-8">Neuen Zeiteintrag hinzufügen (Admin)</h2>
          <TimeEntryForm onSubmit={createTimeEntry} submitButtonText="Zeiteintrag hinzufügen" />
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold mt-8">Ihre Stempeluhr</h2>
          <EmployeeTimeTracker userId={currentUser.id} />
        </>
      )}

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
                  {entry.type === 'clock_in_out' ? 'Stempeluhr' : entry.type === 'stopwatch' ? 'Stoppuhr' : 'Manuell'}
                </CardTitle>
                <DeleteTimeEntryButton entryId={entry.id} />
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
                {entry.duration_minutes && (
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Dauer: {entry.duration_minutes.toFixed(2)} Minuten</span>
                  </div>
                )}
                {entry.employee_id && (
                  <div className="flex items-center">
                    <UserRound className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Mitarbeiter: {entry.employees?.[0]?.first_name} {entry.employees?.[0]?.last_name}</span>
                  </div>
                )}
                {entry.customer_id && (
                  <div className="flex items-center">
                    <Building className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Kunde: {entry.customers?.[0]?.name}</span>
                  </div>
                )}
                {entry.object_id && (
                  <div className="flex items-center">
                    <Building className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Objekt: {entry.objects?.[0]?.name}</span>
                  </div>
                )}
                {entry.order_id && (
                  <div className="flex items-center">
                    <Briefcase className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Auftrag: {entry.orders?.[0]?.title}</span>
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
    </div>
  );
}