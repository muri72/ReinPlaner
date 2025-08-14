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
  const emailNotificationsEnabledStr = formData.get('emailNotificationsEnabled') as string | null;

  const profileUpdateData: { first_name?: string; last_name?: string; avatar_url?: string; email_notifications_enabled?: boolean; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  if (firstName) profileUpdateData.first_name = firstName;
  if (lastName) profileUpdateData.last_name = lastName;
  if (emailNotificationsEnabledStr !== null) {
    profileUpdateData.email_notifications_enabled = emailNotificationsEnabledStr === 'true';
  }

  // Handle avatar upload
  if (avatarFile && avatarFile.size > 0) {
    const fileExt = avatarFile.name.split('.').pop();
    // Use user.id as the folder name for simpler RLS
    const filePath = `${user.id}/avatar.${fileExt}`;

    // First, try to delete any existing avatar for this user to ensure upsert works cleanly
    // This is a good practice to avoid orphaned files if the extension changes.
    // We need to list files in the user's folder and delete them.
    const { data: existingFiles, error: listError } = await supabase.storage
      .from('avatars')
      .list(user.id, {
        limit: 1, // We only expect one avatar file per user
        search: 'avatar.' // Search for files starting with 'avatar.'
      });

    if (listError) {
      console.error("Fehler beim Auflisten bestehender Avatare:", listError.message);
      // Continue, as this might not be critical for the upload itself
    } else if (existingFiles && existingFiles.length > 0) {
      const oldFilePath = `${user.id}/${existingFiles[0].name}`;
      const { error: deleteOldError } = await supabase.storage
        .from('avatars')
        .remove([oldFilePath]);
      if (deleteOldError) {
        console.warn("Fehler beim Löschen des alten Avatars:", deleteOldError.message);
        // Continue, as the new file will still be uploaded
      }
    }

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, { upsert: true }); // upsert: true will overwrite if path exists

    if (uploadError) {
      console.error("Fehler beim Hochladen des Avatars:", uploadError?.message || uploadError);
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
        console.error("Fehler beim Aktualisieren des Profils:", error?.message || error);
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

export async function updatePassword(password: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("Fehler beim Aktualisieren des Passworts:", error?.message || error);
    return { success: false, message: `Passwort-Update fehlgeschlagen: ${error.message}` };
  }

  // Melde den Benutzer aus Sicherheitsgründen ab.
  await supabase.auth.signOut();

  return { success: true, message: "Passwort erfolgreich aktualisiert! Sie werden nun abgemeldet." };
}

export async function sendPasswordResetEmail() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { success: false, message: "Benutzer nicht authentifiziert oder keine E-Mail-Adresse vorhanden." };
  }

  // WICHTIG: Stellen Sie sicher, dass NEXT_PUBLIC_BASE_URL in Ihren Umgebungsvariablen gesetzt ist.
  const redirectTo = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/callback?next=/dashboard/profile`;

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo,
  });

  if (error) {
    console.error("Fehler beim Senden der Passwort-Reset-E-Mail:", error?.message || error);
    return { success: false, message: `Fehler: ${error.message}` };
  }

  return { success: true, message: "E-Mail zum Zurücksetzen des Passworts wurde gesendet. Bitte überprüfen Sie Ihren Posteingang." };
}