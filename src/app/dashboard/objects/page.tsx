import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ObjectForm } from "@/components/object-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createObject } from "./actions";
import { ObjectEditDialog } from "@/components/object-edit-dialog";
import { DeleteObjectButton } from "@/components/delete-object-button";
import { MapPin, FileText, Clock, Key, Lock, ShieldCheck } from "lucide-react"; // Neue Icons
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
  // Neue Felder
  default_notes: string | null;
  default_priority: string;
  default_time_of_day: string;
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
}

// Helper to calculate hours between two time strings (HH:MM)
const calculateHours = (start: string | null, end: string | null): number | null => {
  if (!start || !end) return null;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  const startDate = new Date(0, 0, 0, startH, startM);
  let endDate = new Date(0, 0, 0, endH, endM);

  if (endDate < startDate) {
    endDate.setDate(endDate.getDate() + 1);
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  return diffMs / (1000 * 60 * 60);
};

export default async function ObjectsPage({
  searchParams,
}: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const query = typeof searchParams?.query === 'string' ? searchParams.query : '';

  let objects: DisplayObject[] | null;
  let error: any;

  if (query) {
    const { data, error: rpcError } = await supabase.rpc('search_objects', {
      search_query: query,
      user_id_param: user.id,
    });
    objects = data as DisplayObject[] | null;
    error = rpcError;
  } else {
    const { data, error: selectError } = await supabase
      .from('objects')
      .select(`
        *,
        customers ( name )
      `)
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    objects = data?.map(obj => ({
      id: obj.id,
      user_id: obj.user_id,
      customer_id: obj.customer_id,
      name: obj.name,
      address: obj.address,
      description: obj.description,
      created_at: obj.created_at,
      customer_name: obj.customers?.name || null,
      // Neue Felder mappen
      default_notes: obj.default_notes,
      default_priority: obj.default_priority,
      default_time_of_day: obj.default_time_of_day,
      access_method: obj.access_method,
      pin: obj.pin,
      is_alarm_secured: obj.is_alarm_secured,
      alarm_password: obj.alarm_password,
      security_code_word: obj.security_code_word,
      monday_start_time: obj.monday_start_time,
      monday_end_time: obj.monday_end_time,
      tuesday_start_time: obj.tuesday_start_time,
      tuesday_end_time: obj.tuesday_end_time,
      wednesday_start_time: obj.wednesday_start_time,
      wednesday_end_time: obj.wednesday_end_time,
      thursday_start_time: obj.thursday_start_time,
      thursday_end_time: obj.thursday_end_time,
      friday_start_time: obj.friday_start_time,
      friday_end_time: obj.friday_end_time,
      saturday_start_time: obj.saturday_start_time,
      saturday_end_time: obj.saturday_end_time,
      sunday_start_time: obj.sunday_start_time,
      sunday_end_time: obj.sunday_end_time,
    })) || null;
    error = selectError;
  }

  if (error) {
    console.error("Fehler beim Laden der Objekte:", error);
    return <div className="p-8">Fehler beim Laden der Objekte.</div>;
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
          <p className="col-span-full text-center text-muted-foreground">
            {query ? "Keine Objekte gefunden, die Ihrer Suche entsprechen." : "Noch keine Objekte vorhanden. Fügen Sie eines hinzu!"}
          </p>
        ) : (
          objects?.map((object) => (
            <Card key={object.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{object.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <ObjectEditDialog object={object} />
                  <DeleteObjectButton objectId={object.id} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {object.customer_name && (
                  <p className="text-sm text-muted-foreground">Kunde: {object.customer_name}</p>
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
                {/* Neue Felder anzeigen */}
                {object.default_notes && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Notizen: {object.default_notes}</span>
                  </div>
                )}
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span>Priorität: <Badge variant="secondary">{object.default_priority}</Badge></span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span>Tageszeit: <Badge variant="secondary">{object.default_time_of_day}</Badge></span>
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
                  const startTime = object[startTimeKey] as string | null;
                  const endTime = object[endTimeKey] as string | null;
                  const hours = calculateHours(startTime, endTime);

                  if (startTime && endTime) {
                    return (
                      <p key={day} className="text-xs text-muted-foreground ml-2">
                        {day.charAt(0).toUpperCase() + day.slice(1)}: {startTime} - {endTime} ({hours?.toFixed(2)} Std.)
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