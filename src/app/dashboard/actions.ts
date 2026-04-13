"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
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

    // Verwenden Sie den Admin-Client für Speicheroperationen, um Berechtigungsprobleme zu vermeiden
    const supabaseAdmin = createAdminClient();

    // Zuerst versuchen, vorhandene Avatare zu löschen
    const { data: existingFiles, error: listError } = await supabaseAdmin.storage
      .from('avatars')
      .list(user.id, {
        limit: 1, // Wir erwarten nur eine Avatar-Datei pro Benutzer
        search: 'avatar.' // Suche nach Dateien, die mit 'avatar.' beginnen
      });

    if (listError) {
      console.error("Fehler beim Auflisten bestehender Avatare (Admin Client):", listError.message);
      // Fahren Sie fort, da dies für den Upload selbst nicht kritisch sein muss
    } else if (existingFiles && existingFiles.length > 0) {
      const oldFilePath = `${user.id}/${existingFiles[0].name}`;
      const { error: deleteOldError } = await supabaseAdmin.storage
        .from('avatars')
        .remove([oldFilePath]);
      if (deleteOldError) {
        console.warn("Fehler beim Löschen des alten Avatars (Admin Client):", deleteOldError.message);
        // Fahren Sie fort, da die neue Datei trotzdem hochgeladen wird
      }
    }

    // Laden Sie den neuen Avatar hoch
    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, avatarFile, { upsert: true }); // upsert: true überschreibt, falls der Pfad existiert

    if (uploadError) {
      console.error("Fehler beim Hochladen des Avatars (Admin Client):", uploadError?.message || uploadError);
      return { success: false, message: `Avatar-Upload fehlgeschlagen: ${uploadError.message}` };
    }

    const { data: urlData } = supabaseAdmin.storage.from('avatars').getPublicUrl(filePath);
    // Fügen Sie einen Zeitstempel zur URL hinzu, um den Cache zu umgehen
    profileUpdateData.avatar_url = `${urlData.publicUrl}?t=${new Date().getTime()}`;
  }

  // Nur aktualisieren, wenn es etwas zu aktualisieren gibt (Namensfelder oder Avatar)
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
    // Nichts zu aktualisieren
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