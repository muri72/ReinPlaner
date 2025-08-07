import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrderForm } from "@/components/order-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, CalendarDays, Clock, FileText } from "lucide-react"; // Neue Icons
import { deleteOrder, createOrder } from "./actions";
import { OrderEditDialog } from "@/components/order-edit-dialog";
import { Badge } from "@/components/ui/badge";
import { DeleteOrderButton } from "@/components/delete-order-button";
import { SearchInput } from "@/components/search-input"; // Importiere die SearchInput Komponente

// Definieren Sie die Schnittstelle für die Auftrags-Daten, wie sie auf dieser Seite verwendet werden
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
  customer_name: string | null;
  object_name: string | null;
  employee_first_name: string | null;
  employee_last_name: string | null;
  // Neue Felder
  order_type: string;
  recurring_start_date: string | null;
  recurring_end_date: string | null;
  priority: string;
  estimated_hours: number | null;
  notes: string | null;
  request_status: string;
}

export default async function OrdersPage({
  searchParams,
}: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const query = typeof searchParams?.query === 'string' ? searchParams.query : '';

  let orders: DisplayOrder[] | null;
  let error: any;

  if (query) {
    // Verwende die neue RPC-Funktion für die Suche
    const { data, error: rpcError } = await supabase.rpc('search_orders', {
      search_query: query,
      user_id_param: user.id,
    });
    orders = data as DisplayOrder[] | null;
    error = rpcError;
  } else {
    // Normale Abfrage, wenn kein Suchbegriff vorhanden ist
    const { data, error: selectError } = await supabase
      .from('orders')
      .select(`
        *,
        customers ( name ),
        objects ( name ),
        employees ( first_name, last_name )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Daten mappen, um sie an die DisplayOrder-Schnittstelle anzupassen
    orders = data?.map(order => ({
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
      customer_name: order.customers?.name || null,
      object_name: order.objects?.name || null,
      employee_first_name: order.employees?.first_name || null,
      employee_last_name: order.employees?.last_name || null,
      // Neue Felder mappen
      order_type: order.order_type,
      recurring_start_date: order.recurring_start_date,
      recurring_end_date: order.recurring_end_date,
      priority: order.priority,
      estimated_hours: order.estimated_hours,
      notes: order.notes,
      request_status: order.request_status,
    })) || null;
    error = selectError;
  }

  if (error) {
    console.error("Fehler beim Laden der Aufträge:", error);
    return <div className="p-8">Fehler beim Laden der Aufträge.</div>;
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'pending':
      default:
        return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
      default:
        return 'secondary';
    }
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Ihre Aufträge</h1>

      <div className="mb-4">
        <SearchInput placeholder="Aufträge suchen..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders && orders.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground">
            {query ? "Keine Aufträge gefunden, die Ihrer Suche entsprechen." : "Noch keine Aufträge vorhanden. Fügen Sie einen hinzu!"}
          </p>
        ) : (
          orders?.map((order) => (
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
                {order.customer_name && (
                  <p className="text-xs text-muted-foreground mt-1">Kunde: {order.customer_name}</p>
                )}
                {order.object_name && (
                  <p className="text-xs text-muted-foreground">Objekt: {order.object_name}</p>
                )}
                {order.employee_first_name && order.employee_last_name && (
                  <p className="text-xs text-muted-foreground">Mitarbeiter: {order.employee_first_name} {order.employee_last_name}</p>
                )}
                <div className="flex items-center mt-2 space-x-2">
                  <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                  <Badge variant="outline">{order.order_type}</Badge>
                  <Badge variant={getPriorityBadgeVariant(order.priority)}>Priorität: {order.priority}</Badge>
                </div>
                {order.estimated_hours && (
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <Clock className="mr-1 h-3 w-3" />
                    <span>Geschätzte Stunden: {order.estimated_hours}</span>
                  </div>
                )}
                {order.notes && (
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <FileText className="mr-1 h-3 w-3" />
                    <span>Notizen: {order.notes}</span>
                  </div>
                )}
                {order.recurring_start_date && (
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <CalendarDays className="mr-1 h-3 w-3" />
                    <span>Start: {new Date(order.recurring_start_date).toLocaleDateString()}</span>
                  </div>
                )}
                {order.recurring_end_date && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <CalendarDays className="mr-1 h-3 w-3" />
                    <span>Ende: {new Date(order.recurring_end_date).toLocaleDateString()}</span>
                  </div>
                )}
                {order.due_date && (
                  <p className="text-xs text-muted-foreground ml-auto mt-1">Fällig: {new Date(order.due_date).toLocaleDateString()}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <h2 className="text-2xl font-bold mt-8">Neuen Auftrag hinzufügen</h2>
      <OrderForm onSubmit={createOrder} submitButtonText="Auftrag hinzufügen" />
    </div>
  );
}