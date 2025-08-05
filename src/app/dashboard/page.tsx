import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { ProfileUpdateForm } from "@/components/profile-update-form"; // Importiere die neue Komponente
import { signOut } from "@/app/dashboard/actions"; // Importiere die Server-Aktion

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Profildaten abrufen
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') { // PGRST116 bedeutet "keine Zeilen gefunden"
    console.error("Fehler beim Laden des Profils:", profileError);
    // Hier könnte man eine Toast-Nachricht hinzufügen, aber Server-Komponenten können keine Toasts direkt anzeigen.
    // Die Fehlerbehandlung für das Laden des Profils ist eher für das Debugging gedacht.
  }

  return (
    <div className="grid grid-rows-[1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-1 items-center sm:items-start">
        <h1 className="text-3xl font-bold">
          Willkommen im Dashboard, {profile?.first_name || user.email}!
        </h1>
        {profile?.first_name && profile?.last_name && (
          <p className="text-lg">
            Ihr vollständiger Name: {profile.first_name} {profile.last_name}
          </p>
        )}

        <h2 className="text-2xl font-bold mt-8">Profil aktualisieren</h2>
        <ProfileUpdateForm
          initialData={{
            firstName: profile?.first_name || null,
            lastName: profile?.last_name || null,
          }}
        />

        <form action={signOut} className="mt-8">
          <Button type="submit">Abmelden</Button>
        </form>
      </main>
      <MadeWithDyad />
    </div>
  );
}