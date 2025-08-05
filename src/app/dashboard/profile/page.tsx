import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileUpdateForm } from "@/components/profile-update-form";
import { MadeWithDyad } from "@/components/made-with-dyad";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error("Fehler beim Laden des Profils:", profileError);
  }

  return (
    <div className="grid grid-rows-[1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-1 items-center sm:items-start">
        <h1 className="text-3xl font-bold">Ihr Profil</h1>
        {profile?.first_name && profile?.last_name && (
          <p className="text-lg">
            Aktueller Name: {profile.first_name} {profile.last_name}
          </p>
        )}

        <h2 className="text-2xl font-bold mt-8">Profil aktualisieren</h2>
        <ProfileUpdateForm
          initialData={{
            firstName: profile?.first_name || null,
            lastName: profile?.last_name || null,
          }}
        />
      </main>
      <MadeWithDyad />
    </div>
  );
}