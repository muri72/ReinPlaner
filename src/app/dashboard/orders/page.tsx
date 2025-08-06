import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrderForm } from "@/components/order-form"; // Korrigierter Import
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteOrder, createOrder } from "./actions"; // Korrigierte Funktionsnamen
import { OrderEditDialog } from "@/components/order-edit-dialog"; // Korrigierter Import
import { Badge } from "@/components/ui/badge";
import { DeleteOrderButton } from "@/components/delete-order-button"; // Korrigierter Import

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: orders, error } = await supabase // tasks zu orders
    .from('orders') // Tabelle ist jetzt 'orders'
    .select(`
      *,
      customers ( name ),
      objects ( name ),
      employees ( first_name, last_name )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

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

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Ihre Aufträge</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground">Noch keine Aufträge vorhanden. Fügen Sie einen hinzu!</p>
        ) : (
          orders.map((order) => ( // task zu order
            <Card key={order.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{order.title}</CardTitle>
                <div className="flex items-center space-x-2">
                  <OrderEditDialog order={order} /> {/* TaskEditDialog zu OrderEditDialog, task zu order */}
                  <DeleteOrderButton orderId={order.id} /> {/* DeleteTaskButton zu DeleteOrderButton, taskId zu orderId */}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.description}</p>
                {order.customers && (
                  <p className="text-xs text-muted-foreground mt-1">Kunde: {order.customers.name}</p>
                )}
                {order.objects && (
                  <p className="text-xs text-muted-foreground">Objekt: {order.objects.name}</p>
                )}
                {order.employees && (
                  <p className="text-xs text-muted-foreground">Mitarbeiter: {order.employees.first_name} {order.employees.last_name}</p>
                )}
                <div className="flex items-center mt-2">
                  <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                  {order.due_date && (
                    <p className="text-xs text-muted-foreground ml-auto">Fällig: {new Date(order.due_date).toLocaleDateString()}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <h2 className="text-2xl font-bold mt-8">Neuen Auftrag hinzufügen</h2>
      <OrderForm onSubmit={createOrder} submitButtonText="Auftrag hinzufügen" /> {/* TaskForm zu OrderForm, createTask zu createOrder */}
    </div>
  );
}