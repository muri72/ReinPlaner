import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PlatformHealth } from "@/components/platform-health";

export default async function PlatformHealthPage() {
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
    redirect("/dashboard");
  }

  return (
    <div className="p-4 md:p-8">
      <PlatformHealth />
    </div>
  );
}
