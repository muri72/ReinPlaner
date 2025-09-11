"use client";

import { createClient } from "@/lib/supabase/client";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { SearchInput } from "@/components/search-input";
import { CustomerCreateDialog } from "@/components/customer-create-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense, useEffect, useState, useCallback } from "react";
import { FilterSelect } from "@/components/filter-select";
import { CustomersTableView } from "@/components/customers-table-view";
import { CustomersGridView } from "@/components/customers-grid-view";
import { useIsMobile } from "@/hooks/use-mobile";
import { LoadingOverlay } from "@/components/loading-overlay";
import { PageHeader } from "@/components/page-header";
import { DataTableToolbar } from "@/components/data-table-toolbar";

interface DisplayCustomer {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string | null;
  customer_type: string;
}

export default function CustomersPage({
  searchParams,
}: {
  searchParams?: any;
}) {
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
  const viewMode = currentSearchParams.get('viewMode') === 'table' ? 'table' : 'grid';
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

    if (query) {
      const { data, error: fetchError } = await supabase
        .from('customers')
        .select(`*, customer_contacts ( first_name, last_name )`);
      
      if (fetchError) {
        customersError = fetchError;
      } else {
        const filteredData = data.filter(c => 
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.address?.toLowerCase().includes(query.toLowerCase()) ||
          c.contact_email?.toLowerCase().includes(query.toLowerCase()) ||
          c.contact_phone?.toLowerCase().includes(query.toLowerCase()) ||
          c.customer_type.toLowerCase().includes(query.toLowerCase())
        );
        customersData = filteredData.map(c => ({
          id: c.id,
          user_id: c.user_id,
          name: c.name,
          address: c.address,
          contact_email: c.contact_email,
          contact_phone: c.contact_phone,
          created_at: c.created_at,
          customer_type: c.customer_type,
        }));
        customersCount = customersData.length;
      }
    } else {
      let selectQuery = supabase
        .from('customers')
        .select(`*`, { count: 'exact' })
        .order(sortColumn, { ascending: sortDirection === 'asc' });

      if (customerTypeFilter) {
        selectQuery = selectQuery.eq('customer_type', customerTypeFilter);
      }

      const { data, error: selectError, count: selectCount } = await selectQuery
        .range(from, to);

      customersData = data || [];
      customersError = selectError;
      customersCount = selectCount;
    }

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
    return <LoadingOverlay isLoading={true} />;
  }

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  const customerTypeOptions = [
    { value: 'customer', label: 'Kunde' },
    { value: 'partner', label: 'Partner' },
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
      <PageHeader title="Ihre Kunden">
        <CustomerCreateDialog onCustomerCreated={fetchData} />
      </PageHeader>

      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <DataTableToolbar>
            <SearchInput placeholder="Kunden suchen..." className="w-full sm:w-auto sm:flex-grow" />
            <Suspense fallback={<div>Lade Filter...</div>}>
              <FilterSelect
                paramName="customerType"
                placeholder="Alle Kundentypen"
                options={customerTypeOptions}
                currentValue={customerTypeFilter}
              />
            </Suspense>
          </DataTableToolbar>
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
              <CustomersGridView
                customers={allCustomers}
                query={query}
                customerTypeFilter={customerTypeFilter}
                onActionSuccess={fetchData}
              />
            </TabsContent>
            <TabsContent value="table" className="mt-0">
              <CustomersTableView
                customers={allCustomers}
                totalPages={totalPages}
                currentPage={currentPage}
                query={query}
                customerTypeFilter={customerTypeFilter}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onActionSuccess={fetchData}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          {!query && totalPages > 1 && (
            <PaginationControls currentPage={currentPage} totalPages={totalPages} />
          )}
        </CardFooter>
      </Card>
    </div>
  );
}