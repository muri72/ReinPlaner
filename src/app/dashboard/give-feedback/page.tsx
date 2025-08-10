import { GiveFeedbackForm } from "@/components/give-feedback-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function GiveFeedbackPage() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Feedback geben</h1>
      <p className="text-muted-foreground">
        Hier können Sie im Namen eines Kunden Feedback zu einem bestimmten Auftrag abgeben.
      </p>
      <Card className="w-full max-w-2xl">
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
    </div>
  );
}