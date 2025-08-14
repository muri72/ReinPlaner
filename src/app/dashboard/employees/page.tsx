"use client"; // This page needs to be a client component to use hooks like useIsMobile

import { createClient } from "@/lib/supabase/client";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, CalendarDays, UserRoundCheck, UserRoundX, UserRoundMinus, Briefcase, DollarSign, Tag, Building2, FileText, MapPin, Cake, CreditCard, Shield, UsersRound, PlusCircle, FileStack } from "lucide-react";
import { EmployeeEditDialog } from "@/components/employee-edit-dialog";
import { DeleteEmployeeButton } from "@/components/delete-employee-button";
import { SearchInput } from "@/components/search-input";
import { Badge } from "@/components/ui/badge";
import { EmployeeCreateDialog } from "@/components/employee-create-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense, useEffect, useState, useCallback } from "react";
import { FilterSelect } from "@/components/filter-select";
import { EmployeesTableView } from "@/components/employees-table-view"; // Import the new table view component
import { useIsMobile } from "@/hooks/use-mobile"; // Import the hook
import { RecordDetailsDialog } from "@/components/record-details-dialog"; // Import RecordDetailsDialog
import { LoadingOverlay } from "@/components/loading-overlay"; // Import the new LoadingOverlay

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
}

export default function EmployeesPage({
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
  const [allEmployees, setAllEmployees] = useState<DisplayEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(0);

  const query = currentSearchParams.get('query') || '';
  const currentPage = Number(currentSearchParams.get('page')) || 1;
  const pageSize = 10; // Set page size to 10
  const statusFilter = currentSearchParams.get('status') || '';
  const contractTypeFilter = currentSearchParams.get('contractType') || '';
  const viewMode = currentSearchParams.get('viewMode') === 'table' ? 'table' : 'grid';

  // Sorting parameters
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

    // Fetch the current user's role to apply RLS correctly
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || profileError);
    }
    const isAdmin = userProfile?.role === 'admin';
    setCurrentUserRole(userProfile?.role as 'admin' | 'manager' | 'employee' | 'customer' || 'employee');

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    let employeesData: DisplayEmployee[] = [];
    let employeesError: any = null;
    let employeesCount: number | null = 0;

    if (query) {
      // For search, fetch all and filter in memory (RPC for search doesn't support all joins/filters easily)
      let fetchQuery = supabase
        .from('employees')
        .select(`*`);
      
      if (!isAdmin) {
        fetchQuery = fetchQuery.eq('user_id', user.id);
      }

      const { data, error: fetchError } = await fetchQuery;
      
      if (fetchError) {
        employeesError = fetchError;
      } else {
        const filteredData = data.filter(e => 
          e.first_name.toLowerCase().includes(query.toLowerCase()) ||
          e.last_name.toLowerCase().includes(query.toLowerCase()) ||
          e.email?.toLowerCase().includes(query.toLowerCase()) ||
          e.phone?.toLowerCase().includes(query.toLowerCase()) ||
          e.job_title?.toLowerCase().includes(query.toLowerCase()) ||
          e.department?.toLowerCase().includes(query.toLowerCase()) ||
          e.address?.toLowerCase().includes(query.toLowerCase()) ||
          e.social_security_number?.toLowerCase().includes(query.toLowerCase()) ||
          e.tax_id_number?.toLowerCase().includes(query.toLowerCase()) ||
          e.health_insurance_provider?.toLowerCase().includes(query.toLowerCase())
        );
        employeesData = filteredData;
        employeesCount = employeesData.length;
      }
    } else {
      let selectQuery = supabase
        .from('employees')
        .select(`*`, { count: 'exact' })
        .order(sortColumn, { ascending: sortDirection === 'asc' });

      if (!isAdmin) {
        selectQuery = selectQuery.eq('user_id', user.id);
      }

      if (statusFilter) {
        selectQuery = selectQuery.eq('status', statusFilter);
      }
      if (contractTypeFilter) {
        selectQuery = selectQuery.eq('contract_type', contractTypeFilter);
      }

      const { data, error: selectError, count: selectCount } = await selectQuery
        .range(from, to);

      employeesData = data || [];
      employeesError = selectError;
      employeesCount = selectCount;
    }

    if (employeesError) {
      console.error("Fehler beim Laden der Mitarbeiter:", employeesError?.message || employeesError);
    }
    setAllEmployees(employeesData);
    setTotalCount(employeesCount);
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
    currentSearchParams // Add currentSearchParams to dependency array
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!currentUser) {
    return null; // Render nothing or a global loading if user is not yet determined
  }

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'destructive';
      case 'on_leave': return 'warning';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <UserRoundCheck className="mr-2 h-4 w-4 flex-shrink-0" />;
      case 'inactive': return <UserRoundX className="mr-2 h-4 w-4 flex-shrink-0" />;
      case 'on_leave': return <UserRoundMinus className="mr-2 h-4 w-4 flex-shrink-0" />;
      default: return null;
    }
  };

  const statusOptions = [
    { value: 'active', label: 'Aktiv' },
    { value: 'inactive', label: 'Inaktiv' },
    { value: 'on_leave', label: 'Im Urlaub' },
  ];

  const contractTypeOptions = [
    { value: 'minijob', label: 'Minijob' },
    { value: 'part_time', label: 'Teilzeit' },
    { value: 'full_time', label: 'Vollzeit' },
    { value: 'fixed_term', label: 'Befristet' },
  ];

  const activeTab = isMobile ? 'grid' : viewMode;

  const handleViewModeChange = (value: string) => {
    const params = new URLSearchParams(currentSearchParams);
    params.set('viewMode', value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      {loading && <LoadingOverlay isLoading={loading} />}
      <h1 className="text-2xl md:text-3xl font-bold">Ihre Mitarbeiter</h1>

      <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <SearchInput placeholder="Mitarbeiter suchen..." />
        <EmployeeCreateDialog />
      </div>

      {/* Filter Section */}
      <Suspense fallback={<div>Lade Filter...</div>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          <FilterSelect
            paramName="status"
            label="Status"
            options={statusOptions}
            currentValue={statusFilter}
          />
          <FilterSelect
            paramName="contractType"
            label="Vertragsart"
            options={contractTypeOptions}
            currentValue={contractTypeFilter}
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
            {allEmployees.length === 0 && !query && !statusFilter && !contractTypeFilter ? (
              <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
                <UsersRound className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                <p className="text-base md:text-lg font-semibold">Noch keine Mitarbeiter vorhanden</p>
                <p className="text-sm">Fügen Sie einen neuen Mitarbeiter hinzu, um Ihr Team zu erweitern.</p>
                <div className="mt-4">
                  <EmployeeCreateDialog />
                </div>
              </div>
            ) : allEmployees.length === 0 && (query || statusFilter || contractTypeFilter) ? (
              <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
                <UsersRound className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                <p className="text-base md:text-lg font-semibold">Keine Mitarbeiter gefunden</p>
                <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
              </div>
            ) : (
              allEmployees.map((employee) => (
                <Card key={employee.id} className="shadow-neumorphic glassmorphism-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base md:text-lg font-semibold">{employee.first_name} {employee.last_name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <RecordDetailsDialog record={employee} title={`Details zu Mitarbeiter: ${employee.first_name} ${employee.last_name}`} />
                      <EmployeeEditDialog employee={employee} />
                      <DeleteEmployeeButton employeeId={employee.id} onDeleteSuccess={fetchData} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Tabs defaultValue="details" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="documents">Dokumente</TabsTrigger>
                      </TabsList>
                      <TabsContent value="details" className="pt-4 space-y-2 text-sm text-muted-foreground">
                        {employee.email && (
                          <div className="flex items-center">
                            <Mail className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>{employee.email}</span>
                          </div>
                        )}
                        {employee.phone && (
                          <div className="flex items-center">
                            <Phone className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>{employee.phone}</span>
                          </div>
                        )}
                        {employee.job_title && (
                          <div className="flex items-center">
                            <Tag className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>Position: {employee.job_title}</span>
                          </div>
                        )}
                        {employee.department && (
                          <div className="flex items-center">
                            <Building2 className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>Abteilung: {employee.department}</span>
                          </div>
                        )}
                        {employee.hire_date && (
                          <div className="flex items-center">
                            <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>Einstellungsdatum: {new Date(employee.hire_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {employee.start_date && (
                          <div className="flex items-center">
                            <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>Vertragsstart: {new Date(employee.start_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {employee.contract_type && (
                          <div className="flex items-center">
                            <Briefcase className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>Vertragsart: <Badge variant="secondary">{employee.contract_type}</Badge></span>
                          </div>
                        )}
                        {employee.contract_type === 'fixed_term' && employee.contract_end_date && (
                          <div className="flex items-center">
                            <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>Vertragsende: {new Date(employee.contract_end_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {employee.hourly_rate !== null && employee.hourly_rate !== undefined && (
                          <div className="flex items-center">
                            <DollarSign className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>Stundenlohn: {employee.hourly_rate.toFixed(2)} €</span>
                          </div>
                        )}
                        {employee.notes && (
                          <div className="flex items-center">
                            <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>Notizen: {employee.notes}</span>
                          </div>
                        )}
                        {employee.address && (
                          <div className="flex items-center">
                            <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>Adresse: {employee.address}</span>
                          </div>
                        )}
                        {employee.date_of_birth && (
                          <div className="flex items-center">
                            <Cake className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>Geburtsdatum: {new Date(employee.date_of_birth).toLocaleDateString()}</span>
                          </div>
                        )}
                        {employee.social_security_number && (
                          <div className="flex items-center">
                            <CreditCard className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>SV-Nummer: {employee.social_security_number}</span>
                          </div>
                        )}
                        {employee.tax_id_number && (
                          <div className="flex items-center">
                            <CreditCard className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>Steuer-ID: {employee.tax_id_number}</span>
                          </div>
                        )}
                        {employee.health_insurance_provider && (
                          <div className="flex items-center">
                            <Shield className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>Krankenkasse: {employee.health_insurance_provider}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          {getStatusIcon(employee.status)}
                          <Badge variant={getStatusBadgeVariant(employee.status)}>{employee.status}</Badge>
                        </div>
                      </TabsContent>
                      <TabsContent value="documents" className="pt-4 space-y-4">
                        <h3 className="text-md font-semibold flex items-center">
                          <FileStack className="mr-2 h-5 w-5" /> Dokumente
                        </h3>
                        <DocumentUploader associatedEmployeeId={employee.id} />
                        <DocumentList associatedEmployeeId={employee.id} />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="table" className="mt-0">
          <EmployeesTableView
            employees={allEmployees}
            totalPages={totalPages}
            currentPage={currentPage}
            query={query}
            statusFilter={statusFilter}
            contractTypeFilter={contractTypeFilter}
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