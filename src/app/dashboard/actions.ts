"use server";

import { signOut as nextAuthSignOut } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/session";

export async function signOut() {
  await nextAuthSignOut({ redirectTo: "/login" });
  redirect("/login");
}

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const firstName = formData.get("firstName") as string | null;
  const lastName = formData.get("lastName") as string | null;
  const avatarUrl = formData.get("avatarUrl") as string | null;
  const emailNotificationsEnabledStr = formData.get("emailNotificationsEnabled") as string | null;

  const profileUpdateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (firstName) profileUpdateData.first_name = firstName;
  if (lastName) profileUpdateData.last_name = lastName;
  if (avatarUrl) profileUpdateData.avatar_url = avatarUrl;
  if (emailNotificationsEnabledStr !== null) {
    profileUpdateData.email_notifications_enabled = emailNotificationsEnabledStr === "true";
  }

  // Only update if there are actual changes (more than just updated_at)
  const hasChanges = Object.keys(profileUpdateData).some(
    (k) => k !== "updated_at" && profileUpdateData[k] !== undefined
  );

  if (!hasChanges) {
    return { success: true, message: "Keine Änderungen zum Speichern." };
  }

  try {
    await db
      .update(profiles)
      .set(profileUpdateData as typeof profiles.$inferInsert)
      .where(eq(profiles.id, session.user.id));

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard");
    return { success: true, message: "Profil erfolgreich aktualisiert!" };
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Profils:", error);
    return { success: false, message: "Profil-Update fehlgeschlagen." };
  }
}

export async function updatePassword(password: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  // TODO: Use bcryptjs to hash password and store in password_hash column
  // import { hash } from 'bcryptjs';
  // const hashedPassword = await hash(password, 10);
  // await db.update(profiles).set({ passwordHash: hashedPassword }).where(eq(profiles.id, session.user.id));

  return { success: true, message: "Passwort-Update ist noch nicht implementiert." };
}

export async function sendPasswordResetEmail() {
  // TODO: NextAuth email provider required (Resend API key)
  return {
    success: false,
    message: "Passwort-Reset via E-Mail ist noch nicht konfiguriert.",
  };
}