import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WorkTimeReportForm } from "@/components/work-time-report-form";
import { TimeAccountsAdminTable } from "@/components/time-accounts-admin-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ReportsPage() {
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
    // If not an admin, redirect to dashboard or show an unauthorized message
    redirect("/dashboard");
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Berichte & Übersichten</h1>

      {/* Work Time Reports Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Arbeitszeitnachweise</h2>
        <WorkTimeReportForm />
      </section>

      {/* Time Accounts Overview Section */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Zeitkonto-Übersicht</h2>
        <TimeAccountsAdminTable />
      </section>
    </div>
  );
}