import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrderForm } from "@/components/order-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, CalendarDays, Clock, FileText, Wrench, UserRound, AlertTriangle, Star as StarIcon, PlusCircle, Briefcase, FileStack } from "lucide-react";
import { deleteOrder, createOrder } from "./actions";
import { OrderEditDialog } from "@/components/order-edit-dialog";
import { Badge } from "@/components/ui/badge";
import { DeleteOrderButton } from "@/components/delete-order-button";
import { SearchInput } from "@/components/search-input";
import { OrderPlanningDialog } from "@/components/order-planning-dialog";
import { OrderCreateDialog } from "@/components/order-create-dialog"; // Import the new dialog
import { PaginationControls } from "@/components/pagination-controls"; // Importiere die Paginierungskomponente
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs
import { DocumentUploader } from "@/components/document-uploader"; // Import DocumentUploader
import { DocumentList } from "@/components/document-list"; // Import DocumentList
import { Suspense } from "react"; // Import Suspense for client components
import { FilterSelect } from "@/components/filter-select"; // Import the new FilterSelect component

interface DisplayOrder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  created_at: string | null;
  customer_id: string | null;
  object_id: string | null;
  employee_id: string | null;
  customer_contact_id: string | null;
  customer_name: string | null;
  object_name: string | null;
  employee_first_name: string | null;
  employee_last_name: string | null;
  customer_contact_first_name: string | null;
  customer_contact_last_name: string | null;
  order_type: string;
  recurring_start_date: string | null;
  recurring_end_date: string | null;
  priority: string;
  estimated_hours: number | null;
  notes: string | null;
  request_status: string;
  service_type: string | null;
  order_feedback: {
    id: string;
    rating: number;
    comment: string | null;
    image_urls: string[] | null;
    created_at: string;
  }[];
}

