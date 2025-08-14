"use client"; // This page needs to be a client component to use hooks like useIsMobile

import { createClient } from "@/lib/supabase/client";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Briefcase, UserRound, PlusCircle, ContactRound } from "lucide-react";
import { CustomerContactEditDialog } from "@/components/customer-contact-edit-dialog";
import { DeleteCustomerContactButton } from "@/components/delete-customer-contact-button";
import { SearchInput } from "@/components/search-input";
import { CustomerContactCreateGeneralDialog } from "@/components/customer-contact-create-general-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense, useEffect, useState, useCallback } from "react";
import { FilterSelect } from "@/components/filter-select";
import { CustomerContactsTableView } from "@/components/customer-contacts-table-view"; // Import the new table view component
import { useIsMobile } from "@/hooks/use-mobile"; // Import the hook
import { RecordDetailsDialog } from "@/components/record-details-dialog"; // Import RecordDetailsDialog
import { LoadingOverlay } from "@/components/loading-overlay"; // Import the new LoadingOverlay

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

export default function CustomerContactsPage({
  searchParams,
}: {
  searchParams?: any;
}) {
  const supabase = createClient();
  const router = useRouter();
  const currentSearchParams = useSearchParams();
  const isMobile = useIsMobile();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allContacts, setAllContacts] = useState<DisplayCustomerContact[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(0);

  const query = (currentSearchParams.get('query') || '') as string;
  const currentPage = Number(currentSearchParams.get('page')) || 1;
  const pageSize = 10; // Set page size to 10
  const customerIdFilter = (currentSearchParams.get('customerId') || '') as string;
  const viewMode = (currentSearchParams.get('viewMode') || 'grid') as string;

  // Sorting parameters
  const sortColumn = (currentSearchParams.get('sortColumn') || 'last_name') as string;
  const sortDirection = (currentSearchParams.get('sortDirection') || 'asc') as string;

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

    let contactsData: DisplayCustomerContact[] = [];
    let contactsError: any = null;
    let contactsCount: number | null = 0;

    if (query) {
      // For search, fetch all and filter in memory
      const { data, error: fetchError } = await supabase
        .from('customer_contacts')
        .select(`
          *,
          customers ( name )
        `);
      
      if (fetchError) {
        contactsError = fetchError;
      } else {
        const filteredData = data.filter(c => 
          c.first_name.toLowerCase().includes(query.toLowerCase()) ||
          c.last_name.toLowerCase().includes(query.toLowerCase()) ||
          c.email?.toLowerCase().includes(query.toLowerCase()) ||
          c.phone?.toLowerCase().includes(query.toLowerCase()) ||
          c.role?.toLowerCase().includes(query.toLowerCase()) ||
          c.customers?.name?.toLowerCase().includes(query.toLowerCase())
        );
        contactsData = filteredData.map(c => ({
          id: c.id,
          customer_id: c.customer_id,
          first_name: c.first_name,
          last_name: c.last_name,
          email: c.email,
          phone: c.phone,
          role: c.role,
          created_at: c.created_at,
          customer_name: c.customers?.name || null,
        }));
        contactsCount = contactsData.length;
      }
    } else {
      let selectQuery = supabase
        .from('customer_contacts')
        .select(`
          *,
          customers ( name )
        `, { count: 'exact' })
        .order(sortColumn, { ascending: sortDirection === 'asc' });

      if (customerIdFilter) {
        selectQuery = selectQuery.eq('customer_id', customerIdFilter);
      }

      const { data, error: selectError, count: selectCount } = await selectQuery
        .range(from, to);

      contactsData = data?.map(contact => ({
        id: contact.id,
        customer_id: contact.customer_id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        role: contact.role,
        created_at: contact.created_at,
        customer_name: contact.customers?.name || null,
      })) || [];
      contactsError = selectError;
      contactsCount = selectCount;
    }

    if (contactsError) {
      console.error("Fehler beim Laden der Kundenkontakte:", contactsError?.message || contactsError);
    }
    setAllContacts(contactsData);
    setTotalCount(contactsCount);
    setLoading(false);
  }, [
    supabase,
    query,
    currentPage,
    pageSize,
    customerIdFilter,
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

  const activeTab = isMobile ? 'grid' : viewMode;

  const handleViewModeChange = (value: string) => {
    const params = new URLSearchParams(currentSearchParams);
    params.set('viewMode', value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      {loading && <LoadingOverlay isLoading={loading} />}
      <h1 className="text-2xl md:text-3xl font-bold">Ihre Kundenkontakte</h1>

      <div className="mb-4 flex justify-between items-center">
        <SearchInput placeholder="Kundenkontakte suchen..." />
        <CustomerContactCreateGeneralDialog />
      </div>

      {/* Filter Section */}
      <Suspense fallback={<div>Lade Filter...</div>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          <FilterSelect
            paramName="customerId"
            label="Kunde"
            options={customers.map(c => ({ value: c.id, label: c.name }))}
            currentValue={customerIdFilter}
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
            {allContacts.length === 0 && !query && !customerIdFilter ? (
              <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
                <ContactRound className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                <p className="text-base md:text-lg font-semibold">Noch keine Kundenkontakte vorhanden</p>
                <p className="text-sm">Fügen Sie einen neuen Kontakt hinzu, um Ihre Kundenbeziehungen zu verwalten.</p>
                <div className="mt-4">
                  <CustomerContactCreateGeneralDialog />
                </div>
              </div>
            ) : allContacts.length === 0 && (query || customerIdFilter) ? (
              <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
                <ContactRound className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                <p className="text-base md:text-lg font-semibold">Keine Kundenkontakte gefunden</p>
                <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
              </div>
            ) : (
              allContacts.map((contact) => (
                <Card key={contact.id} className="shadow-neumorphic glassmorphism-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base md:text-lg font-semibold">{contact.first_name} {contact.last_name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <RecordDetailsDialog record={contact} title={`Details zu Kundenkontakt: ${contact.first_name} ${contact.last_name}`} />
                      <CustomerContactEditDialog contact={contact} />
                      <DeleteCustomerContactButton contactId={contact.id} onDeleteSuccess={fetchData} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {contact.customer_name && (
                      <p className="text-sm text-muted-foreground">
                        Kunde: {contact.customer_name}
                      </p>
                    )}
                    {contact.email && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>{contact.email}</span>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    {contact.role && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Briefcase className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Rolle: {contact.role}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="table" className="mt-0">
          <CustomerContactsTableView
            contacts={allContacts}
            totalPages={totalPages}
            currentPage={currentPage}
            query={query}
            customerIdFilter={customerIdFilter}
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