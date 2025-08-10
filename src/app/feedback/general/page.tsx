import { GeneralFeedbackForm } from "@/components/general-feedback-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PublicGeneralFeedbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Kontakt & Allgemeines Feedback</CardTitle>
          <CardDescription>
            Haben Sie eine allgemeine Frage oder möchten uns etwas mitteilen? Wir freuen uns auf Ihre Nachricht.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GeneralFeedbackForm />
        </CardContent>
      </Card>
    </div>
  );
}