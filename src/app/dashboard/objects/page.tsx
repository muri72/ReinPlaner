"use client"; // This page needs to be a client component to use hooks like useIsMobile

import { createClient } from "@/lib/supabase/client";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Building } from "lucide-react";
import { ObjectCreateDialog } from "@/components/object-create-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense, useEffect, useState, useCallback } from "react";
import { ObjectsTableView } from "@/components/objects-table-view";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageHeader } from "@/components/page-header";
import { DataTableToolbar, FilterOption, SortOption } from "@/components/data-table-toolbar";
import { ObjectsGridView } from "@/components/objects-grid-view";
import { ObjectsGridSkeleton } from "@/components/objects-grid-skeleton";

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
  daily_schedules: any[];
  recurrence_interval_weeks: number;
  start_week_offset: number;
}

export default function ObjectsPage() {
  const supabase = createClient();
  const router = useRouter();
  const currentSearchParams = useSearchParams();
  const isMobile = useIsMobile();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allObjects, setAllObjects] = useState<DisplayObject[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(0);

  const query = currentSearchParams.get('query') || '';
  const currentPage = Number(currentSearchParams.get('page')) || 1;
  const pageSize = 10;
  const customerIdFilter = currentSearchParams.get('customerId') || '';
  const priorityFilter = currentSearchParams.get('priority') || '';
  const timeOfDayFilter = currentSearchParams.get('timeOfDay') || '';
  const accessMethodFilter = currentSearchParams.get('accessMethod') || '';
  const viewMode = currentSearchParams.get('viewMode') || 'grid';
  const sortColumn = currentSearchParams.get('sortColumn') || 'name';
  const sortDirection = currentSearchParams.get('sortDirection') || 'asc';

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
      return;
    }
    setCurrentUser(user);

    const { data: customersData, error: customersError } = await supabase.from('customers').select('id, name').order('name', { ascending: true });
    if (customersError) console.error("Fehler beim Laden der Kunden für Filter:", customersError.message);
    setCustomers(customersData || []);

    let objectsData: DisplayObject[] = [];
    let objectsError: any = null;
    let objectsCount: number | null = 0;

    if (query) {
      const { data, error: rpcError } = await supabase.rpc('search_objects', {
        search_query: query,
        filter_user_id: null,
        filter_customer_id: customerIdFilter || null
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

      if (customerIdFilter) selectQuery = selectQuery.eq('customer_id', customerIdFilter);
      if (priorityFilter) selectQuery = selectQuery.eq('priority', priorityFilter);
      if (timeOfDayFilter) selectQuery = selectQuery.eq('time_of_day', timeOfDayFilter);
      if (accessMethodFilter) selectQuery = selectQuery.eq('access_method', accessMethodFilter);

      const { data, error, count } = await selectQuery.range((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize - 1);

      objectsData = data?.map(obj => ({
        ...obj,
        customer_name: obj.customers?.[0]?.name || null,
        object_leader_first_name: obj.customer_contacts?.[0]?.first_name || null,
        object_leader_last_name: obj.customer_contacts?.[0]?.last_name || null,
      })) || [];
      objectsError = error;
      objectsCount = count;
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
    currentSearchParams
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!currentUser) {
    return (
      <div className="p-4 md:p-8 space-y-8">
        <PageHeader title="Ihre Objekte" loading={true} />
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardContent className="p-8">
            <ObjectsGridSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  const filterOptions: FilterOption[] = [
    { value: 'customerId', label: 'Kunde', options: customers.map(c => ({ value: c.id, label: c.name })) },
    { value: 'priority', label: 'Priorität', options: [{ value: 'low', label: 'Niedrig' }, { value: 'medium', label: 'Mittel' }, { value: 'high', label: 'Hoch' }] },
    { value: 'timeOfDay', label: 'Tageszeit', options: [{ value: 'any', label: 'Beliebig' }, { value: 'morning', label: 'Vormittags' }, { value: 'noon', label: 'Mittags' }, { value: 'afternoon', label: 'Nachmittags' }] },
    { value: 'accessMethod', label: 'Zugangsmethode', options: [{ value: 'key', label: 'Schlüssel' }, { value: 'card', label: 'Karte' }, { value: 'code', label: 'Code' }, { value: 'other', label: 'Andere' }] },
  ];

  const sortOptions: SortOption[] = [
    { value: 'name', label: 'Name' },
    { value: 'customers.name', label: 'Kunde' },
    { value: 'address', label: 'Adresse' },
    { value: 'priority', label: 'Priorität' },
    { value: 'time_of_day', label: 'Tageszeit' },
    { value: 'access_method', label: 'Zugang' },
    { value: 'recurrence_interval_weeks', label: 'Wiederholung' },
  ];

  const activeTab = isMobile ? 'grid' : viewMode;

  const handleViewModeChange = (value: string) => {
    const params = new URLSearchParams(currentSearchParams);
    params.set('viewMode', value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <PageHeader title="Ihre Objekte" loading={loading}>
        <ObjectCreateDialog onObjectCreated={fetchData} />
      </PageHeader>

      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <DataTableToolbar
            searchPlaceholder="Objekte suchen..."
            filterOptions={filterOptions}
            sortOptions={sortOptions}
          />
          {totalCount !== null && !loading && (
            <div className="text-sm text-muted-foreground mt-2">
              {totalCount} {totalCount === 1 ? 'Ergebnis' : 'Ergebnisse'} gefunden.
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleViewModeChange} className="w-full">
            <div className="flex justify-end mb-4">
              <TabsList className="hidden md:grid grid-cols-2 w-fit">
                <TabsTrigger value="grid">Kartenansicht</TabsTrigger>
                <TabsTrigger value="table">Tabellenansicht</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="grid" className="mt-0">
              {loading ? (
                <ObjectsGridSkeleton />
              ) : (
                <ObjectsGridView
                  objects={allObjects}
                  query={query}
                  customerIdFilter={customerIdFilter}
                  priorityFilter={priorityFilter}
                  timeOfDayFilter={timeOfDayFilter}
                  accessMethodFilter={accessMethodFilter}
                  onActionSuccess={fetchData}
                />
              )}
            </TabsContent>
            <TabsContent value="table" className="mt-0">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-3/4 bg-muted/60 rounded animate-pulse" />
                        <div className="h-3 w-1/2 bg-muted/60 rounded animate-pulse" />
                      </div>
                      <div className="h-8 w-20 bg-muted/60 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <ObjectsTableView
                  objects={allObjects}
                  totalPages={totalPages}
                  currentPage={currentPage}
                  query={query}
                  customerIdFilter={customerIdFilter}
                  priorityFilter={priorityFilter}
                  timeOfDayFilter={timeOfDayFilter}
                  accessMethodFilter={accessMethodFilter}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          {!loading && !query && totalPages > 1 && (
            <PaginationControls currentPage={currentPage} totalPages={totalPages} />
          )}
        </CardFooter>
      </Card>
    </div>
  );
}