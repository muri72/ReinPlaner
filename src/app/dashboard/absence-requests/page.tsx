"use client"; // This page needs to be a client component to use hooks like useIsMobile

import { createClient } from "@/lib/supabase/client";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarOff, User, FileText, CheckCircle2, XCircle, AlertCircle, PlusCircle } from "lucide-react";
import { AbsenceRequestEditDialog } from "@/components/absence-request-edit-dialog";
import { DeleteAbsenceRequestButton } from "@/components/delete-absence-request-button";
import { AbsenceTimelineCalendar } from "@/components/absence-timeline-calendar";
import { Button } from "@/components/ui/button";
import { AbsenceRequestCreateDialog } from "@/components/absence-request-create-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense, useEffect, useState } from "react";
import { FilterSelect } from "@/components/filter-select";
import { AbsenceRequestsTableView } from "@/components/absence-requests-table-view"; // Import the new table view component
import { PaginationControls } from "@/components/pagination-controls";
import { useIsMobile } from "@/hooks/use-mobile"; // Import the hook

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
  user_id: string; // Add user_id for passing to edit dialog
}

export default function AbsenceRequestsPage({
  searchParams,
}: {
  searchParams?: any;
}) {
  const supabase = createClient();
  const router = useRouter();
  const currentSearchParams = useSearchParams();
  const isMobile = useIsMobile();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'manager' | 'employee'>('employee');
  const [allRequests, setAllRequests] = useState<DisplayAbsenceRequest[]>([]);
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(0);

  const query = typeof searchParams?.query === 'string' ? searchParams.query : '';
  const currentPage = Number(searchParams?.page) || 1;
  const pageSize = Number(searchParams?.pageSize) || 9;
  const employeeIdFilter = searchParams?.employeeId || '';
  const typeFilter = searchParams?.type || '';
  const statusFilter = searchParams?.status || '';
  const viewMode = searchParams?.viewMode === 'table' ? 'table' : 'grid';

  // Sorting parameters
  const sortColumn = Array.isArray(searchParams?.sortColumn) ? searchParams.sortColumn[0] : searchParams?.sortColumn || 'start_date';
  const sortDirection = Array.isArray(searchParams?.sortDirection) ? searchParams.sortDirection[0] : searchParams?.sortDirection || 'desc';

  useEffect(() => {
    const fetchData = async () => {
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

      if (profileError) {
        console.error("Fehler beim Laden des Benutzerprofils:", profileError?.message || profileError);
      }
      const role = profile?.role as 'admin' | 'manager' | 'employee' || 'employee';
      setCurrentUserRole(role);

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data: employeesData, error: employeesError } = await supabase.from('employees').select('id, first_name, last_name').order('last_name', { ascending: true });
      if (employeesError) console.error("Fehler beim Laden der Mitarbeiter für Filter:", employeesError.message);
      setEmployees(employeesData || []);

      let requestsData: DisplayAbsenceRequest[] = [];
      let requestsError: any = null;
      let requestsCount: number | null = 0;

      if (query) {
        // For search, fetch all and filter in memory
        let fetchQuery = supabase
          .from('absence_requests')
          .select(`
            *,
            employees ( first_name, last_name )
          `);
        
        if (role === 'employee') {
          fetchQuery = fetchQuery.eq('user_id', user.id);
        }

        const { data, error: fetchError } = await fetchQuery;
        
        if (fetchError) {
          requestsError = fetchError;
        } else {
          const filteredData = data.filter(r => 
            r.notes?.toLowerCase().includes(query.toLowerCase()) ||
            r.admin_notes?.toLowerCase().includes(query.toLowerCase()) ||
            r.type.toLowerCase().includes(query.toLowerCase()) ||
            r.status.toLowerCase().includes(query.toLowerCase()) ||
            r.employees?.first_name?.toLowerCase().includes(query.toLowerCase()) ||
            r.employees?.last_name?.toLowerCase().includes(query.toLowerCase())
          );
          requestsData = filteredData.map(r => ({
            ...r,
            employees: Array.isArray(r.employees) ? r.employees[0] : r.employees,
          }));
          requestsCount = requestsData.length;
        }
      } else {
        let selectQuery = supabase
          .from('absence_requests')
          .select(`
            *,
            employees ( first_name, last_name )
          `, { count: 'exact' })
          .order(sortColumn, { ascending: sortDirection === 'asc' });

        if (role === 'employee') {
          selectQuery = selectQuery.eq('user_id', user.id);
        }

        if (employeeIdFilter) {
          selectQuery = selectQuery.eq('employee_id', employeeIdFilter);
        }
        if (typeFilter) {
          selectQuery = selectQuery.eq('type', typeFilter);
        }
        if (statusFilter) {
          selectQuery = selectQuery.eq('status', statusFilter);
        }

        const { data, error: selectError, count: selectCount } = await selectQuery
          .range(from, to);

        requestsData = data?.map(request => ({
          ...request,
          employees: Array.isArray(request.employees) ? request.employees[0] : request.employees,
        })) || [];
        requestsError = selectError;
        requestsCount = selectCount;
      }

      if (requestsError) {
        console.error("Fehler beim Laden der Abwesenheitsanträge:", requestsError?.message || requestsError);
      }
      setAllRequests(requestsData);
      setTotalCount(requestsCount);
      setLoading(false);
    };

    fetchData();
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
  ]);

  if (loading || !currentUser) {
    return <div className="p-4 md:p-8">Lade Abwesenheitsanträge...</div>;
  }

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      case 'pending':
      default: return 'warning';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="mr-2 h-4 w-4 text-success-foreground" />;
      case 'rejected': return <XCircle className="mr-2 h-4 w-4 text-destructive-foreground" />;
      case 'pending':
      default: return <AlertCircle className="mr-2 h-4 w-4 text-warning-foreground" />;
    }
  };

  const typeTranslations: { [key: string]: string } = {
    vacation: "Urlaub",
    sick_leave: "Krankheit",
    training: "Weiterbildung",
    other: "Sonstiges",
  };

  const typeOptions = Object.entries(typeTranslations).map(([value, label]) => ({ value, label }));
  const statusOptions = [
    { value: 'pending', label: 'Ausstehend' },
    { value: 'approved', label: 'Genehmigt' },
    { value: 'rejected', label: 'Abgelehnt' },
  ];

  const activeTab = isMobile ? 'grid' : viewMode;

  const handleViewModeChange = (value: string) => {
    const params = new URLSearchParams(currentSearchParams);
    params.set('viewMode', value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Abwesenheitsverwaltung</h1>

      {currentUserRole === 'admin' && (
        <div className="space-y-6">
          <h2 className="text-xl md:text-2xl font-bold">Monatsübersicht Abwesenheiten</h2>
          <div className="p-4 border rounded-lg shadow-neumorphic glassmorphism-card">
            <AbsenceTimelineCalendar />
          </div>
        </div>
      )}

      <div className="space-y-6">
        <h2 className="text-xl md:text-2xl font-bold">Antragsübersicht</h2>
        <div className="flex justify-end mb-4">
          <AbsenceRequestCreateDialog currentUserRole={currentUserRole} currentUserId={currentUser.id} />
        </div>

        {/* Filter Section */}
        <Suspense fallback={<div>Lade Filter...</div>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            {currentUserRole !== 'employee' && (
              <FilterSelect
                paramName="employeeId"
                label="Mitarbeiter"
                options={employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))}
                currentValue={employeeIdFilter}
              />
            )}
            <FilterSelect
              paramName="type"
              label="Typ"
              options={typeOptions}
              currentValue={typeFilter}
            />
            <FilterSelect
              paramName="status"
              label="Status"
              options={statusOptions}
              currentValue={statusFilter}
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
              {allRequests.length === 0 && !query && !employeeIdFilter && !typeFilter && !statusFilter ? (
                <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
                  <CalendarOff className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                  <p className="text-base md:text-lg font-semibold">Keine Anträge gefunden</p>
                  <p className="text-sm">Reichen Sie einen neuen Abwesenheitsantrag ein.</p>
                  <div className="mt-4">
                    {/* The button to open the dialog is now part of AbsenceRequestCreateDialog */}
                  </div>
                </div>
              ) : allRequests.length === 0 && (query || employeeIdFilter || typeFilter || statusFilter) ? (
                <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
                  <CalendarOff className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                  <p className="text-base md:text-lg font-semibold">Keine Anträge gefunden</p>
                  <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
                </div>
              ) : (
                allRequests.map((request) => (
                  <Card key={request.id} className="shadow-neumorphic glassmorphism-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-base md:text-lg font-semibold">
                        {typeTranslations[request.type] || 'Abwesenheit'}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <AbsenceRequestEditDialog request={request} currentUserRole={currentUserRole} currentUserId={currentUser.id} />
                        <DeleteAbsenceRequestButton requestId={request.id} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      {currentUserRole !== 'employee' && request.employees && (
                        <div className="flex items-center">
                          <User className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span>Mitarbeiter: {request.employees.first_name} {request.employees.last_name}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <CalendarOff className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Datum: {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        {getStatusIcon(request.status)}
                        <Badge variant={getStatusBadgeVariant(request.status)}>{request.status}</Badge>
                      </div>
                      {request.notes && (
                        <div className="flex items-start">
                          <FileText className="mr-2 h-4 w-4 mt-1 flex-shrink-0" />
                          <p className="flex-grow">Notizen: {request.notes}</p>
                        </div>
                      )}
                      {request.admin_notes && (
                        <div className="flex items-start">
                          <FileText className="mr-2 h-4 w-4 mt-1 flex-shrink-0" />
                          <p className="flex-grow">Admin-Notizen: {request.admin_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          <TabsContent value="table" className="mt-0">
            <AbsenceRequestsTableView
              requests={allRequests}
              totalPages={totalPages}
              currentPage={currentPage}
              query={query}
              employeeIdFilter={employeeIdFilter}
              typeFilter={typeFilter}
              statusFilter={statusFilter}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              currentUserRole={currentUserRole}
            />
          </TabsContent>
        </Tabs>
        {!query && totalPages > 1 && (
          <PaginationControls currentPage={currentPage} totalPages={totalPages} />
        )}
      </div>
    </div>
  );
}