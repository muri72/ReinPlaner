import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ResourcePlanningCalendar } from "@/components/resource-planning-calendar";

export default async function PlanningPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if the current user is an admin or manager
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || (profile?.role !== 'admin' && profile?.role !== 'manager')) {
    // If not an admin/manager, redirect to dashboard
    redirect("/dashboard");
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Ressourcenplanung</h1>
      <p className="text-sm md:text-base text-muted-foreground"> {/* Changed to text-base */}
        Hier sehen Sie die wöchentliche Auslastung Ihrer Mitarbeiter basierend auf zugewiesenen Daueraufträgen und genehmigten Abwesenheiten.
      </p>
      <ResourcePlanningCalendar />
    </div>
  );
}