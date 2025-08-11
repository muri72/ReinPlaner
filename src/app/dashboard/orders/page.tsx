import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrderForm } from "@/components/order-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, CalendarDays, Clock, FileText, Wrench, UserRound, AlertTriangle, Star as StarIcon, PlusCircle, Briefcase } from "lucide-react";
import { deleteOrder, createOrder } from "./actions";
import { OrderEditDialog } from "@/components/order-edit-dialog";
import { Badge } from "@/components/ui/badge";
import { DeleteOrderButton } from "@/components/delete-order-button";
import { SearchInput } from "@/components/search-input";
import { OrderPlanningDialog } from "@/components/order-planning-dialog";

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

export default async function OrdersPage({
  searchParams,
}: any) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect("/login");
  }

  const query = typeof searchParams?.query === 'string' ? searchParams.query : '';

  let allOrders: DisplayOrder[] = [];
  let error: any;

  if (query) {
    const { data, error: rpcError } = await supabase.rpc('search_orders', { search_query: query });
    allOrders = (data as DisplayOrder[] | null)?.map(o => ({ ...o, order_feedback: [] })) || [];
    error = rpcError;
  } else {
    const { data, error: selectError } = await supabase
      .from('orders')
      .select(`
        *,
        customers ( name ),
        objects ( name ),
        employees ( first_name, last_name ),
        customer_contacts ( first_name, last_name ),
        order_feedback ( * )
      `)
      .order('created_at', { ascending: false });

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
  }

  if (error) {
    console.error("Fehler beim Laden der Aufträge:", error);
    return <div className="p-8">Fehler beim Laden der Aufträge.</div>;
  }

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

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Auftragsverwaltung</h1>
      <div className="mb-4">
        <SearchInput placeholder="Aufträge suchen..." />
      </div>

      {/* Section for Pending Requests */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center">
          <AlertTriangle className="mr-2 h-6 w-6 text-warning" />
          Offene Anfragen ({pendingRequests.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingRequests.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-8">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">Keine offenen Auftragsanfragen</p>
              <p className="text-sm">Alle Anfragen wurden bearbeitet oder es gibt keine neuen.</p>
            </div>
          ) : (
            pendingRequests.map((order) => (
              <Card key={order.id} className="border-warning border-2">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">{order.title}</CardTitle>
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
        <h2 className="text-2xl font-bold">Bestehende Aufträge</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {otherOrders.length === 0 && !query ? (
            <div className="col-span-full text-center text-muted-foreground py-8">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">Noch keine Aufträge vorhanden</p>
              <p className="text-sm">Beginnen Sie, indem Sie einen neuen Auftrag hinzufügen.</p>
              <div className="mt-4">
                <Button onClick={() => { /* Logic to open create form or scroll to it */ }} className="transition-colors duration-200">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Ersten Auftrag hinzufügen
                </Button>
              </div>
            </div>
          ) : otherOrders.length === 0 && query ? (
            <div className="col-span-full text-center text-muted-foreground py-8">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">Keine Aufträge gefunden</p>
              <p className="text-sm">Ihre Suche nach "{query}" ergab keine Treffer.</p>
            </div>
          ) : (
            otherOrders.map((order) => {
              const feedback = order.order_feedback?.[0];
              return (
                <Card key={order.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-medium">{order.title}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <OrderEditDialog order={order} />
                      <DeleteOrderButton orderId={order.id} />
                    </div>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>

      <h2 className="text-2xl font-bold mt-8">Neuen Auftrag hinzufügen</h2>
      <OrderForm onSubmit={createOrder} submitButtonText="Auftrag hinzufügen" />
    </div>
  );
}