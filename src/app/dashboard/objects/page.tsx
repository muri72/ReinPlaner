"use client"; // This page needs to be a client component to use hooks like useIsMobile

import { createClient } from "@/lib/supabase/client";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, FileText, Clock, Key, Lock, ShieldCheck, UserRound, PlusCircle, Building, FileStack } from "lucide-react";
import { ObjectEditDialog } from "@/components/object-edit-dialog";
import { DeleteObjectButton } from "@/components/delete-object-button";
import { SearchInput } from "@/components/search-input";
import { Badge } from "@/components/ui/badge";
import { ObjectCreateDialog } from "@/components/object-create-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { Suspense, useEffect, useState, useCallback } from "react";
import { FilterSelect } from "@/components/filter-select";
import { ObjectsTableView } from "@/components/objects-table-view"; // Import the new table view component
import { useIsMobile } from "@/hooks/use-mobile"; // Import the hook
import { RecordDetailsDialog } from "@/components/record-details-dialog"; // Import RecordDetailsDialog
import { LoadingOverlay } from "@/components/loading-overlay"; // Import the new LoadingOverlay

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
  daily_schedules: any[]; // Updated to JSONB array
  total_weekly_hours: number | null; // Neues Feld
  recurrence_interval_weeks: number;
  start_week_offset: number;
}

