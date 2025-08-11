import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ObjectForm } from "@/components/object-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createObject } from "./actions";
import { ObjectEditDialog } from "@/components/object-edit-dialog";
import { DeleteObjectButton } from "@/components/delete-object-button";
import { MapPin, FileText, Clock, Key, Lock, ShieldCheck, UserRound } from "lucide-react"; // Neue Icons
import { SearchInput } from "@/components/search-input";
import { Badge } from "@/components/ui/badge";

// Definieren Sie die Schnittstelle für die Objekt-Daten, wie sie auf dieser Seite verwendet werden
interface DisplayObject {
  id: string;
  user_id: string | null;
  customer_id: string;
  name: string;
  address: string;
  description: string | null;
  created_at: string | null;
  customer_name: string | null;
  customer_contact_id: string | null;
  object_leader_first_name: string | null;
  object_leader_last_name: string | null;
  notes: string | null;
  priority: string;
  time_of_day: string;
  access_method: string;
  pin: string | null;
  is_alarm_secured: boolean;
  alarm_password: string | null;
  security_code_word: string | null;
  monday_start_time: string | null;
  monday_end_time: string | null;
  tuesday_start_time: string | null;
  tuesday_end_time: string | null;
  wednesday_start_time: string | null;
  wednesday_end_time: string | null;
  thursday_start_time: string | null;
  thursday_end_time: string | null;
  friday_start_time: string | null;
  friday_end_time: string | null;
  saturday_start_time: string | null;
  saturday_end_time: string | null;
  sunday_start_time: string | null;
  sunday_end_time: string | null;
  monday_hours: number | null;
  tuesday_hours: number | null;
  wednesday_hours: number | null;
  thursday_hours: number | null;
  friday_hours: number | null;
  saturday_hours: number | null;
  sunday_hours: number | null;
}

export default async function ObjectsPage({
  searchParams,
}: any) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect("/login");
  }

  const query = typeof searchParams?.query === 'string' ? searchParams.query : '';

  let objects: DisplayObject[] | null;
  let error: any;

  if (query) {
    // Verwende die vereinfachte RPC-Funktion für die Suche
    const { data, error: rpcError } = await supabase.rpc('search_objects', {
      search_query: query,
    });
    objects = data as DisplayObject[] | null;
    error = rpcError;
  } else {
    // Direkte Abfrage, die sich auf RLS verlässt
    const { data, error: selectError } = await supabase
      .from('objects')
      .select(`
        *,
        customers ( name ),
        customer_contacts ( first_name, last_name )
      `)
      .order('name', { ascending: true });

    objects = data?.map(obj => ({
      ...obj,
      customer_name: obj.customers?.name || null,
      object_leader_first_name: obj.customer_contacts?.first_name || null,
      object_leader_last_name: obj.customer_contacts?.last_name || null,
    })) || null;
    error = selectError;
  }

  if (error) {
    console.error("Fehler beim Laden der Objekte:", error);
    return <div className="p-8 text-sm">Fehler beim Laden der Objekte.</div>;
  }

  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Ihre Objekte</h1>

      <div className="mb-4">
        <SearchInput placeholder="Objekte suchen..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {objects && objects.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground text-sm">
            {query ? "Keine Objekte gefunden, die Ihrer Suche entsprechen." : "Noch keine Objekte vorhanden. Fügen Sie eines hinzu!"}
          </p>
        ) : (
          objects?.map((object) => (
            <Card key={object.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">{object.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <ObjectEditDialog object={object} />
                  <DeleteObjectButton objectId={object.id} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {object.customer_name && (
                  <p className="text-sm text-muted-foreground">
                    Kunde: {object.customer_name}
                  </p>
                )}
                {object.object_leader_first_name && object.object_leader_last_name && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <UserRound className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Objektleiter: {object.object_leader_first_name} {object.object_leader_last_name}</span>
                  </div>
                )}
                {object.address && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>{object.address}</span>
                  </div>
                )}
                {object.description && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>{object.description}</span>
                  </div>
                )}
                {object.notes && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Notizen: {object.notes}</span>
                  </div>
                )}
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span>Priorität: <Badge variant="secondary">{object.priority}</Badge></span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span>Tageszeit: <Badge variant="secondary">{object.time_of_day}</Badge></span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Key className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span>Zugang: <Badge variant="secondary">{object.access_method}</Badge></span>
                </div>
                {object.pin && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Lock className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>PIN: {object.pin}</span>
                  </div>
                )}
                {object.is_alarm_secured && (
                  <>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <ShieldCheck className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>Alarmgesichert: Ja</span>
                    </div>
                    {object.alarm_password && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Lock className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Alarmkennwort: {object.alarm_password}</span>
                      </div>
                    )}
                    {object.security_code_word && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Lock className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Codewort: {object.security_code_word}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="mt-4 text-sm font-semibold">Arbeitszeiten pro Wochentag:</div>
                {dayNames.map(day => {
                  const startTimeKey = `${day}_start_time` as keyof DisplayObject;
                  const endTimeKey = `${day}_end_time` as keyof DisplayObject;
                  const hoursKey = `${day}_hours` as keyof DisplayObject;
                  const startTime = object[startTimeKey] as string | null;
                  const endTime = object[endTimeKey] as string | null;
                  const hours = object[hoursKey] as number | null;

                  if (startTime || hours) {
                    return (
                      <p key={day} className="text-xs text-muted-foreground ml-2">
                        {day.charAt(0).toUpperCase() + day.slice(1)}:
                        {startTime && endTime ? ` ${startTime} - ${endTime}` : ''}
                        {hours ? ` (${Number(hours).toFixed(2)} Std. Netto)` : ''}
                      </p>
                    );
                  }
                  return null;
                })}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <h2 className="text-2xl font-bold mt-8">Neues Objekt hinzufügen</h2>
      <ObjectForm onSubmit={createObject} submitButtonText="Objekt hinzufügen" />
    </div>
  );
}