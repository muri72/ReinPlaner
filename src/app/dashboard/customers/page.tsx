"use client";

import { createClient } from "@/lib/supabase/client";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CustomerCreateDialog } from "@/components/customer-create-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense, useEffect, useState, useCallback } from "react";
import { CustomersTableView } from "@/components/customers-table-view";
import { CustomersGridView } from "@/components/customers-grid-view";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageHeader } from "@/components/page-header";
import { DataTableToolbar, FilterOption, SortOption } from "@/components/data-table-toolbar";
import { GenericGridSkeleton } from "@/components/generic-grid-skeleton";
import { SimpleListSkeleton } from "@/components/simple-list-skeleton";

interface DisplayCustomer {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string | null;
  customer_type: string;
  contractual_services: string | null; // New field
}

export default function CustomersPage() {
  const supabase = createClient();
  const router = useRouter();
  const currentSearchParams = useSearchParams();
  const isMobile = useIsMobile();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allCustomers, setAllCustomers] = useState<DisplayCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(0);

  const query = currentSearchParams.get('query') || '';
  const currentPage = Number(currentSearchParams.get('page')) || 1;
  const pageSize = 10;
  const customerTypeFilter = currentSearchParams.get('customerType') || '';
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

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    let customersData: DisplayCustomer[] = [];
    let customersError: any = null;
    let customersCount: number | null = 0;

    let selectQuery = supabase
      .from('customers')
      .select(`*`, { count: 'exact' })
      .order(sortColumn, { ascending: sortDirection === 'asc' });

    if (query) {
      selectQuery = selectQuery.or(`name.ilike.%${query}%,address.ilike.%${query}%,contact_email.ilike.%${query}%,contact_phone.ilike.%${query}%`);
    }
    if (customerTypeFilter) {
      selectQuery = selectQuery.eq('customer_type', customerTypeFilter);
    }

    const { data, error, count } = await selectQuery.range(from, to);

    customersData = data || [];
    customersError = error;
    customersCount = count;

    if (customersError) {
      console.error("Fehler beim Laden der Kunden:", customersError?.message || customersError);
    }
    setAllCustomers(customersData);
    setTotalCount(customersCount);
    setLoading(false);
  }, [
    supabase,
    query,
    currentPage,
    pageSize,
    customerTypeFilter,
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
        <PageHeader title="Ihre Kunden" loading={true} />
        <Card className="shadow-neumorphic glassmorphism-card">
          <CardContent className="p-8">
            <GenericGridSkeleton count={6} showBadges={false} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  const filterOptions: FilterOption[] = [
    {
      value: 'customerType',
      label: 'Kundentyp',
      options: [
        { value: 'customer', label: 'Kunde' },
        { value: 'partner', label: 'Partner' },
      ]
    }
  ];

  const sortOptions: SortOption[] = [
    { value: 'name', label: 'Name' },
    { value: 'created_at', label: 'Erstelldatum' },
  ];

  const activeTab = isMobile ? 'grid' : viewMode;

  const handleViewModeChange = (value: string) => {
    const params = new URLSearchParams(currentSearchParams);
    params.set('viewMode', value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <PageHeader title="Ihre Kunden" loading={loading}>
        <CustomerCreateDialog onCustomerCreated={fetchData} />
      </PageHeader>

      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <DataTableToolbar
            searchPlaceholder="Kunden suchen..."
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
                <GenericGridSkeleton count={6} showBadges={false} />
              ) : (
                <CustomersGridView
                  customers={allCustomers}
                  query={query}
                  customerTypeFilter={customerTypeFilter}
                  onActionSuccess={fetchData}
                />
              )}
            </TabsContent>
            <TabsContent value="table" className="mt-0">
              {loading ? (
                <SimpleListSkeleton count={5} />
              ) : (
                <CustomersTableView
                  customers={allCustomers}
                  totalPages={totalPages}
                  currentPage={currentPage}
                  query={query}
                  customerTypeFilter={customerTypeFilter}
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