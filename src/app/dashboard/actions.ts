"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;

  const { error } = await supabase
    .from('profiles')
    .update({ first_name: firstName, last_name: lastName, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) {
    console.error("Fehler beim Aktualisieren des Profils:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard"); // Revalidiere die Dashboard-Seite, um die aktualisierten Daten anzuzeigen
  return { success: true, message: "Profil erfolgreich aktualisiert!" };
}