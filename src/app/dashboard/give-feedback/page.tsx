import { GiveFeedbackForm } from "@/components/give-feedback-form";
import { GeneralDashboardFeedbackForm } from "@/components/general-dashboard-feedback-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GiveFeedbackPage() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Feedback geben</h1>
      <p className="text-muted-foreground">
        Hier können Sie im Namen eines Kunden Feedback zu einem bestimmten Auftrag oder allgemeine Anliegen erfassen.
      </p>
      <Tabs defaultValue="order" className="w-full max-w-2xl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="order">Auftragsfeedback</TabsTrigger>
          <TabsTrigger value="general">Allgemeines Feedback</TabsTrigger>
        </TabsList>
        <TabsContent value="order">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Auftragsfeedback erfassen</CardTitle>
              <CardDescription>
                Wählen Sie einen Kunden und dann den entsprechenden Auftrag aus, um eine Bewertung abzugeben.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GiveFeedbackForm />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="general">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Allgemeines Feedback</CardTitle>
              <CardDescription>
                Äußern Sie hier Lob, Kritik oder allgemeine Wünsche.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GeneralDashboardFeedbackForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}