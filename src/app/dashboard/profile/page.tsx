import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileUpdateForm } from "@/components/profile-update-form";
import { PasswordUpdateForm } from "@/components/password-update-form";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Ihr Profil</h1>
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Profilinformationen</CardTitle> {/* Changed to text-lg font-semibold */}
            <CardDescription className="text-sm"> {/* Changed to text-sm */}
              Aktualisieren Sie hier Ihren Namen und Ihr Profilbild. Ihre E-Mail-Adresse kann nicht geändert werden.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">E-Mail</p> {/* Changed to text-sm */}
              <p className="text-base font-semibold">{user.email}</p> {/* Changed to text-base */}
            </div>
            <ProfileUpdateForm
              initialData={{
                firstName: profile?.first_name || null,
                lastName: profile?.last_name || null,
                avatarUrl: profile?.avatar_url || null,
                emailNotificationsEnabled: profile?.email_notifications_enabled ?? true,
              }}
            />
          </CardContent>
        </Card>
        <PasswordUpdateForm />
      </div>
      <MadeWithDyad />
    </div>
  );
}