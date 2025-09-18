import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WorkTimeReportForm } from "@/components/work-time-report-form";

export default async function ReportsPage() {
  const supabase = createClient();
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
      <h1 className="text-2xl md:text-3xl font-bold">Arbeitszeitnachweise</h1>
      <WorkTimeReportForm />
    </div>
  );
}