export default function ObjectsPage({
  searchParams,
}: {
  searchParams?: any;
}) {
  const supabase = createClient();
  const router = useRouter();
  const currentSearchParams = useSearchParams();
  const isMobile = useIsMobile();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'manager' | 'employee' | 'customer'>('employee');
  const [allObjects, setAllObjects] = useState<DisplayObject[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(0);

  const query = (currentSearchParams.get('query') || '') as string;
  const currentPage = Number(currentSearchParams.get('page')) || 1;
  const pageSize = 10; // Set page size to 10
  const customerIdFilter = (currentSearchParams.get('customerId') || '') as string;
  const priorityFilter = (currentSearchParams.get('priority') || '') as string;
  const timeOfDayFilter = (currentSearchParams.get('timeOfDay') || '') as string;
  const accessMethodFilter = (currentSearchParams.get('accessMethod') || '') as string;
  const viewMode = (currentSearchParams.get('viewMode') || 'grid') as string;

  // Sorting parameters
  const sortColumn = (currentSearchParams.get('sortColumn') || 'name') as string;
  const sortDirection = (currentSearchParams.get('sortDirection') || 'asc') as string;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
      return;
    }
    setCurrentUser(user);

    // Fetch user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error("Fehler beim Laden des Benutzerprofils:", profileError?.message || profileError);
    }
    const role = profile?.role as 'admin' | 'manager' | 'employee' | 'customer' || 'employee';
    setCurrentUserRole(role);

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: customersData, error: customersError } = await supabase.from('customers').select('id, name').order('name', { ascending: true });
    if (customersError) console.error("Fehler beim Laden der Kunden für Filter:", customersError.message);
    setCustomers(customersData || []);

    let objectsData: DisplayObject[] = [];
    let objectsError: any = null;
    let objectsCount: number | null = 0;

    // Determine filter_user_id and filter_customer_id based on role
    let filterUserId: string | null = null;
    let filterCustomerId: string | null = null;

    if (role === 'employee' || role === 'manager') {
      filterUserId = user.id;
    } else if (role === 'customer') {
      const { data: customerData, error: customerDataError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (customerDataError && customerDataError.code !== 'PGRST116') {
        console.error("Error fetching customer ID for user:", customerDataError);
      }
      filterCustomerId = customerData?.id || null;
    }

    if (query) {
      // Explicitly pass all parameters to avoid ambiguity
      const { data, error: rpcError } = await supabase.rpc('search_objects', {
        search_query: query,
        filter_user_id: filterUserId,
        filter_customer_id: filterCustomerId
      });
      objectsData = (data as DisplayObject[] | null) || [];
      objectsError = rpcError;
      objectsCount = objectsData.length;
    } else {
      let selectQuery = supabase
        .from('objects')
        .select(`
          *,
          customers ( name ),
          customer_contacts ( first_name, last_name )
        `, { count: 'exact' })
        .order(sortColumn, { ascending: sortDirection === 'asc' });

      // Apply RLS-like filtering for non-admin roles if not already handled by RLS policies
      // The RPC function handles it, but for direct table selects, we might need it.
      // However, the existing RLS policies for 'objects' table should cover this.
      // So, no explicit `eq('user_id', user.id)` or `in('customer_id', ...)` needed here
      // as the RPC handles it and direct selects are covered by RLS.

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

      const { data, error: selectError, count: selectCount } = await selectQuery
        .range(from, to);

      objectsData = data?.map(obj => ({
        ...obj,
        customer_name: obj.customers?.[0]?.name || null,
        object_leader_first_name: obj.customer_contacts?.[0]?.first_name || null,
        object_leader_last_name: obj.customer_contacts?.[0]?.last_name || null,
      })) || [];
      objectsError = selectError;
      objectsCount = selectCount;
    }

    if (objectsError) {
      console.error("Fehler beim Laden der Objekte:", objectsError?.message || objectsError);
    }
    setAllObjects(objectsData);
    setTotalCount(objectsCount);
    setLoading(false);
  }, [
    supabase,
    query,
    currentPage,
    pageSize,
    customerIdFilter,
    priorityFilter,
    timeOfDayFilter,
    accessMethodFilter,
    sortColumn,
    sortDirection,
    currentSearchParams // Add currentSearchParams to dependency array
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!currentUser) {
    return null; // Render nothing or a global loading if user is not yet determined
  }

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

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
    { value: 'code', label: 'Code' },
    { value: 'other', label: 'Andere' },
  ];

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low':
      default: return 'secondary';
    }
  };

  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
  const germanDayNames: { [key: string]: string } = {
    monday: 'Mo',
    tuesday: 'Di',
    wednesday: 'Mi',
    thursday: 'Do',
    friday: 'Fr',
    saturday: 'Sa',
    sunday: 'So',
  };

  const activeTab = isMobile ? 'grid' : viewMode;

  const handleViewModeChange = (value: string) => {
    const params = new URLSearchParams(currentSearchParams);
    params.set('viewMode', value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      {loading && <LoadingOverlay isLoading={loading} />}
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

      <Tabs value={activeTab} onValueChange={handleViewModeChange} className="w-full">
        <div className="flex justify-end mb-4">
          <TabsList className="hidden md:grid grid-cols-2 w-fit">
            <TabsTrigger value="grid">Kartenansicht</TabsTrigger>
            <TabsTrigger value="table">Tabellenansicht</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="grid" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {allObjects.length === 0 && !query && !customerIdFilter && !priorityFilter && !timeOfDayFilter && !accessMethodFilter ? (
              <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
                <Building className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                <p className="text-base md:text-lg font-semibold">Noch keine Objekte vorhanden</p>
                <p className="text-sm">Fügen Sie ein neues Objekt hinzu, um es zu verwalten.</p>
                <div className="mt-4">
                  <ObjectCreateDialog />
                </div>
              </div>
            ) : allObjects.length === 0 && (query || customerIdFilter || priorityFilter || timeOfDayFilter || accessMethodFilter) ? (
              <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
                <Building className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                <p className="text-base md:text-lg font-semibold">Keine Objekte gefunden</p>
                <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
              </div>
            ) : (
              allObjects.map((object) => (
                <Card key={object.id} className="shadow-neumorphic glassmorphism-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base md:text-lg font-semibold">{object.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <RecordDetailsDialog record={object} title={`Details zu Objekt: ${object.name}`} />
                      <ObjectEditDialog object={object} />
                      <DeleteObjectButton objectId={object.id} onDeleteSuccess={fetchData} />
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
                        {object.daily_schedules.map((weekSchedule: any, weekIndex: number) => (
                          <div key={weekIndex} className="ml-2 mb-2">
                            <p className="text-xs font-semibold text-muted-foreground">Woche {weekIndex + 1}:</p>
                            {dayNames.map(day => {
                              const daySchedule = weekSchedule[day];
                              if (daySchedule?.hours || daySchedule?.start || daySchedule?.end) {
                                return (
                                  <p key={day} className="text-xs text-muted-foreground ml-2">
                                    {germanDayNames[day]}:
                                    {daySchedule.start && daySchedule.end ? ` ${daySchedule.start} - ${daySchedule.end}` : ''}
                                    {daySchedule.hours ? ` (${Number(daySchedule.hours).toFixed(2)} Std. Netto)` : ''}
                                  </p>
                                );
                              }
                              return null;
                            })}
                          </div>
                        ))}
                        {object.total_weekly_hours !== null && (
                          <div className="mt-2 text-sm font-semibold">
                            Gesamtstunden pro Woche (Durchschnitt): {object.total_weekly_hours.toFixed(2)}
                          </div>
                        )}
                        <div className="mt-2 text-sm font-semibold">
                          Wiederholung: Alle {object.recurrence_interval_weeks} Wochen (Offset: {object.start_week_offset})
                        </div>
                      </TabsContent>
                      <TabsContent value="documents" className="pt-4 space-y-4">
                        <h3 className="text-md font-semibold flex items-center">
                          <FileStack className="mr-2 h-5 w-5" /> Dokumente
                        </h3>
                        <DocumentUploader associatedOrderId={object.id} />
                        <DocumentList associatedOrderId={object.id} />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="table" className="mt-0">
          <ObjectsTableView
            objects={allObjects}
            totalPages={totalPages}
            currentPage={currentPage}
            query={query}
            customerIdFilter={customerIdFilter}
            priorityFilter={priorityFilter}
            timeOfDayFilter={timeOfDayFilter}
            accessMethodFilter={accessMethodFilter}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
          />
        </TabsContent>
      </Tabs>
      {!query && totalPages > 1 && (
        <PaginationControls currentPage={currentPage} totalPages={totalPages} />
      )}
    </div>
  );
}