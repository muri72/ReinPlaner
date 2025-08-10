import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrderFeedbackDisplay } from "@/components/order-feedback-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Briefcase, Building } from "lucide-react";

export default async function FeedbackPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all feedback and related order/customer/employee data
  const { data: feedbackData, error } = await supabase
    .from('order_feedback')
    .select(`
      *,
      orders (
        title,
        customers ( name ),
        employees ( first_name, last_name )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Fehler beim Laden des Feedbacks:", error);
    return <div className="p-8">Fehler beim Laden des Feedbacks.</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Kundenfeedback</h1>
      <p className="text-muted-foreground">
        Hier sehen Sie alle Bewertungen und Kommentare, die zu abgeschlossenen Aufträgen abgegeben wurden.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {feedbackData.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground">
            Bisher wurde kein Feedback abgegeben.
          </p>
        ) : (
          feedbackData.map((feedback) => (
            <Card key={feedback.id}>
              <CardHeader>
                <CardTitle className="text-lg">Feedback zu Auftrag</CardTitle>
                <p className="text-sm text-primary font-semibold">{feedback.orders?.title || 'Unbekannter Auftrag'}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                   <div className="flex items-center">
                     <User className="mr-2 h-4 w-4" />
                     <span>Kunde: {feedback.orders?.customers?.name || 'N/A'}</span>
                   </div>
                   <div className="flex items-center">
                     <Building className="mr-2 h-4 w-4" />
                     <span>Mitarbeiter: {`${feedback.orders?.employees?.first_name || ''} ${feedback.orders?.employees?.last_name || ''}`.trim() || 'N/A'}</span>
                   </div>
                </div>
                <OrderFeedbackDisplay feedback={feedback} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}