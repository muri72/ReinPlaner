import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WorkTimeReportForm } from "@/components/work-time-report-form";

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
    // If not an admin, redirect to dashboard or show an unauthorized message
    redirect("/dashboard");
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Arbeitszeitnachweise</h1>
      <WorkTimeReportForm />
    </div>
  );
}