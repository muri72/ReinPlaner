import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Wenn der Benutzer angemeldet ist, zum Dashboard weiterleiten
    redirect("/dashboard");
  } else {
    // Wenn der Benutzer nicht angemeldet ist, zur Login-Seite weiterleiten
    redirect("/login");
  }
}