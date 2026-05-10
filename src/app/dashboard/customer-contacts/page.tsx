"use client";

import { createClient } from "@/lib/supabase/client";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CustomerContactCreateGeneralDialog } from "@/components/customer-contact-create-general-dialog";
import { CustomerContactEditDialog } from "@/components/customer-contact-edit-dialog";
import { DeleteCustomerContactButton } from "@/components/delete-customer-contact-button";
import { PaginationControls } from "@/components/pagination-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { DataTableToolbar, FilterOption, SortOption } from "@/components/data-table-toolbar";
import { GenericGridSkeleton } from "@/components/generic-grid-skeleton";
import { SimpleListSkeleton } from "@/components/simple-list-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Mail, Phone, User, MoreHorizontal, Users, Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface DisplayCustomerContact {
  id: string;
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  created_at: string | null;
  customer_name?: string;
}

interface CustomerContactGridItemProps {
  contact: DisplayCustomerContact;
  onSuccess: () => void;
}

function CustomerContactCard({ contact, onSuccess }: CustomerContactGridItemProps) {
  return (
    <Card className="dashboard-card hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                {contact.first_name} {contact.last_name}
              </CardTitle>
              {contact.role && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  {contact.role}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <CustomerContactEditDialog contact={contact} onSuccess={onSuccess} />
            <DeleteCustomerContactButton contactId={contact.id} onDeleteSuccess={onSuccess} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {contact.customer_name && (
          <div className="text-sm">
            <span className="text-muted-foreground">Kunde: </span>
            <span className="font-medium">{contact.customer_name}</span>
          </div>
        )}
        {contact.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <a href={`mailto:${contact.email}`} className="hover:text-primary">
              {contact.email}
            </a>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <a href={`tel:${contact.phone}`} className="hover:text-primary">
              {contact.phone}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CustomerContactsPage() {
  const supabase = createClient();
  const router = useRouter();
  const currentSearchParams = useSearchParams();
  const isMobile = useIsMobile();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [allContacts, setAllContacts] = useState<DisplayCustomerContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(0);

  const query = currentSearchParams.get('query') || '';
  const currentPage = Number(currentSearchParams.get('page')) || 1;
  const pageSize = 12;
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

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    setUserRole(profile?.role || null);

    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build query
    let contactsQuery = supabase
      .from('customer_contacts')
      .select(`*, customers(name)`, { count: 'exact' })
      .order(sortColumn, { ascending: sortDirection === 'asc' })
      .range(from, to);

    if (query) {
      contactsQuery = contactsQuery.or(
        `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`
      );
    }

    // Non-admin users can only see contacts from their customers
    if (profile?.role !== 'admin' && profile?.role !== 'manager') {
      // Get customers owned by this user
      const { data: userCustomers } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id);
      
      if (userCustomers && userCustomers.length > 0) {
        const customerIds = userCustomers.map(c => c.id);
        contactsQuery = contactsQuery.in('customer_id', customerIds);
      } else {
        // No customers found, return empty
        setAllContacts([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }
    }

    const { data, error, count } = await contactsQuery;

    if (error) {
      console.error("Fehler beim Laden der Kundenkontakte:", error?.message || error);
    }

    const contactsWithCustomerName = (data || []).map(c => ({
      ...c,
      customer_name: c.customers?.name || 'Unbekannt',
    }));

    setAllContacts(contactsWithCustomerName);
    setTotalCount(count);
    setLoading(false);
  }, [
    supabase,
    query,
    currentPage,
    pageSize,
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
        <PageHeader title="Kundenkontakte" loading={true} />
        <Card className="dashboard-card">
          <CardContent className="p-8">
            <GenericGridSkeleton count={6} showBadges={false} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  const sortOptions: SortOption[] = [
    { value: 'last_name', label: 'Nachname' },
    { value: 'first_name', label: 'Vorname' },
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
      <PageHeader title="Kundenkontakte" loading={loading}>
        <CustomerContactCreateGeneralDialog onContactCreated={fetchData} />
      </PageHeader>

      <Card className="dashboard-card">
        <CardHeader>
          <DataTableToolbar
            searchPlaceholder="Kundenkontakte suchen..."
            filterOptions={[]}
            sortOptions={sortOptions}
          />
          {totalCount !== null && !loading && (
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-2">
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
              ) : allContacts.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-lg font-medium text-muted-foreground">
                    Keine Kundenkontakte gefunden
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {query ? "Versuchen Sie andere Suchkriterien" : "Erstellen Sie Ihren ersten Kundenkontakt"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allContacts.map((contact) => (
                    <CustomerContactCard
                      key={contact.id}
                      contact={contact}
                      onSuccess={fetchData}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="table" className="mt-0">
              {loading ? (
                <SimpleListSkeleton count={5} />
              ) : allContacts.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-lg font-medium text-muted-foreground">
                    Keine Kundenkontakte gefunden
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {query ? "Versuchen Sie andere Suchkriterien" : "Erstellen Sie Ihren ersten Kundenkontakt"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Rolle</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <div className="font-medium">
                            {contact.first_name} {contact.last_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{contact.customer_name}</span>
                        </TableCell>
                        <TableCell>
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`} className="text-sm hover:text-primary">
                              {contact.email}
                            </a>
                          ) : (
                            <span className="text-sm text-muted-foreground">–</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.phone ? (
                            <a href={`tel:${contact.phone}`} className="text-sm hover:text-primary">
                              {contact.phone}
                            </a>
                          ) : (
                            <span className="text-sm text-muted-foreground">–</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.role && (
                            <Badge variant="secondary">{contact.role}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <CustomerContactEditDialog contact={contact} onSuccess={fetchData} />
                            <DeleteCustomerContactButton contactId={contact.id} onDeleteSuccess={fetchData} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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