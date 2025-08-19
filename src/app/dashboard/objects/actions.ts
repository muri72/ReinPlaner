"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ObjectFormValues } from "@/components/object-form";

export async function createObject(data: ObjectFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const {
    name,
    address,
    description,
    customerId,
    customerContactId,
    monday_hours,
    tuesday_hours,
    wednesday_hours,
    thursday_hours,
    friday_hours,
    saturday_hours,
    sunday_hours,
    monday_start_time,
    monday_end_time,
    tuesday_start_time,
    tuesday_end_time,
    wednesday_start_time,
    wednesday_end_time,
    thursday_start_time,
    thursday_end_time,
    friday_start_time,
    friday_end_time,
    saturday_start_time,
    saturday_end_time,
    sunday_start_time,
    sunday_end_time,
    notes,
    priority,
    timeOfDay,
    accessMethod,
    pin,
    isAlarmSecured,
    alarmPassword,
    securityCodeWord,
  } = data;

  // Calculate total_weekly_hours
  const total_weekly_hours = (monday_hours || 0) +
                             (tuesday_hours || 0) +
                             (wednesday_hours || 0) +
                             (thursday_hours || 0) +
                             (friday_hours || 0) +
                             (saturday_hours || 0) +
                             (sunday_hours || 0);

  const { error } = await supabase
    .from('objects')
    .insert({
      user_id: user.id,
      name,
      address,
      description,
      customer_id: customerId,
      customer_contact_id: customerContactId,
      monday_hours,
      tuesday_hours,
      wednesday_hours,
      thursday_hours,
      friday_hours,
      saturday_hours,
      sunday_hours,
      total_weekly_hours, // Include the calculated total
      monday_start_time,
      monday_end_time,
      tuesday_start_time,
      tuesday_end_time,
      wednesday_start_time,
      wednesday_end_time,
      thursday_start_time,
      thursday_end_time,
      friday_start_time,
      friday_end_time,
      saturday_start_time,
      saturday_end_time,
      sunday_start_time,
      sunday_end_time,
      notes,
      priority,
      time_of_day: timeOfDay,
      access_method: accessMethod,
      pin,
      is_alarm_secured: isAlarmSecured,
      alarm_password: alarmPassword,
      security_code_word: securityCodeWord,
    });

  if (error) {
    console.error("Fehler beim Erstellen des Objekts:", error?.message || error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/objects");
  return { success: true, message: "Objekt erfolgreich hinzugefügt!" };
}

export async function updateObject(objectId: string, data: ObjectFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  // Überprüfen, ob der aktuelle Benutzer ein Admin ist
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || profileError);
    return { success: false, message: "Fehler beim Überprüfen der Berechtigungen." };
  }

  const {
    name,
    address,
    description,
    customerId,
    customerContactId,
    monday_hours,
    tuesday_hours,
    wednesday_hours,
    thursday_hours,
    friday_hours,
    saturday_hours,
    sunday_hours,
    monday_start_time,
    monday_end_time,
    tuesday_start_time,
    tuesday_end_time,
    wednesday_start_time,
    wednesday_end_time,
    thursday_start_time,
    thursday_end_time,
    friday_start_time,
    friday_end_time,
    saturday_start_time,
    saturday_end_time,
    sunday_start_time,
    sunday_end_time,
    notes,
    priority,
    timeOfDay,
    accessMethod,
    pin,
    isAlarmSecured,
    alarmPassword,
    securityCodeWord,
  } = data;

  // Calculate total_weekly_hours
  const total_weekly_hours = (monday_hours || 0) +
                             (tuesday_hours || 0) +
                             (wednesday_hours || 0) +
                             (thursday_hours || 0) +
                             (friday_hours || 0) +
                             (saturday_hours || 0) +
                             (sunday_hours || 0);

  let query = supabase
    .from('objects')
    .update({
      name: data.name,
      address: data.address,
      description: data.description,
      customer_id: data.customerId,
      customer_contact_id: data.customerContactId,
      monday_hours: data.monday_hours,
      tuesday_hours: data.tuesday_hours,
      wednesday_hours: data.wednesday_hours,
      thursday_hours: data.thursday_hours,
      friday_hours: data.friday_hours,
      saturday_hours: data.saturday_hours,
      sunday_hours: data.sunday_hours,
      total_weekly_hours, // Include the calculated total
      monday_start_time: data.monday_start_time,
      monday_end_time: data.monday_end_time,
      tuesday_start_time: data.tuesday_start_time,
      tuesday_end_time: data.tuesday_end_time,
      wednesday_start_time: data.wednesday_start_time,
      wednesday_end_time: data.wednesday_end_time,
      thursday_start_time: data.thursday_start_time,
      thursday_end_time: data.thursday_end_time,
      friday_start_time: data.friday_start_time,
      friday_end_time: data.friday_end_time,
      saturday_start_time: data.saturday_start_time,
      saturday_end_time: data.saturday_end_time,
      sunday_start_time: data.sunday_start_time,
      sunday_end_time: data.sunday_end_time,
      notes: data.notes,
      priority: data.priority,
      time_of_day: data.timeOfDay,
      access_method: data.accessMethod,
      pin: data.pin,
      is_alarm_secured: data.isAlarmSecured,
      alarm_password: data.alarmPassword,
      security_code_word: data.securityCodeWord,
    })
    .eq('id', objectId);

  // Wenn der Benutzer kein Admin ist, nur eigene Objekte aktualisieren
  if (profile?.role !== 'admin') {
    query = query.eq('user_id', user.id);
  }

  const { data: updatedRows, error } = await query.select();

  if (error) {
    console.error("Fehler beim Aktualisieren des Objekts:", error?.message || error);
    return { success: false, message: error.message };
  }

  if (!updatedRows || updatedRows.length === 0) {
    console.warn(`Update-Operation für Objekt-ID ${objectId} durch Benutzer ${user.id} führte zu keiner Aktualisierung. Dies könnte ein RLS-Problem sein oder der Datensatz existiert nicht/gehört nicht dem Benutzer.`);
    return { success: false, message: "Objekt konnte nicht aktualisiert werden. Möglicherweise haben Sie keine Berechtigung oder das Objekt existiert nicht." };
  }

  revalidatePath("/dashboard/objects");
  return { success: true, message: "Objekt erfolgreich aktualisiert!" };
}

export async function deleteObject(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  // Überprüfen, ob der aktuelle Benutzer ein Admin ist
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || profileError);
    return { success: false, message: "Fehler beim Überprüfen der Berechtigungen." };
  }

  const objectId = formData.get('objectId') as string;

  let query = supabase
    .from('objects')
    .delete()
    .eq('id', objectId);

  // Wenn der Benutzer kein Admin ist, nur eigene Objekte löschen
  if (profile?.role !== 'admin') {
    query = query.eq('user_id', user.id);
  }

  const { error } = await query;

  if (error) {
    console.error("Fehler beim Löschen des Objekts:", error?.message || error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/objects");
  return { success: true, message: "Objekt erfolgreich gelöscht!" };
}