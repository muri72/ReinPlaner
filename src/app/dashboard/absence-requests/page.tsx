"use client"; // This page needs to be a client component to use hooks like useIsMobile

import { createClient } from "@/lib/supabase/client";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AbsenceTimelineCalendar } from "@/components/absence-timeline-calendar";
import { AbsenceRequestCreateDialog } from "@/components/absence-request-create-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense, useEffect, useState, useCallback } from "react";
import { AbsenceRequestsTableView } from "@/components/absence-requests-table-view";
import { PaginationControls } from "@/components/pagination-controls";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageHeader } from "@/components/page-header";
import { DataTableToolbar, FilterOption, SortOption } from "@/components/data-table-toolbar";
import { AbsenceRequestsGridView } from "@/components/absence-requests-grid-view"; // Assuming this will be created or exists
import { GenericGridSkeleton } from "@/components/generic-grid-skeleton";
import { SimpleListSkeleton } from "@/components/simple-list-skeleton";

interface DisplayAbsenceRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  type: string;
  status: string;
  notes: string | null;
  admin_notes: string | null;
  employees: { first_name: string | null; last_name: string | null } | null;
  user_id: string;
}

export default function AbsenceRequestsPage() {
  const supabase = createClient();
  const router = useRouter();
  const currentSearchParams = useSearchParams();
  const isMobile = useIsMobile();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'manager' | 'employee' | 'customer'>('employee');
  const [allRequests, setAllRequests] = useState<DisplayAbsenceRequest[]>([]);
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(0);

  const query = currentSearchParams.get('query') || '';
  const currentPage = Number(currentSearchParams.get('page')) || 1;
  const pageSize = 10;
  const employeeIdFilter = currentSearchParams.get('employeeId') || '';
  const typeFilter = currentSearchParams.get('type') || '';
  const statusFilter = currentSearchParams.get('status') || '';
  const viewMode = currentSearchParams.get('viewMode') || 'grid';
  const sortColumn = currentSearchParams.get('sortColumn') || 'start_date';
  const sortDirection = currentSearchParams.get('sortDirection') || 'desc';

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
      return;
    }
    setCurrentUser(user);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) console.error("Fehler beim Laden des Benutzerprofils:", profileError?.message || profileError);
    const role = profile?.role as 'admin' | 'manager' | 'employee' | 'customer' || 'employee';
    setCurrentUserRole(role);

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: employeesData, error: employeesError } = await supabase.from('employees').select('id, first_name, last_name').order('last_name', { ascending: true });
    if (employeesError) console.error("Fehler beim Laden der Mitarbeiter für Filter:", employeesError.message);
    setEmployees(employeesData || []);

    let selectQuery = supabase
      .from('absence_requests')
      .select(`*, employees ( first_name, last_name )`, { count: 'exact' })
      .order(sortColumn, { ascending: sortDirection === 'asc' });

    if (role === 'employee') selectQuery = selectQuery.eq('user_id', user.id);
    if (query) selectQuery = selectQuery.or(`notes.ilike.%${query}%,admin_notes.ilike.%${query}%,employees.first_name.ilike.%${query}%,employees.last_name.ilike.%${query}%`);
    if (employeeIdFilter) selectQuery = selectQuery.eq('employee_id', employeeIdFilter);
    if (typeFilter) selectQuery = selectQuery.eq('type', typeFilter);
    if (statusFilter) selectQuery = selectQuery.eq('status', statusFilter);

    const { data, error, count } = await selectQuery.range(from, to);

    if (error) console.error("Fehler beim Laden der Abwesenheitsanträge:", error?.message || error);
    setAllRequests(data?.map(request => ({
      ...request,
      employees: Array.isArray(request.employees) ? request.employees[0] : request.employees,
    })) || []);
    setTotalCount(count);
    setLoading(false);
  }, [
    supabase,
    query,
    currentPage,
    pageSize,
    employeeIdFilter,
    typeFilter,
    statusFilter,
    sortColumn,
    sortDirection,
    currentSearchParams
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!currentUser) {
    return null;;
  }

  if (currentUserRole === 'customer') {
    redirect('/dashboard');
    return null;
  }

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  const filterOptions: FilterOption[] = [
    ...(currentUserRole !== 'employee' ? [{
      value: 'employeeId',
      label: 'Mitarbeiter',
      options: employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))
    }] : []),
    { value: 'type', label: 'Typ', options: [{ value: 'vacation', label: 'Urlaub' }, { value: 'sick_leave', label: 'Krankheit' }, { value: 'training', label: 'Weiterbildung' }, { value: 'other', label: 'Sonstiges' }] },
    { value: 'status', label: 'Status', options: [{ value: 'pending', label: 'Ausstehend' }, { value: 'approved', label: 'Genehmigt' }, { value: 'rejected', label: 'Abgelehnt' }] },
  ];

  const sortOptions: SortOption[] = [
    { value: 'start_date', label: 'Startdatum' },
    { value: 'end_date', label: 'Enddatum' },
    { value: 'employees.last_name', label: 'Mitarbeiter' },
    { value: 'type', label: 'Typ' },
    { value: 'status', label: 'Status' },
  ];

  const activeTab = isMobile ? 'grid' : viewMode;

  const handleViewModeChange = (value: string) => {
    const params = new URLSearchParams(currentSearchParams);
    params.set('viewMode', value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-8 space-y-8">

      <PageHeader title="Abwesenheitsverwaltung" loading={loading}>
        <AbsenceRequestCreateDialog
          currentUserRole={currentUserRole}
          currentUserId={currentUser.id}
          onAbsenceRequestCreated={fetchData}
        />
      </PageHeader>

      {currentUserRole === 'admin' && (
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardHeader>
            <CardTitle>Monatsübersicht Abwesenheiten</CardTitle>
          </CardHeader>
          <CardContent>
            <AbsenceTimelineCalendar />
          </CardContent>
        </Card>
      )}

      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <DataTableToolbar
            searchPlaceholder="Anträge suchen..."
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
                <GenericGridSkeleton count={6} showAvatar={false} showBadges={true} badgeCount={2} />
              ) : (
                <AbsenceRequestsGridView
                  requests={allRequests}
                  query={query}
                  currentUserRole={currentUserRole}
                  currentUserId={currentUser.id}
                  onActionSuccess={fetchData}
                />
              )}
            </TabsContent>
            <TabsContent value="table" className="mt-0">
              {loading ? (
                <SimpleListSkeleton count={5} showMeta={true} />
              ) : (
                <AbsenceRequestsTableView
                  requests={allRequests}
                  totalPages={totalPages}
                  currentPage={currentPage}
                  query={query}
                  currentUserRole={currentUserRole}
                  onActionSuccess={fetchData}
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