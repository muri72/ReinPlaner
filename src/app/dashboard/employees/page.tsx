"use client"; // This page needs to be a client component to use hooks like useIsMobile

import { createClient } from "@/lib/supabase/client";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { EmployeeCreateDialog } from "@/components/employee-create-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense, useEffect, useState, useCallback } from "react";
import { EmployeesTableView } from "@/components/employees-table-view";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageHeader } from "@/components/page-header";
import { DataTableToolbar, FilterOption, SortOption } from "@/components/data-table-toolbar";
import { EmployeesGridView } from "@/components/employees-grid-view";
import { GenericGridSkeleton } from "@/components/generic-grid-skeleton";
import { SimpleListSkeleton } from "@/components/simple-list-skeleton";

interface DisplayEmployee {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  hire_date: string | null;
  status: string;
  contract_type: string | null;
  contract_end_date: string | null;
  hourly_rate: number | null;
  start_date: string | null;
  job_title: string | null;
  department: string | null;
  notes: string | null;
  address: string | null;
  date_of_birth: string | null;
  social_security_number: string | null;
  tax_id_number: string | null;
  health_insurance_provider: string | null;
  default_daily_schedules: any[]; // New field
  default_recurrence_interval_weeks: number; // New field
  default_start_week_offset: number; // New field
}

export default function EmployeesPage() {
  const supabase = createClient();
  const router = useRouter();
  const currentSearchParams = useSearchParams();
  const isMobile = useIsMobile();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allEmployees, setAllEmployees] = useState<DisplayEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(0);

  const query = currentSearchParams.get('query') || '';
  const currentPage = Number(currentSearchParams.get('page')) || 1;
  const pageSize = 10;
  const statusFilter = currentSearchParams.get('status') || '';
  const contractTypeFilter = currentSearchParams.get('contractType') || '';
  const viewMode = currentSearchParams.get('viewMode') || 'grid';
  const sortColumn = currentSearchParams.get('sortColumn') || 'last_name';
  const sortDirection = currentSearchParams.get('sortDirection') || 'asc';

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
      return;
    }
    setCurrentUser(user);

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    let selectQuery = supabase
      .from('employees')
      .select(`*`, { count: 'exact' })
      .order(sortColumn, { ascending: sortDirection === 'asc' });

    if (query) {
      selectQuery = selectQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,job_title.ilike.%${query}%`);
    }
    if (statusFilter) selectQuery = selectQuery.eq('status', statusFilter);
    if (contractTypeFilter) selectQuery = selectQuery.eq('contract_type', contractTypeFilter);

    const { data, error, count } = await selectQuery.range(from, to);

    if (error) {
      console.error("Fehler beim Laden der Mitarbeiter:", error?.message || error);
    }
    setAllEmployees(data || []);
    setTotalCount(count);
    setLoading(false);
  }, [
    supabase,
    query,
    currentPage,
    pageSize,
    statusFilter,
    contractTypeFilter,
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
        <PageHeader title="Ihre Mitarbeiter" loading={true} />
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardContent className="p-8">
            <GenericGridSkeleton count={6} showAvatar={true} showBadges={true} badgeCount={2} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  const filterOptions: FilterOption[] = [
    { value: 'status', label: 'Status', options: [{ value: 'active', label: 'Aktiv' }, { value: 'inactive', label: 'Inaktiv' }, { value: 'on_leave', label: 'Im Urlaub' }] },
    { value: 'contractType', label: 'Vertragsart', options: [{ value: 'minijob', label: 'Minijob' }, { value: 'part_time', label: 'Teilzeit' }, { value: 'full_time', label: 'Vollzeit' }, { value: 'fixed_term', label: 'Befristet' }] },
  ];

  const sortOptions: SortOption[] = [
    { value: 'last_name', label: 'Nachname' },
    { value: 'first_name', label: 'Vorname' },
    { value: 'status', label: 'Status' },
    { value: 'contract_type', label: 'Vertragsart' },
    { value: 'hourly_rate', label: 'Stundenlohn' },
    { value: 'job_title', label: 'Position' },
  ];

  const activeTab = isMobile ? 'grid' : viewMode;

  const handleViewModeChange = (value: string) => {
    const params = new URLSearchParams(currentSearchParams);
    params.set('viewMode', value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <PageHeader title="Ihre Mitarbeiter" loading={loading}>
        <EmployeeCreateDialog onEmployeeCreated={fetchData} />
      </PageHeader>

      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <DataTableToolbar
            searchPlaceholder="Mitarbeiter suchen..."
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
                <GenericGridSkeleton count={6} showAvatar={true} showBadges={true} badgeCount={2} />
              ) : (
                <EmployeesGridView
                  employees={allEmployees}
                  query={query}
                  statusFilter={statusFilter}
                  contractTypeFilter={contractTypeFilter}
                  onActionSuccess={fetchData}
                />
              )}
            </TabsContent>
            <TabsContent value="table" className="mt-0">
              {loading ? (
                <SimpleListSkeleton count={5} showMeta={true} />
              ) : (
                <EmployeesTableView
                  employees={allEmployees}
                  totalPages={totalPages}
                  currentPage={currentPage}
                  query={query}
                  statusFilter={statusFilter}
                  contractTypeFilter={contractTypeFilter}
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