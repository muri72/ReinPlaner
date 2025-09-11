"use client"; // This page needs to be a client component to use hooks like useIsMobile

import { createClient } from "@/lib/supabase/client";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CustomerContactCreateGeneralDialog } from "@/components/customer-contact-create-general-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense, useEffect, useState, useCallback } from "react";
import { CustomerContactsTableView } from "@/components/customer-contacts-table-view";
import { useIsMobile } from "@/hooks/use-mobile";
import { LoadingOverlay } from "@/components/loading-overlay";
import { PageHeader } from "@/components/page-header";
import { DataTableToolbar, FilterOption, SortOption } from "@/components/data-table-toolbar";
import { CustomerContactsGridView } from "@/components/customer-contacts-grid-view"; // Assuming this will be created or exists

interface DisplayCustomerContact {
  id: string;
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  created_at: string | null;
  customer_name: string | null;
}

export default function CustomerContactsPage() {
  const supabase = createClient();
  const router = useRouter();
  const currentSearchParams = useSearchParams();
  const isMobile = useIsMobile();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allContacts, setAllContacts] = useState<DisplayCustomerContact[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(0);

  const query = currentSearchParams.get('query') || '';
  const currentPage = Number(currentSearchParams.get('page')) || 1;
  const pageSize = 10;
  const customerIdFilter = currentSearchParams.get('customerId') || '';
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

    const { data: customersData, error: customersError } = await supabase.from('customers').select('id, name').order('name', { ascending: true });
    if (customersError) console.error("Fehler beim Laden der Kunden für Filter:", customersError.message);
    setCustomers(customersData || []);

    let selectQuery = supabase
      .from('customer_contacts')
      .select(`*, customers ( name )`, { count: 'exact' })
      .order(sortColumn, { ascending: sortDirection === 'asc' });

    if (query) {
      selectQuery = selectQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,role.ilike.%${query}%,customers.name.ilike.%${query}%`);
    }
    if (customerIdFilter) {
      selectQuery = selectQuery.eq('customer_id', customerIdFilter);
    }

    const { data, error, count } = await selectQuery.range(from, to);

    if (error) {
      console.error("Fehler beim Laden der Kundenkontakte:", error?.message || error);
    }
    setAllContacts(data?.map(contact => ({
      ...contact,
      customer_name: contact.customers?.name || null,
    })) || []);
    setTotalCount(count);
    setLoading(false);
  }, [
    supabase,
    query,
    currentPage,
    pageSize,
    customerIdFilter,
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

  const filterOptions: FilterOption[] = [
    { value: 'customerId', label: 'Kunde', options: customers.map(c => ({ value: c.id, label: c.name })) },
  ];

  const sortOptions: SortOption[] = [
    { value: 'last_name', label: 'Nachname' },
    { value: 'first_name', label: 'Vorname' },
    { value: 'customers.name', label: 'Kunde' },
    { value: 'email', label: 'E-Mail' },
    { value: 'role', label: 'Rolle' },
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
      <PageHeader title="Ihre Kundenkontakte">
        <CustomerContactCreateGeneralDialog onContactCreated={fetchData} />
      </PageHeader>

      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <DataTableToolbar
            searchPlaceholder="Kontakte suchen..."
            filterOptions={filterOptions}
            sortOptions={sortOptions}
          />
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
              <CustomerContactsGridView
                contacts={allContacts}
                query={query}
                customerIdFilter={customerIdFilter}
                onActionSuccess={fetchData}
              />
            </TabsContent>
            <TabsContent value="table" className="mt-0">
              <CustomerContactsTableView
                contacts={allContacts}
                totalPages={totalPages}
                currentPage={currentPage}
                query={query}
                customerIdFilter={customerIdFilter}
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