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

  const firstName = formData.get('firstName') as string | null;
  const lastName = formData.get('lastName') as string | null;
  const avatarFile = formData.get('avatar') as File | null;

  const profileUpdateData: { first_name?: string; last_name?: string; avatar_url?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  if (firstName) profileUpdateData.first_name = firstName;
  if (lastName) profileUpdateData.last_name = lastName;

  // Handle avatar upload
  if (avatarFile && avatarFile.size > 0) {
    const fileExt = avatarFile.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, { upsert: true });

    if (uploadError) {
      console.error("Fehler beim Hochladen des Avatars:", uploadError);
      return { success: false, message: `Avatar-Upload fehlgeschlagen: ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    // Add a timestamp to the URL to bypass cache
    profileUpdateData.avatar_url = `${urlData.publicUrl}?t=${new Date().getTime()}`;
  }

  // Only update if there's something to update (name fields or avatar)
  if (Object.keys(profileUpdateData).length > 1) {
      const { error } = await supabase
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', user.id);

      if (error) {
        console.error("Fehler beim Aktualisieren des Profils:", error);
        return { success: false, message: error.message };
      }
  } else {
    // Nothing to update
    return { success: true, message: "Keine Änderungen zum Speichern." };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  return { success: true, message: "Profil erfolgreich aktualisiert!" };
}