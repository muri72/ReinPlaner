import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AuditLogsTable } from "@/components/audit-logs-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Activity } from "lucide-react";

export default async function AuditLogsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if the current user is an admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || profileError);
    // If not an admin, redirect to dashboard
    redirect("/dashboard");
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Audit-Logs</h1>
      </div>
      <p className="text-muted-foreground">
        Protokollierung aller wichtigen Systemaktivitäten und Benutzeraktionen
      </p>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Systemaktivitäten
            </CardTitle>
            <CardDescription>
              Alle kritischen Aktionen im System werden hier protokolliert
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuditLogsTable />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
