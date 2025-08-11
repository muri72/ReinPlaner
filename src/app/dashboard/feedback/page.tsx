import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeedbackCard } from "@/components/feedback-card";
import { GiveFeedbackForm } from "@/components/give-feedback-form";
import { GeneralDashboardFeedbackForm } from "@/components/general-dashboard-feedback-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Star, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradientDivider } from "@/components/gradient-divider"; // Import the new component

export default async function FeedbackPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const currentUserRole = profile?.role as 'admin' | 'manager' | 'employee' | 'customer' || 'employee';

  // Fetch order-specific feedback
  const { data: orderFeedbackData, error: orderFeedbackError } = await supabase
    .from('order_feedback')
    .select(`
      *,
      orders (
        title,
        customers ( name ),
        employees ( first_name, last_name )
      ),
      profiles ( first_name, last_name )
    `)
    .order('created_at', { ascending: false });

  // Fetch general feedback
  const { data: generalFeedbackData, error: generalFeedbackError } = await supabase
    .from('general_feedback')
    .select(`
      *,
      profiles ( first_name, last_name )
    `)
    .order('created_at', { ascending: false });

  if (orderFeedbackError) console.error("Fehler beim Laden des Auftrags-Feedbacks:", orderFeedbackError);
  if (generalFeedbackError) console.error("Fehler beim Laden des allgemeinen Feedbacks:", generalFeedbackError);

  const mappedOrderFeedback = orderFeedbackData?.map(f => ({
    ...f,
    order: {
      title: f.orders?.title || 'Unbekannter Auftrag',
      customer_name: f.orders?.customers?.name || 'N/A',
      employee_name: `${f.orders?.employees?.first_name || ''} ${f.orders?.employees?.last_name || ''}`.trim() || 'N/A',
    },
    replied_by_name: `${f.profiles?.first_name || ''} ${f.profiles?.last_name || ''}`.trim() || 'Admin',
  })) || [];

  const mappedGeneralFeedback = generalFeedbackData?.map(f => ({
    ...f,
    replied_by_name: `${f.profiles?.first_name || ''} ${f.profiles?.last_name || ''}`.trim() || 'Admin',
  })) || [];

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Feedback</h1>
      
      {currentUserRole !== 'admin' && currentUserRole !== 'manager' && (
        <Card className="shadow-elevation-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Neues Feedback einreichen</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="orders">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="orders">Auftragsbezogen</TabsTrigger>
                <TabsTrigger value="general">Allgemein</TabsTrigger>
              </TabsList>
              <TabsContent value="orders" className="mt-6">
                <GiveFeedbackForm />
              </TabsContent>
              <TabsContent value="general" className="mt-6">
                <GeneralDashboardFeedbackForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <GradientDivider className="my-8" /> {/* Add the gradient divider here */}

      <div>
        <h2 className="text-xl md:text-2xl font-bold mt-8 mb-4">Eingegangenes Feedback</h2>
        <Tabs defaultValue="orders">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders">Auftragsbezogen ({mappedOrderFeedback.length})</TabsTrigger>
            <TabsTrigger value="general">Allgemein ({mappedGeneralFeedback.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="orders" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {mappedOrderFeedback.length === 0 ? (
                <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30">
                  <Star className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                  <p className="text-base md:text-lg font-semibold">Bisher kein auftragsbezogenes Feedback</p>
                  <p className="text-sm">Wenn Sie Feedback zu einem Auftrag haben, können Sie es hier einreichen.</p>
                  {currentUserRole !== 'admin' && currentUserRole !== 'manager' && (
                    <div className="mt-4">
                      <Button onClick={() => { /* Logic to switch tab or scroll to form */ }} className="transition-colors duration-200">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Feedback geben
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                mappedOrderFeedback.map((feedback) => (
                  <FeedbackCard
                    key={feedback.id}
                    feedback={feedback as any}
                    feedbackType="order"
                    currentUserId={user.id}
                    currentUserRole={currentUserRole}
                  />
                ))
              )}
            </div>
          </TabsContent>
          <TabsContent value="general" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {mappedGeneralFeedback.length === 0 ? (
                <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30">
                  <MessageSquare className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                  <p className="text-base md:text-lg font-semibold">Kein allgemeines Feedback vorhanden</p>
                  <p className="text-sm">Wenn Sie allgemeines Feedback haben, können Sie es hier einreichen.</p>
                  {currentUserRole !== 'admin' && currentUserRole !== 'manager' && (
                    <div className="mt-4">
                      <Button onClick={() => { /* Logic to switch tab or scroll to form */ }} className="transition-colors duration-200">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Feedback geben
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                mappedGeneralFeedback.map((feedback) => (
                  <FeedbackCard
                    key={feedback.id}
                    feedback={feedback as any}
                    feedbackType="general"
                    currentUserId={user.id}
                    currentUserRole={currentUserRole}
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}