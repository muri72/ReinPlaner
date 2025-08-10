import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrderFeedbackDisplay } from "@/components/order-feedback-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Briefcase, Building, Mail, MessageSquare, Image as ImageIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NextImage from "next/image";

export default async function FeedbackPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch order-specific feedback
  const { data: orderFeedbackData, error: orderFeedbackError } = await supabase
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

  // Fetch general feedback
  const { data: generalFeedbackData, error: generalFeedbackError } = await supabase
    .from('general_feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (orderFeedbackError) console.error("Fehler beim Laden des Auftrags-Feedbacks:", orderFeedbackError);
  if (generalFeedbackError) console.error("Fehler beim Laden des allgemeinen Feedbacks:", generalFeedbackError);

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Feedback-Zentrale</h1>
      <Tabs defaultValue="orders">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders">Auftragsbezogen</TabsTrigger>
          <TabsTrigger value="general">Allgemein</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orderFeedbackData?.length === 0 ? (
              <p className="col-span-full text-center text-muted-foreground">Bisher wurde kein auftragsbezogenes Feedback abgegeben.</p>
            ) : (
              orderFeedbackData?.map((feedback) => (
                <Card key={feedback.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">Feedback zu Auftrag</CardTitle>
                    <p className="text-sm text-primary font-semibold">{feedback.orders?.title || 'Unbekannter Auftrag'}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                       <div className="flex items-center"><User className="mr-2 h-4 w-4" /><span>Kunde: {feedback.orders?.customers?.name || 'N/A'}</span></div>
                       <div className="flex items-center"><Building className="mr-2 h-4 w-4" /><span>Mitarbeiter: {`${feedback.orders?.employees?.first_name || ''} ${feedback.orders?.employees?.last_name || ''}`.trim() || 'N/A'}</span></div>
                    </div>
                    <OrderFeedbackDisplay feedback={feedback} />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="general" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {generalFeedbackData?.length === 0 ? (
              <p className="col-span-full text-center text-muted-foreground">Kein allgemeines Feedback vorhanden.</p>
            ) : (
              generalFeedbackData?.map((feedback) => (
                <Card key={feedback.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{feedback.subject || 'Allgemeines Feedback'}</CardTitle>
                    <p className="text-sm text-muted-foreground">Von: {feedback.name} {feedback.email && `<${feedback.email}>`}</p>
                    <p className="text-xs text-muted-foreground">Eingegangen am: {new Date(feedback.created_at).toLocaleString()}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm text-foreground">{feedback.message}</p>
                    </div>
                    {feedback.image_urls && feedback.image_urls.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center"><ImageIcon className="h-4 w-4 mr-2 text-muted-foreground" />Bilder</h4>
                        <div className="flex flex-wrap gap-2">
                          {feedback.image_urls.map((url: string, index: number) => (
                            <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                              <NextImage src={url} alt={`Feedback-Bild ${index + 1}`} width={100} height={100} className="rounded-md object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}