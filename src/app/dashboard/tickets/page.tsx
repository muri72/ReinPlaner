"use client";

import { createClient } from "@/lib/supabase/client";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { TicketCreateDialog } from "@/components/ticket-create-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense, useEffect, useState, useCallback } from "react";
import { TicketsTableView } from "@/components/tickets-table-view";
import { useIsMobile } from "@/hooks/use-mobile";
import { LoadingOverlay } from "@/components/loading-overlay";
import { getTickets } from "./actions";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { DataTableToolbar, FilterOption, SortOption } from "@/components/data-table-toolbar";
import { TicketsGridView } from "@/components/tickets-grid-view"; // Assuming this will be created or exists

interface DisplayTicket {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  customer_id: string | null;
  object_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to_user_id: string | null;
  image_urls: string[] | null;
  comments: any[];
  customer_name: string | null;
  object_name: string | null;
  creator_first_name: string | null;
  creator_last_name: string | null;
  assigned_to_first_name: string | null;
  assigned_to_last_name: string | null;
}

export default function TicketsPage() {
  const supabase = createClient();
  const router = useRouter();
  const currentSearchParams = useSearchParams();
  const isMobile = useIsMobile();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allTickets, setAllTickets] = useState<DisplayTicket[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; first_name: string | null; last_name: string | null; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(0);

  const query = currentSearchParams.get('query') || '';
  const currentPage = Number(currentSearchParams.get('page')) || 1;
  const pageSize = 10;
  const statusFilter = currentSearchParams.get('status') || '';
  const priorityFilter = currentSearchParams.get('priority') || '';
  const assignedToUserFilter = currentSearchParams.get('assignedToUser') || '';
  const customerIdFilter = currentSearchParams.get('customerId') || '';
  const viewMode = currentSearchParams.get('viewMode') || 'grid';
  const sortColumn = currentSearchParams.get('sortColumn') || 'created_at';
  const sortDirection = currentSearchParams.get('sortDirection') || 'desc';

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
      return;
    }
    setCurrentUser(user);

    const { data: customersData, error: customersError } = await supabase.from('customers').select('id, name').order('name', { ascending: true });
    if (customersError) console.error("Fehler beim Laden der Kunden für Filter:", customersError.message);
    setCustomers(customersData || []);

    const { data: usersData, error: usersError } = await supabase.from('profiles').select('id, first_name, last_name, role').in('role', ['admin', 'manager', 'employee']).order('last_name', { ascending: true });
    if (usersData) setUsers(usersData);
    if (usersError) console.error("Fehler beim Laden der Benutzer für Filter:", usersError.message);

    const result = await getTickets({
      query,
      status: statusFilter,
      priority: priorityFilter,
      assignedToUserId: assignedToUserFilter,
      customerId: customerIdFilter,
      page: currentPage,
      pageSize,
      sortColumn,
      sortDirection,
    });

    if (result.success && result.data) {
      setAllTickets(result.data as DisplayTicket[]);
      setTotalCount(result.totalCount || 0);
    } else {
      toast.error(result.message);
      setAllTickets([]);
      setTotalCount(0);
    }
    setLoading(false);
  }, [
    supabase,
    query,
    currentPage,
    pageSize,
    statusFilter,
    priorityFilter,
    assignedToUserFilter,
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
    { value: 'status', label: 'Status', options: [{ value: 'open', label: 'Offen' }, { value: 'in_progress', label: 'In Bearbeitung' }, { value: 'resolved', label: 'Gelöst' }, { value: 'closed', label: 'Geschlossen' }] },
    { value: 'priority', label: 'Priorität', options: [{ value: 'low', label: 'Niedrig' }, { value: 'medium', label: 'Mittel' }, { value: 'high', label: 'Hoch' }, { value: 'urgent', label: 'Dringend' }] },
    { value: 'assignedToUser', label: 'Zugewiesen an', options: users.map(u => ({ value: u.id, label: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.id })) },
    { value: 'customerId', label: 'Kunde', options: customers.map(c => ({ value: c.id, label: c.name })) },
  ];

  const sortOptions: SortOption[] = [
    { value: 'created_at', label: 'Erstellt am' },
    { value: 'title', label: 'Titel' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priorität' },
    { value: 'customers.name', label: 'Kunde' },
    { value: 'profiles!tickets_assigned_to_user_id_fkey.last_name', label: 'Zugewiesen an' },
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
      <PageHeader title="Ticket-Verwaltung">
        <TicketCreateDialog onTicketCreated={fetchData} />
      </PageHeader>

      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <DataTableToolbar
            searchPlaceholder="Tickets suchen..."
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
              <TicketsGridView
                tickets={allTickets}
                query={query}
                onTicketUpdated={fetchData}
              />
            </TabsContent>
            <TabsContent value="table" className="mt-0">
              <TicketsTableView
                tickets={allTickets}
                totalPages={totalPages}
                currentPage={currentPage}
                query={query}
                onTicketUpdated={fetchData}
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