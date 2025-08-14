import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ObjectForm } from "@/components/object-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createObject } from "./actions";
import { ObjectEditDialog } from "@/components/object-edit-dialog";
import { DeleteObjectButton } from "@/components/delete-object-button";
import { MapPin, FileText, Clock, Key, Lock, ShieldCheck, UserRound, PlusCircle, Building, FileStack } from "lucide-react"; // Neue Icons, FileStack hinzugefügt
import { SearchInput } from "@/components/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ObjectCreateDialog } from "@/components/object-create-dialog";
import { PaginationControls } from "@/components/pagination-controls"; // Importiere die Paginierungskomponente
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs
import { DocumentUploader } from "@/components/document-uploader"; // Import DocumentUploader
import { DocumentList } from "@/components/document-list"; // Import DocumentList
import { Suspense } from "react"; // Import Suspense for client components
import { FilterSelect } from "@/components/filter-select"; // Import the new FilterSelect component

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
}: {
  searchParams?: any;
}) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect("/login");
  }

  const query = typeof searchParams?.query === 'string' ? searchParams.query : '';
  const currentPage = Number(searchParams?.page) || 1;
  const pageSize = Number(searchParams?.pageSize) || 9; // Standardmäßig 9 Objekte pro Seite

  // Ensure filter values are always strings
  const customerIdFilter = Array.isArray(searchParams?.customerId) ? searchParams.customerId[0] : searchParams?.customerId || '';
  const priorityFilter = Array.isArray(searchParams?.priority) ? searchParams.priority[0] : searchParams?.priority || '';
  const timeOfDayFilter = Array.isArray(searchParams?.timeOfDay) ? searchParams.timeOfDay[0] : searchParams?.timeOfDay || '';
  const accessMethodFilter = Array.isArray(searchParams?.accessMethod) ? searchParams.accessMethod[0] : searchParams?.accessMethod || '';

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  let objects: DisplayObject[] | null;
  let error: any;
  let count: number | null;

  // Fetch customers for filter dropdown
  const { data: customersData, error: customersError } = await supabase.from('customers').select('id, name').order('name', { ascending: true });
  if (customersError) console.error("Fehler beim Laden der Kunden für Filter:", customersError.message);
  const customers = customersData || [];

  if (query) {
    // Verwende die RPC-Funktion für die Suche
    const { data, error: rpcError } = await supabase.rpc('search_objects', {
      search_query: query,
    });
    objects = data as DisplayObject[] | null;
    error = rpcError;
    count = objects?.length || 0; // Zähle die Ergebnisse der RPC-Funktion
  } else {
    // Direkte Abfrage, die sich auf RLS verlässt und Filter anwendet
    let selectQuery = supabase
      .from('objects')
      .select(`
        *,
        customers ( name ),
        customer_contacts ( first_name, last_name )
      `, { count: 'exact' }) // count: 'exact' ist wichtig für die Paginierung
      .order('name', { ascending: true })
      .range(from, to); // Paginierung anwenden

    if (customerIdFilter) {
      selectQuery = selectQuery.eq('customer_id', customerIdFilter);
    }
    if (priorityFilter) {
      selectQuery = selectQuery.eq('priority', priorityFilter);
    }
    if (timeOfDayFilter) {
      selectQuery = selectQuery.eq('time_of_day', timeOfDayFilter);
    }
    if (accessMethodFilter) {
      selectQuery = selectQuery.eq('access_method', accessMethodFilter);
    }

    const { data, error: selectError, count: selectCount } = await selectQuery;

    objects = data?.map(obj => ({
      ...obj,
      customer_name: obj.customers?.name || null,
      object_leader_first_name: obj.customer_contacts?.first_name || null,
      object_leader_last_name: obj.customer_contacts?.last_name || null,
    })) || null;
    error = selectError;
    count = selectCount;
  }

  if (error) {
    console.error("Fehler beim Laden der Objekte:", error?.message || error);
    return <div className="p-4 md:p-8 text-sm">Fehler beim Laden der Objekte.</div>;
  }

  const totalPages = count ? Math.ceil(count / pageSize) : 0;

  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const priorityOptions = [
    { value: 'low', label: 'Niedrig' },
    { value: 'medium', label: 'Mittel' },
    { value: 'high', label: 'Hoch' },
  ];

  const timeOfDayOptions = [
    { value: 'any', label: 'Beliebig' },
    { value: 'morning', label: 'Vormittags' },
    { value: 'noon', label: 'Mittags' },
    { value: 'afternoon', label: 'Nachmittags' },
  ];

  const accessMethodOptions = [
    { value: 'key', label: 'Schlüssel' },
    { value: 'card', label: 'Karte' },
    { value: 'other', label: 'Andere' },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Ihre Objekte</h1>

      <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <SearchInput placeholder="Objekte suchen..." />
        <ObjectCreateDialog />
      </div>

      {/* Filter Section */}
      <Suspense fallback={<div>Lade Filter...</div>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          <FilterSelect
            paramName="customerId"
            label="Kunde"
            options={customers.map(c => ({ value: c.id, label: c.name }))}
            currentValue={customerIdFilter}
          />
          <FilterSelect
            paramName="priority"
            label="Priorität"
            options={priorityOptions}
            currentValue={priorityFilter}
          />
          <FilterSelect
            paramName="timeOfDay"
            label="Tageszeit"
            options={timeOfDayOptions}
            currentValue={timeOfDayFilter}
          />
          <FilterSelect
            paramName="accessMethod"
            label="Zugangsmethode"
            options={accessMethodOptions}
            currentValue={accessMethodFilter}
          />
        </div>
      </Suspense>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {objects && objects.length === 0 && !query && !customerIdFilter && !priorityFilter && !timeOfDayFilter && !accessMethodFilter ? (
          <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
            <Building className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
            <p className="text-base md:text-lg font-semibold">Noch keine Objekte vorhanden</p>
            <p className="text-sm">Fügen Sie ein neues Objekt hinzu, um es zu verwalten.</p>
            <div className="mt-4">
              {/* The button to open the dialog is now part of ObjectCreateDialog */}
            </div>
          </div>
        ) : objects && objects.length === 0 && (query || customerIdFilter || priorityFilter || timeOfDayFilter || accessMethodFilter) ? (
          <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
            <Building className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
            <p className="text-base md:text-lg font-semibold">Keine Objekte gefunden</p>
            <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
          </div>
        ) : (
          objects?.map((object) => (
            <Card key={object.id} className="shadow-neumorphic glassmorphism-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base md:text-lg font-semibold">{object.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <ObjectEditDialog object={object} />
                  <DeleteObjectButton objectId={object.id} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="documents">Dokumente</TabsTrigger>
                  </TabsList>
                  <TabsContent value="details" className="pt-4 space-y-2 text-sm text-muted-foreground">
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
                  </TabsContent>
                  <TabsContent value="documents" className="pt-4 space-y-4">
                    <h3 className="text-md font-semibold flex items-center">
                      <FileStack className="mr-2 h-5 w-5" /> Dokumente
                    </h3>
                    <DocumentUploader associatedOrderId={object.id} /> {/* Korrigiert von associatedObjectId */}
                    <DocumentList associatedOrderId={object.id} /> {/* Korrigiert von associatedObjectId */}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      {!query && totalPages > 1 && (
        <PaginationControls currentPage={currentPage} totalPages={totalPages} />
      )}
    </div>
  );
}