// Definierte Liste der Dienstleistungen (muss mit order-form.tsx übereinstimmen)
const availableServices = [
  "Unterhaltsreinigung",
  "Glasreinigung",
  "Grundreinigung",
  "Graffitientfernung",
  "Sonderreinigung",
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: any; // Changed to any to resolve Next.js internal type error
}) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect("/login");
  }

  const query = typeof searchParams?.query === 'string' ? searchParams.query : '';
  const currentPage = Number(searchParams?.page) || 1;
  const pageSize = Number(searchParams?.pageSize) || 9; // Standardmäßig 9 Aufträge pro Seite
  
  // Ensure filter values are always strings
  const statusFilter = Array.isArray(searchParams?.status) ? searchParams.status[0] : searchParams?.status || '';
  const orderTypeFilter = Array.isArray(searchParams?.orderType) ? searchParams.orderType[0] : searchParams?.orderType || '';
  const serviceTypeFilter = Array.isArray(searchParams?.serviceType) ? searchParams.serviceType[0] : searchParams?.serviceType || '';
  const customerIdFilter = Array.isArray(searchParams?.customerId) ? searchParams.customerId[0] : searchParams?.customerId || '';
  const employeeIdFilter = Array.isArray(searchParams?.employeeId) ? searchParams.employeeId[0] : searchParams?.employeeId || '';

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  let allOrders: DisplayOrder[] = [];
  let error: any;
  let count: number | null = 0;

  // Fetch customers and employees for filter dropdowns
  const { data: customersData, error: customersError } = await supabase.from('customers').select('id, name').order('name', { ascending: true });
  const { data: employeesData, error: employeesError } = await supabase.from('employees').select('id, first_name, last_name').order('last_name', { ascending: true });

  if (customersError) console.error("Fehler beim Laden der Kunden für Filter:", customersError.message);
  if (employeesError) console.error("Fehler beim Laden der Mitarbeiter für Filter:", employeesError.message);

  const customers = customersData || [];
  const employees = employeesData || [];

  if (query) {
    // Verwende die RPC-Funktion für die Suche.
    // Die RPC-Funktion hat bereits Parameter für user_id und customer_id,
    // aber da RLS aktiv ist, wird die clientseitige Abfrage automatisch gefiltert.
    // Daher übergeben wir hier keine expliziten user/customer IDs an die RPC.
    const { data, error: rpcError } = await supabase.rpc('search_orders', { search_query: query });
    allOrders = (data as DisplayOrder[] | null)?.map(o => ({ ...o, order_feedback: [] })) || [];
    error = rpcError;
    count = allOrders.length; // Zähle die Ergebnisse der RPC-Funktion
  } else {
    // Direkte Abfrage mit Paginierung und Filtern, wenn keine Suche aktiv ist
    let selectQuery = supabase
      .from('orders')
      .select(`
        *,
        customers ( name ),
        objects ( name ),
        employees ( first_name, last_name ),
        customer_contacts ( first_name, last_name ),
        order_feedback ( id, rating, comment, image_urls, created_at )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (statusFilter) {
      selectQuery = selectQuery.eq('status', statusFilter);
    }
    if (orderTypeFilter) {
      selectQuery = selectQuery.eq('order_type', orderTypeFilter);
    }
    if (serviceTypeFilter) {
      selectQuery = selectQuery.eq('service_type', serviceTypeFilter);
    }
    if (customerIdFilter) {
      selectQuery = selectQuery.eq('customer_id', customerIdFilter);
    }
    if (employeeIdFilter) {
      selectQuery = selectQuery.eq('employee_id', employeeIdFilter);
    }

    const { data, error: selectError, count: selectCount } = await selectQuery
      .range(from, to);

    allOrders = data?.map(order => ({
      id: order.id,
      user_id: order.user_id,
      title: order.title,
      description: order.description,
      status: order.status,
      due_date: order.due_date,
      created_at: order.created_at,
      customer_id: order.customer_id,
      object_id: order.object_id,
      employee_id: order.employee_id,
      customer_contact_id: order.customer_contact_id,
      customer_name: order.customers?.name || null,
      object_name: order.objects?.name || null,
      employee_first_name: order.employees?.first_name || null,
      employee_last_name: order.employees?.last_name || null,
      customer_contact_first_name: order.customer_contacts?.first_name || null,
      customer_contact_last_name: order.customer_contacts?.last_name || null,
      order_type: order.order_type,
      recurring_start_date: order.recurring_start_date,
      recurring_end_date: order.recurring_end_date,
      priority: order.priority,
      estimated_hours: order.estimated_hours,
      notes: order.notes,
      request_status: order.request_status,
      service_type: order.service_type,
      order_feedback: order.order_feedback,
    })) || [];
    error = selectError;
    count = selectCount;
  }

  if (error) {
    console.error("Fehler beim Laden der Aufträge:", error?.message || error);
    return <div className="p-4 md:p-8">Fehler beim Laden der Aufträge.</div>;
  }

  const totalPages = count ? Math.ceil(count / pageSize) : 0;

  const pendingRequests = allOrders.filter(order => order.request_status === 'pending');
  const otherOrders = allOrders.filter(order => order.request_status !== 'pending');

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending':
      default: return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low':
      default: return 'secondary';
    }
  };

  const getRequestStatusBadgeVariant = (requestStatus: string) => {
    switch (requestStatus) {
      case 'approved': return 'default';
      case 'pending': return 'warning';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const orderStatusOptions = [
    { value: 'pending', label: 'Ausstehend' },
    { value: 'in_progress', label: 'In Bearbeitung' },
    { value: 'completed', label: 'Abgeschlossen' },
  ];

  const orderTypeOptions = [
    { value: 'one_time', label: 'Einmalig' },
    { value: 'recurring', label: 'Wiederkehrend' },
    { value: 'substitution', label: 'Vertretung' },
    { value: 'permanent', label: 'Permanent' },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Auftragsverwaltung</h1>
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <SearchInput placeholder="Aufträge suchen..." />
        <OrderCreateDialog />
      </div>

      {/* Filter Section */}
      <Suspense fallback={<div>Lade Filter...</div>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          <FilterSelect
            paramName="status"
            label="Status"
            options={orderStatusOptions}
            currentValue={statusFilter}
          />
          <FilterSelect
            paramName="orderType"
            label="Auftragstyp"
            options={orderTypeOptions}
            currentValue={orderTypeFilter}
          />
          <FilterSelect
            paramName="serviceType"
            label="Dienstleistung"
            options={availableServices.map(s => ({ value: s, label: s }))}
            currentValue={serviceTypeFilter}
          />
          <FilterSelect
            paramName="customerId"
            label="Kunde"
            options={customers.map(c => ({ value: c.id, label: c.name }))}
            currentValue={customerIdFilter}
          />
          <FilterSelect
            paramName="employeeId"
            label="Mitarbeiter"
            options={employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))}
            currentValue={employeeIdFilter}
          />
        </div>
      </Suspense>

      {/* Section for Pending Requests */}
      <div className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5 md:h-6 md:w-6 text-warning" />
          Offene Anfragen ({pendingRequests.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {pendingRequests.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
              <Briefcase className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
              <p className="text-base md:text-lg font-semibold">Keine offenen Auftragsanfragen</p>
              <p className="text-sm">Alle Anfragen wurden bearbeitet oder es gibt keine neuen.</p>
            </div>
          ) : (
            pendingRequests.map((order) => (
              <Card key={order.id} className="border-warning border-2 shadow-neumorphic glassmorphism-card">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg font-medium">{order.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{order.description}</p>
                  {order.customer_name && <p className="text-xs text-muted-foreground mt-1">Kunde: {order.customer_name}</p>}
                  {order.object_name && <p className="text-xs text-muted-foreground">Objekt: {order.object_name}</p>}
                  <div className="pt-4">
                    <OrderPlanningDialog order={order} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Section for Other Orders */}
      <div className="space-y-4 pt-8">
        <h2 className="text-xl md:text-2xl font-bold">Bestehende Aufträge</h2>
        {query && (
          <p className="text-sm text-muted-foreground mb-4">
            Hinweis: Bei aktiver Suche wird die Paginierung deaktiviert und alle passenden Ergebnisse angezeigt.
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {otherOrders.length === 0 && !query && !statusFilter && !orderTypeFilter && !serviceTypeFilter && !customerIdFilter && !employeeIdFilter ? (
            <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
              <Briefcase className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
              <p className="text-base md:text-lg font-semibold">Noch keine Aufträge vorhanden</p>
              <p className="text-sm">Beginnen Sie, indem Sie einen neuen Auftrag hinzufügen.</p>
              <div className="mt-4">
                {/* The button to open the dialog is now part of OrderCreateDialog */}
              </div>
            </div>
          ) : otherOrders.length === 0 && (query || statusFilter || orderTypeFilter || serviceTypeFilter || customerIdFilter || employeeIdFilter) ? (
            <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
              <Briefcase className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
              <p className="text-base md:text-lg font-semibold">Keine Aufträge gefunden</p>
              <p className="text-sm">Ihre Filter ergaben keine Treffer.</p>
            </div>
          ) : (
            otherOrders.map((order) => {
              const feedback = order.order_feedback?.[0];
              return (
                <Card key={order.id} className="shadow-neumorphic glassmorphism-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base md:text-lg font-semibold">{order.title}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <OrderEditDialog order={order} />
                      <DeleteOrderButton orderId={order.id} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="details" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="documents">Dokumente</TabsTrigger>
                      </TabsList>
                      <TabsContent value="details" className="pt-4 space-y-2 text-sm text-muted-foreground">
                        <p className="text-sm text-muted-foreground">{order.description}</p>
                        {order.customer_name && <p className="text-xs text-muted-foreground mt-1">Kunde: {order.customer_name}</p>}
                        {order.object_name && <p className="text-xs text-muted-foreground">Objekt: {order.object_name}</p>}
                        {order.customer_contact_first_name && order.customer_contact_last_name && (
                          <div className="flex items-center text-xs text-muted-foreground"><UserRound className="mr-1 h-3 w-3" /><span>Auftraggeber: {order.customer_contact_first_name} {order.customer_contact_last_name}</span></div>
                        )}
                        {order.employee_first_name && order.employee_last_name && <p className="text-xs text-muted-foreground">Mitarbeiter: {order.employee_first_name} {order.employee_last_name}</p>}
                        {order.service_type && <div className="flex items-center text-xs text-muted-foreground mt-1"><Wrench className="mr-1 h-3 w-3" /><span>Dienstleistung: {order.service_type}</span></div>}
                        <div className="flex items-center mt-2 space-x-2">
                          <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                          <Badge variant="outline">{order.order_type}</Badge>
                          <Badge variant={getPriorityBadgeVariant(order.priority)}>Priorität: {order.priority}</Badge>
                          <Badge variant={getRequestStatusBadgeVariant(order.request_status)}>Anfrage: {order.request_status}</Badge>
                        </div>
                        {order.estimated_hours && <div className="flex items-center text-xs text-muted-foreground mt-1"><Clock className="mr-1 h-3 w-3" /><span>Geschätzte Stunden: {order.estimated_hours}</span></div>}
                        {order.notes && <div className="flex items-center text-xs text-muted-foreground mt-1"><FileText className="mr-1 h-3 w-3" /><span>Notizen: {order.notes}</span></div>}
                        {order.order_type === "one_time" && order.due_date && <p className="text-xs text-muted-foreground ml-auto mt-1">Fällig: {new Date(order.due_date).toLocaleDateString()}</p>}
                        {(order.order_type === "recurring" || order.order_type === "substitution" || order.order_type === "permanent") && order.recurring_start_date && <div className="flex items-center text-xs text-muted-foreground mt-1"><CalendarDays className="mr-1 h-3 w-3" /><span>Start: {new Date(order.recurring_start_date).toLocaleDateString()}</span></div>}
                        {(order.order_type === "recurring" || order.order_type === "substitution") && order.recurring_end_date && <div className="flex items-center text-xs text-muted-foreground"><CalendarDays className="mr-1 h-3 w-3" /><span>Ende: {new Date(order.recurring_end_date).toLocaleDateString()}</span></div>}
                        
                        {feedback && (
                          <div className="flex items-center text-xs text-warning mt-2">
                            <StarIcon className="mr-1 h-3 w-3 fill-current" />
                            <span>Feedback vorhanden</span>
                          </div>
                        )}
                      </TabsContent>
                      <TabsContent value="documents" className="pt-4 space-y-4">
                        <h3 className="text-md font-semibold flex items-center">
                          <FileStack className="mr-2 h-5 w-5" /> Dokumente
                        </h3>
                        <DocumentUploader associatedOrderId={order.id} />
                        <DocumentList associatedOrderId={order.id} />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
        {!query && totalPages > 1 && (
          <PaginationControls currentPage={currentPage} totalPages={totalPages} />
        )}
      </div>
    </div>
  );
}