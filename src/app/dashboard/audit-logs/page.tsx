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
    <div className="p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
        <h1 className="text-2xl sm:text-3xl font-bold truncate">Audit-Logs</h1>
      </div>
      <p className="text-sm sm:text-base text-muted-foreground">
        Protokollierung aller wichtigen Systemaktivitäten und Benutzeraktionen
      </p>

      <div className="grid gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
              Systemaktivitäten
            </CardTitle>
            <CardDescription className="text-sm">
              Alle kritischen Aktionen im System werden hier protokolliert
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <AuditLogsTable />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
