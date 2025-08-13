import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // In einer echten Anwendung würden Sie hier Benachrichtigungen abrufen und anzeigen.
  // Vorerst ist dies ein Platzhalter.

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Ihre Benachrichtigungen</h1>
      <Card className="shadow-elevation-2">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Alle Benachrichtigungen</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30">
          <Bell className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
          <p className="text-base md:text-lg font-semibold">Keine Benachrichtigungen vorhanden</p>
          <p className="text-sm">Neue Benachrichtigungen werden hier angezeigt.</p>
        </CardContent>
      </Card>
    </div>
  );
}