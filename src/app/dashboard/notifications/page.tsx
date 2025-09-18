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

  // You can fetch and display notifications here if needed
  // For now, it's a placeholder page.

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Ihre Benachrichtigungen</h1>
      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Benachrichtigungsübersicht</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          <Bell className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
          <p className="text-base md:text-lg font-semibold">Keine Benachrichtigungen vorhanden</p>
          <p className="text-sm">Neue Benachrichtigungen werden hier angezeigt.</p>
        </CardContent>
      </Card>
    </div>
  );
}