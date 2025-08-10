import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClipboardCopy, Link as LinkIcon } from "lucide-react";

export function FeedbackHowToCard() {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Wie können Kunden Feedback geben?</CardTitle>
        <CardDescription>
          Da es noch kein Kundenportal gibt, funktioniert das Feedback über spezielle Links, die Sie teilen.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center">
            <ClipboardCopy className="mr-2 h-4 w-4" />
            1. Für einen bestimmten Auftrag
          </h4>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
            <li>Gehen Sie zur Seite "Aufträge".</li>
            <li>Suchen Sie einen abgeschlossenen Auftrag.</li>
            <li>Klicken Sie auf den Button "Feedback-Link kopieren".</li>
            <li>Senden Sie diesen einzigartigen Link an Ihren Kunden.</li>
          </ol>
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center">
            <LinkIcon className="mr-2 h-4 w-4" />
            2. Für allgemeines Feedback
          </h4>
          <p className="text-sm text-muted-foreground">
            Teilen Sie den folgenden allgemeinen Link auf Ihrer Webseite oder in E-Mails:
          </p>
          <div className="p-2 bg-muted rounded-md text-sm">
            <code>/feedback/general</code>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}