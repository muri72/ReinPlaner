import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
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
    <div className="p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Plattform-Einstellungen</h1>
        <p className="text-muted-foreground mt-2">
          Konfigurieren Sie die globalen Einstellungen für Ihre Plattform
        </p>
      </div>
      <SettingsForm />
    </div>
  );
}
