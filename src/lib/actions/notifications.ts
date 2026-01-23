"use server";

import { createAdminClient } from "@/lib/supabase/server";

export type NotificationType =
  | 'order'
  | 'shift'
  | 'ticket'
  | 'system'
  | 'absence'
  | 'default';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  link: string;
  type?: NotificationType;
}

export async function sendNotification({
  userId,
  title,
  message,
  link,
  type = 'default',
}: NotificationPayload) {
  const supabaseAdmin = createAdminClient();

  // 1. In-App-Benachrichtigung erstellen
  const { error: notificationError } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      link,
      type,
    });

  if (notificationError) {
    console.error(`Fehler beim Erstellen der Benachrichtigung für Benutzer ${userId}:`, notificationError?.message || notificationError);
  }

  // 2. Prüfen, ob E-Mail-Benachrichtigungen aktiviert sind
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email_notifications_enabled')
    .eq('id', userId)
    .single();

  if (!profile?.email_notifications_enabled) {
    console.log(`E-Mail-Benachrichtigungen für Benutzer ${userId} deaktiviert. E-Mail wird übersprungen.`);
    return;
  }

  // 3. E-Mail-Adresse des Benutzers abrufen
  const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (userError || !user.user?.email) {
    console.error(`Fehler beim Abrufen der E-Mail für Benutzer ${userId}:`, userError?.message || userError);
    return;
  }

  // 4. E-Mail über Edge Function versenden
  try {
    const { error: functionError } = await supabaseAdmin.functions.invoke('send-email', {
      body: {
        to: user.user.email,
        subject: title,
        html: `<p>${message}</p><p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${link}">Details anzeigen</a></p>`,
      },
    });

    if (functionError) {
      throw functionError;
    }
    console.log(`E-Mail-Benachrichtigung an ${user.user.email} für Benutzer ${userId} gesendet.`);
  } catch (error: any) {
    console.error(`Fehler beim Aufrufen der send-email-Funktion für Benutzer ${userId}:`, error?.message || error);
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Fehler beim Markieren aller als gelesen:', error);
    return false;
  }

  return true;
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Fehler beim Markieren als gelesen:', error);
    return false;
  }

  return true;
}

export async function deleteNotification(id: string): Promise<boolean> {
  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Fehler beim Löschen der Benachrichtigung:', error);
    return false;
  }

  return true;
}

export async function deleteAllNotifications(userId: string): Promise<boolean> {
  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Fehler beim Löschen aller Benachrichtigungen:', error);
    return false;
  }

  return true;
}

export async function deleteReadNotifications(userId: string): Promise<boolean> {
  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('is_read', true);

  if (error) {
    console.error('Fehler beim Löschen der gelesenen Benachrichtigungen:', error);
    return false;
  }

  return true;
}
