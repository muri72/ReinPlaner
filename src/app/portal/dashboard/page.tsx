import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FilePlus2, Star } from "lucide-react";
import { OrderFeedbackDialog } from "@/components/order-feedback-dialog";

export default async function CustomerPortalDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .single();

  // RLS automatically filters orders for the logged-in customer
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*, order_feedback(id)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Fehler beim Laden der Kundenaufträge:", error);
    return <div className="p-8">Fehler beim Laden Ihrer Aufträge.</div>;
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending':
      default: return 'outline';
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          Willkommen, {profile?.first_name || user.email}!
        </h1>
        <Button asChild>
          <Link href="/portal/requests/new">
            <FilePlus2 className="mr-2 h-4 w-4" />
            Neue Service-Anfrage
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Ihre Aufträge</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground text-sm">
              Sie haben noch keine Aufträge.
            </p>
          ) : (
            orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">{order.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Erstellt am: {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                    <Badge variant="outline">{order.service_type || 'Allgemein'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-normal line-clamp-3">
                    {order.description || "Keine Beschreibung vorhanden."}
                  </p>
                  {order.status === 'completed' && order.order_feedback.length === 0 && (
                     <div className="border-t pt-4">
                       <OrderFeedbackDialog orderId={order.id} />
                     </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}