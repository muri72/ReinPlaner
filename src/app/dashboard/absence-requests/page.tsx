"use client";

import { createClient } from "@/lib/supabase/client";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AbsenceTimelineCalendar } from "@/components/absence-timeline-calendar";
import { AbsenceRequestCreateDialog } from "@/components/absence-request-create-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState, useCallback } from "react";
import { AbsenceRequestsTableView } from "@/components/absence-requests-table-view";
import { PaginationControls } from "@/components/pagination-controls";
import { DataTableToolbar, FilterOption, SortOption } from "@/components/data-table-toolbar";
import { AbsenceRequestsGridView } from "@/components/absence-requests-grid-view";
import { GenericGridSkeleton } from "@/components/generic-grid-skeleton";
import { SimpleListSkeleton } from "@/components/simple-list-skeleton";
import { VacationBalanceSummary } from "@/components/vacation-balance-summary";
import { AdminEmployeeOverview } from "@/components/admin-employee-overview";
import { AbsenceKpiCards } from "@/components/absence-kpi-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Plane,
  Umbrella,
  GraduationCap,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

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

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'manager' | 'employee' | 'customer'>('employee');
  const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState<string | null>(null);
  const [allRequests, setAllRequests] = useState<DisplayAbsenceRequest[]>([]);
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(0);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const query = currentSearchParams.get('query') || '';
  const currentPage = Number(currentSearchParams.get('page')) || 1;
  const pageSize = 9;
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

    // Get current user's employee ID
    const { data: employeeData } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (employeeData) {
      setCurrentUserEmployeeId(employeeData.id);
    }

    // Fetch employees for filter
    const { data: employeesData, error: employeesError } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .order('last_name', { ascending: true });
    if (employeesError) console.error("Fehler beim Laden der Mitarbeiter für Filter:", employeesError.message);
    setEmployees(employeesData || []);

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

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
    return null;
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
    { value: 'type', label: 'Typ', options: [{ value: 'vacation', label: 'Urlaub' }, { value: 'sick_leave', label: 'Krankheit' }, { value: 'training', label: 'Weiterbildung' }, { value: 'unpaid_leave', label: 'Unbezahlter Urlaub' }] },
    { value: 'status', label: 'Status', options: [{ value: 'pending', label: 'Ausstehend' }, { value: 'approved', label: 'Genehmigt' }, { value: 'rejected', label: 'Abgelehnt' }] },
  ];

  const sortOptions: SortOption[] = [
    { value: 'start_date', label: 'Startdatum' },
    { value: 'end_date', label: 'Enddatum' },
    { value: 'employees.last_name', label: 'Mitarbeiter' },
    { value: 'type', label: 'Typ' },
    { value: 'status', label: 'Status' },
  ];

  const activeTab = viewMode;

  const handleViewModeChange = (value: string) => {
    const params = new URLSearchParams(currentSearchParams);
    params.set('viewMode', value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="p-3 md:p-5 lg:p-6 max-w-[1800px] mx-auto space-y-4">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Abwesenheitsverwaltung</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AbsenceRequestCreateDialog
            currentUserRole={currentUserRole}
            currentUserId={currentUser.id}
            onAbsenceRequestCreated={fetchData}
          />
        </div>
      </div>

      {/* Vacation Balance Summary */}
      {currentUserEmployeeId && (
        <VacationBalanceSummary employeeId={currentUserEmployeeId} />
      )}

      {/* Admin Section - KPI Cards and Overview */}
      {currentUserRole === 'admin' && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <AbsenceKpiCards />

          {/* Employee Overview Sidebar - Full Width */}
          <AdminEmployeeOverview
            selectedEmployeeId={selectedEmployeeId}
            onEmployeeSelect={setSelectedEmployeeId}
            onActionSuccess={fetchData}
          />

          {/* Team Absence Calendar - BELOW the admin overview */}
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Team-Monatsübersicht
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0">
              <AbsenceTimelineCalendar />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content - Requests List */}
      <Card>
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <DataTableToolbar
              searchPlaceholder="Anträge suchen..."
              filterOptions={filterOptions}
              sortOptions={sortOptions}
            />
            <Tabs value={activeTab} onValueChange={handleViewModeChange}>
              <TabsList className="grid w-24 grid-cols-2 h-8">
                <TabsTrigger value="grid" className="text-xs">Karten</TabsTrigger>
                <TabsTrigger value="table" className="text-xs">Tabelle</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            viewMode === 'grid' ? (
              <GenericGridSkeleton count={6} showAvatar={false} showBadges={true} badgeCount={2} />
            ) : (
              <SimpleListSkeleton count={5} showMeta={true} />
            )
          ) : activeTab === 'grid' ? (
            <AbsenceRequestsGridView
              requests={allRequests}
              query={query}
              currentUserRole={currentUserRole}
              currentUserId={currentUser.id}
              onActionSuccess={fetchData}
            />
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
        </CardContent>

        {!loading && !query && totalPages > 1 && (
          <CardFooter className="flex justify-center py-3 border-t">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  const params = new URLSearchParams(currentSearchParams);
                  params.set('page', String(Math.max(1, currentPage - 1)));
                  router.replace(`?${params.toString()}`);
                }}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-3 font-medium">
                {currentPage} <span className="text-muted-foreground">/ {totalPages}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  const params = new URLSearchParams(currentSearchParams);
                  params.set('page', String(Math.min(totalPages, currentPage + 1)));
                  router.replace(`?${params.toString()}`);
                }}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
