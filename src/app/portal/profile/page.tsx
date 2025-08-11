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
    .select('first_name, last_name, avatar_url, email_notifications_enabled')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error("Fehler beim Laden des Profils:", profileError);
  }

  return (
    <div className="p-8">
        <h1 className="text-3xl font-bold">Ihr Profil</h1>
        {profile?.first_name && profile?.last_name && (
          <p className="text-base mt-4"> {/* Changed to text-base */}
            Aktueller Name: {profile.first_name} {profile.last_name}
          </p>
        )}

        <h2 className="text-2xl font-bold mt-8">Profil aktualisieren</h2>
        <div className="mt-4">
            <ProfileUpdateForm
            initialData={{
                firstName: profile?.first_name || null,
                lastName: profile?.last_name || null,
                avatarUrl: profile?.avatar_url || null, // Hinzugefügt
                emailNotificationsEnabled: profile?.email_notifications_enabled ?? true, // Hinzugefügt
            }}
            />
        </div>
    </div>
  );
}