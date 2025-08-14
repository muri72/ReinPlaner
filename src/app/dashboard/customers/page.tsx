"use client"; // This page needs to be a client component to use hooks like useIsMobile

import { createClient } from "@/lib/supabase/client"; // Use client-side supabase for client component
import { redirect, useRouter, useSearchParams } from "next/navigation"; // Import useRouter and useSearchParams for client-side navigation
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Users, Handshake, PlusCircle, FileStack } from "lucide-react";
import { CustomerEditDialog } from "@/components/customer-edit-dialog";
import { DeleteCustomerButton } from "@/components/delete-customer-button";
import { SearchInput } from "@/components/search-input";
import { Badge } from "@/components/ui/badge";
import { CustomerCreateDialog } from "@/components/customer-create-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/document-uploader";
import { DocumentList } from "@/components/document-list";
import { Suspense, useEffect, useState } from "react"; // Import useEffect and useState
import { FilterSelect } from "@/components/filter-select";
import { CustomersTableView } from "@/components/customers-table-view"; // Import the new table view component
import { useIsMobile } from "@/hooks/use-mobile"; // Import the hook

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
  const pageSize = Number(currentSearchParams.get('pageSize')) || 9;
  const customerTypeFilter = currentSearchParams.get('customerType') || '';
  const viewMode = currentSearchParams.get('viewMode') === 'table' ? 'table' : 'grid';

  // Sorting parameters
  const sortColumn = currentSearchParams.get('sortColumn') || 'name';
  const sortDirection = currentSearchParams.get('sortDirection') || 'asc';

  useEffect(() => {
    const fetchData = async () => {
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
        // For search, fetch all and filter in memory (RPC for search doesn't support all joins/filters easily)
        const { data, error: fetchError } = await supabase
          .from('customers')
          .select(`
            *,
            customer_contacts ( first_name, last_name )
          `);
        
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
    };

    fetchData();
  }, [
    supabase,
    query,
    currentPage,
    pageSize,
    customerTypeFilter,
    sortColumn,
    sortDirection,
    currentSearchParams // Add currentSearchParams to dependency array
  ]);

  if (loading || !currentUser) {
    return <div className="p-4 md:p-8">Lade Kunden...</div>;
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
      <h1 className="text-2xl md:text-3xl font-bold">Ihre Kunden</h1>

      <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <SearchInput placeholder="Kunden suchen..." />
        <CustomerCreateDialog />
      </div>

      {/* Filter Section */}
      <Suspense fallback={<div>Lade Filter...</div>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          <FilterSelect
            paramName="customerType"
            label="Kundentyp"
            options={customerTypeOptions}
            currentValue={customerTypeFilter}
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
            {allCustomers.length === 0 && !query && !customerTypeFilter ? (
              <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
                <Users className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                <p className="text-base md:text-lg font-semibold">Noch keine Kunden vorhanden</p>
                <p className="text-sm">Fügen Sie Ihren ersten Kunden hinzu, um loszulegen.</p>
                <div className="mt-4">
                  <CustomerCreateDialog />
                </div>
              </div>
            ) : allCustomers.length === 0 && (query || customerTypeFilter) ? (
              <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
                <Users className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                <p className="text-base md:text-lg font-semibold">Keine Kunden gefunden</p>
                <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
              </div>
            ) : (
              allCustomers.map((customer) => (
                <Card key={customer.id} className="shadow-neumorphic glassmorphism-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base md:text-lg font-semibold">{customer.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <CustomerEditDialog customer={customer} />
                      <DeleteCustomerButton customerId={customer.id} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Tabs defaultValue="details" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="documents">Dokumente</TabsTrigger>
                      </TabsList>
                      <TabsContent value="details" className="pt-4 space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center text-sm text-muted-foreground">
                          {customer.customer_type === 'partner' ? (
                            <Handshake className="mr-2 h-4 w-4 flex-shrink-0" />
                          ) : (
                            <Users className="mr-2 h-4 w-4 flex-shrink-0" />
                          )}
                          <span>Typ: <Badge variant="secondary">{customer.customer_type === 'partner' ? 'Partner' : 'Kunde'}</Badge></span>
                        </div>
                        {customer.address && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>{customer.address}</span>
                          </div>
                        )}
                        {customer.contact_email && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Mail className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>{customer.contact_email}</span>
                          </div>
                        )}
                        {customer.contact_phone && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Phone className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span>{customer.contact_phone}</span>
                          </div>
                        )}
                      </TabsContent>
                      <TabsContent value="documents" className="pt-4 space-y-4">
                        <h3 className="text-md font-semibold flex items-center">
                          <FileStack className="mr-2 h-5 w-5" /> Dokumente
                        </h3>
                        <DocumentUploader associatedCustomerId={customer.id} />
                        <DocumentList associatedCustomerId={customer.id} />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
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
          />
        </TabsContent>
      </Tabs>
      {!query && totalPages > 1 && (
        <PaginationControls currentPage={currentPage} totalPages={totalPages} />
      )}
    </div>
  );
}