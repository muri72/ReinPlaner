import { createClient } from "@/lib/supabase/server";
import { OrderFeedbackForm } from "@/components/order-feedback-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { notFound } from "next/navigation";

export default async function PublicFeedbackPage({ params }: { params: { orderId: string } }) {
  const supabase = await createClient();
  const { orderId } = params;

  // Fetch order details to display to the customer
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      title,
      description,
      customers ( name )
    `)
    .eq('id', orderId)
    .single();

  if (error || !order) {
    notFound();
  }

  // Check if feedback already exists
  const { data: existingFeedback, error: feedbackError } = await supabase
    .from('order_feedback')
    .select('id')
    .eq('order_id', orderId)
    .limit(1);

  if (existingFeedback && existingFeedback.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Vielen Dank!</h1>
          <p className="text-muted-foreground">Für diesen Auftrag wurde bereits ein Feedback abgegeben.</p>
        </div>
      </div>
    );
  }

  // Handle case where 'customers' might be an array or an object
  const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Feedback für Ihren Auftrag</CardTitle>
          <p className="text-lg font-semibold text-primary">{order.title}</p>
          <p className="text-sm text-muted-foreground">Kunde: {customer?.name || 'N/A'}</p>
        </CardHeader>
        <CardContent>
          <OrderFeedbackForm orderId={orderId} />
        </CardContent>
      </Card>
    </div>
  );
}