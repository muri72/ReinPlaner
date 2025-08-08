import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TimeEntryForm } from "@/components/time-entry-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createTimeEntry } from "./actions"; // Korrigierter Import

export default async function TimeTrackingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Hier könnten später vorhandene Zeiteinträge geladen werden
  const { data: timeEntries, error } = await supabase
    .from('time_entries')
    .select(`
      *,
      employees ( first_name, last_name ),
      customers ( name ),
      objects ( name ),
      orders ( title )
    `)
    .eq('user_id', user.id) // Nur eigene Einträge anzeigen
    .order('start_time', { ascending: false });

  if (error) {
    console.error("Fehler beim Laden der Zeiteinträge:", error);
    return <div className="p-8">Fehler beim Laden der Zeiteinträge.</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Zeiterfassung</h1>

      <h2 className="text-2xl font-bold mt-8">Neuen Zeiteintrag hinzufügen</h2>
      <TimeEntryForm onSubmit={createTimeEntry} submitButtonText="Zeiteintrag hinzufügen" />

      <h2 className="text-2xl font-bold mt-8">Ihre Zeiteinträge</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {timeEntries.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground">
            Noch keine Zeiteinträge vorhanden. Fügen Sie einen hinzu!
          </p>
        ) : (
          timeEntries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  {entry.type === 'clock_in_out' ? 'Stempeluhr' : entry.type === 'stopwatch' ? 'Stoppuhr' : 'Manuell'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Start: {new Date(entry.start_time).toLocaleString()}</p>
                <p>Ende: {entry.end_time ? new Date(entry.end_time).toLocaleString() : 'Laufend'}</p>
                {entry.duration_minutes && <p>Dauer: {entry.duration_minutes.toFixed(2)} Minuten</p>}
                {entry.employee_id && <p>Mitarbeiter: {entry.employees?.first_name} {entry.employees?.last_name}</p>}
                {entry.customer_id && <p>Kunde: {entry.customers?.name}</p>}
                {entry.object_id && <p>Objekt: {entry.objects?.name}</p>}
                {entry.order_id && <p>Auftrag: {entry.orders?.title}</p>}
                {entry.notes && <p>Notizen: {entry.notes}</p>}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}