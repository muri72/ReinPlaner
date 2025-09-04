"use client";

import { createClient } from "@/lib/supabase/client";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, PlusCircle } from "lucide-react";
import { TicketCreateDialog } from "@/components/ticket-create-dialog";
import { TicketEditDialog } from "@/components/ticket-edit-dialog";
import { DeleteTicketButton } from "@/components/delete-ticket-button";
import { SearchInput } from "@/components/search-input";
import { PaginationControls } from "@/components/pagination-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense, useEffect, useState, useCallback } from "react";
import { FilterSelect } from "@/components/filter-select";
import { TicketsTableView } from "@/components/tickets-table-view";
import { useIsMobile } from "@/hooks/use-mobile";
import { LoadingOverlay } from "@/components/loading-overlay";
import { getTickets } from "./actions";
import { Badge } from "@/components/ui/badge";
import { RecordDetailsDialog } from "@/components/record-details-dialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";

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

export default function TicketsPage({
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
  const [allTickets, setAllTickets] = useState<DisplayTicket[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; first_name: string | null; last_name: string | null; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(0);

  const query = (currentSearchParams.get('query') || '') as string;
  const currentPage = Number(currentSearchParams.get('page')) || 1;
  const pageSize = 10;
  const statusFilter = (currentSearchParams.get('status') || '') as string;
  const priorityFilter = (currentSearchParams.get('priority') || '') as string;
  const assignedToUserFilter = (currentSearchParams.get('assignedToUser') || '') as string;
  const customerIdFilter = (currentSearchParams.get('customerId') || '') as string;
  const viewMode = (currentSearchParams.get('viewMode') || 'grid') as string;
  const sortColumn = (currentSearchParams.get('sortColumn') || 'created_at') as string;
  const sortDirection = (currentSearchParams.get('sortDirection') || 'desc') as string;

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

    if (profileError) {
      console.error("Fehler beim Laden des Benutzerprofils:", profileError?.message || profileError);
    }
    const role = profile?.role as 'admin' | 'manager' | 'employee' | 'customer' || 'employee';
    setCurrentUserRole(role);

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
      console.error("Fehler beim Laden der Tickets:", result.message);
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
    return null;
  }

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in_progress': return 'warning';
      case 'resolved': return 'default';
      case 'closed': return 'success';
      default: return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'warning';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const statusOptions = [
    { value: 'open', label: 'Offen' },
    { value: 'in_progress', label: 'In Bearbeitung' },
    { value: 'resolved', label: 'Gelöst' },
    { value: 'closed', label: 'Geschlossen' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Niedrig' },
    { value: 'medium', label: 'Mittel' },
    { value: 'high', label: 'Hoch' },
    { value: 'urgent', label: 'Dringend' },
  ];

  const assignedToUserOptions = users.map(u => ({
    value: u.id,
    label: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.id,
  }));

  const activeTab = isMobile ? 'grid' : viewMode;

  const handleViewModeChange = (value: string) => {
    const params = new URLSearchParams(currentSearchParams);
    params.set('viewMode', value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      {loading && <LoadingOverlay isLoading={loading} />}
      <h1 className="text-2xl md:text-3xl font-bold">Ticket-Verwaltung</h1>

      <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <SearchInput placeholder="Tickets suchen..." />
        <TicketCreateDialog onTicketCreated={fetchData} />
      </div>

      {/* Filter Section */}
      <Suspense fallback={<div>Lade Filter...</div>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          <FilterSelect
            paramName="status"
            label="Status"
            options={statusOptions}
            currentValue={statusFilter}
          />
          <FilterSelect
            paramName="priority"
            label="Priorität"
            options={priorityOptions}
            currentValue={priorityFilter}
          />
          <FilterSelect
            paramName="assignedToUser"
            label="Zugewiesen an"
            options={assignedToUserOptions}
            currentValue={assignedToUserFilter}
          />
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
            {allTickets.length === 0 && !query && !statusFilter && !priorityFilter && !assignedToUserFilter && !customerIdFilter ? (
              <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
                <MessageSquare className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                <p className="text-base md:text-lg font-semibold">Noch keine Tickets vorhanden</p>
                <p className="text-sm">Erstellen Sie ein neues Ticket, um Kundenanliegen zu verwalten.</p>
                <div className="mt-4">
                  <TicketCreateDialog onTicketCreated={fetchData} />
                </div>
              </div>
            ) : allTickets.length === 0 && (query || statusFilter || priorityFilter || assignedToUserFilter || customerIdFilter) ? (
              <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
                <MessageSquare className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                <p className="text-base md:text-lg font-semibold">Keine Tickets gefunden</p>
                <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
              </div>
            ) : (
              allTickets.map((ticket) => (
                <Card key={ticket.id} className="shadow-neumorphic glassmorphism-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base md:text-lg font-semibold">{ticket.title}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <RecordDetailsDialog record={ticket} title={`Details zu Ticket: ${ticket.title}`} />
                      <TicketEditDialog ticket={ticket} onTicketUpdated={fetchData} />
                      <DeleteTicketButton ticketId={ticket.id} onDeleteSuccess={fetchData} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>Status: <Badge variant={getStatusBadgeVariant(ticket.status)}>{ticket.status}</Badge></span>
                    </div>
                    <div className="flex items-center">
                      <AlertCircle className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>Priorität: <Badge variant={getPriorityBadgeVariant(ticket.priority)}>{ticket.priority}</Badge></span>
                    </div>
                    {ticket.customer_name && (
                      <div className="flex items-center">
                        <Building className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Kunde: {ticket.customer_name}</span>
                      </div>
                    )}
                    {ticket.object_name && (
                      <div className="flex items-center">
                        <Briefcase className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Objekt: {ticket.object_name}</span>
                      </div>
                    )}
                    {ticket.assigned_to_first_name && ticket.assigned_to_last_name && (
                      <div className="flex items-center">
                        <UserRound className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span>Zugewiesen an: {ticket.assigned_to_first_name} {ticket.assigned_to_last_name}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>Erstellt am: {format(new Date(ticket.created_at), 'dd.MM.yyyy', { locale: de })}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="table" className="mt-0">
          <TicketsTableView
            tickets={allTickets}
            totalPages={totalPages}
            currentPage={currentPage}
            query={query}
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            assignedToUserFilter={assignedToUserFilter}
            customerIdFilter={customerIdFilter}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onTicketUpdated={fetchData}
          />
        </TabsContent>
      </Tabs>
      {!query && totalPages > 1 && (
        <PaginationControls currentPage={currentPage} totalPages={totalPages} />
      )}
    </div>
  );
}