"use server";

import { db } from "@/lib/db";
import { notifications, profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
  // 1. In-App-Benachrichtigung erstellen
  try {
    await db.insert(notifications).values({
      profileId: userId,
      title,
      message,
      link,
      type,
    });
  } catch (error) {
    console.error(`Fehler beim Erstellen der Benachrichtigung für Benutzer ${userId}:`, error);
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.profileId, userId));
    return true;
  } catch (error) {
    console.error('Fehler beim Markieren aller als gelesen:', error);
    return false;
  }
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
  try {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, id));
    return true;
  } catch (error) {
    console.error('Fehler beim Markieren als gelesen:', error);
    return false;
  }
}

export async function deleteNotification(id: string): Promise<boolean> {
  try {
    await db.delete(notifications).where(eq(notifications.id, id));
    return true;
  } catch (error) {
    console.error('Fehler beim Löschen der Benachrichtigung:', error);
    return false;
  }
}

export async function deleteAllNotifications(userId: string): Promise<boolean> {
  try {
    await db.delete(notifications).where(eq(notifications.profileId, userId));
    return true;
  } catch (error) {
    console.error('Fehler beim Löschen aller Benachrichtigungen:', error);
    return false;
  }
}

export async function deleteReadNotifications(userId: string): Promise<boolean> {
  try {
    await db
      .delete(notifications)
      .where(eq(notifications.profileId, userId));
    return true;
  } catch (error) {
    console.error('Fehler beim Löschen der gelesenen Benachrichtigungen:', error);
    return false;
  }
}