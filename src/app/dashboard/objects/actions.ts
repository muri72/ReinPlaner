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
    customerContactId, // Neues Feld
    mondayStartTime,
    mondayEndTime,
    tuesdayStartTime,
    tuesdayEndTime,
    wednesdayStartTime,
    wednesdayEndTime,
    thursdayStartTime,
    thursdayEndTime,
    fridayStartTime,
    fridayEndTime,
    saturdayStartTime,
    saturdayEndTime,
    sundayStartTime,
    sundayEndTime,
    notes,
    priority,
    timeOfDay,
    accessMethod,
    pin,
    isAlarmSecured,
    alarmPassword,
    securityCodeWord,
  } = data;

  const { error } = await supabase
    .from('objects')
    .insert({
      user_id: user.id,
      name,
      address,
      description,
      customer_id: customerId,
      customer_contact_id: customerContactId, // Neues Feld
      monday_start_time: mondayStartTime,
      monday_end_time: mondayEndTime,
      tuesday_start_time: tuesdayStartTime,
      tuesday_end_time: tuesdayEndTime,
      wednesday_start_time: wednesdayStartTime,
      wednesday_end_time: wednesdayEndTime,
      thursday_start_time: thursdayStartTime,
      thursday_end_time: thursdayEndTime,
      friday_start_time: fridayStartTime,
      friday_end_time: fridayEndTime,
      saturday_start_time: saturdayStartTime,
      saturday_end_time: saturdayEndTime,
      sunday_start_time: sundayStartTime,
      sunday_end_time: sundayEndTime,
      notes: notes,
      priority: priority,
      time_of_day: timeOfDay,
      access_method: accessMethod,
      pin,
      is_alarm_secured: isAlarmSecured,
      alarm_password: alarmPassword,
      security_code_word: securityCodeWord,
    });

  if (error) {
    console.error("Fehler beim Erstellen des Objekts:", error);
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
    console.error("Fehler beim Abrufen des Benutzerprofils:", profileError);
    return { success: false, message: "Fehler beim Überprüfen der Berechtigungen." };
  }

  let query = supabase
    .from('objects')
    .update({
      name: data.name,
      address: data.address,
      description: data.description,
      customer_id: data.customerId,
      customer_contact_id: data.customerContactId, // Neues Feld
      monday_start_time: data.mondayStartTime,
      monday_end_time: data.mondayEndTime,
      tuesday_start_time: data.tuesdayStartTime,
      tuesday_end_time: data.tuesdayEndTime,
      wednesday_start_time: data.wednesdayStartTime,
      wednesday_end_time: data.wednesdayEndTime,
      thursday_start_time: data.thursdayStartTime,
      thursday_end_time: data.thursdayEndTime,
      friday_start_time: data.fridayStartTime,
      friday_end_time: data.fridayEndTime,
      saturday_start_time: data.saturdayStartTime,
      saturday_end_time: data.saturdayEndTime,
      sunday_start_time: data.sundayStartTime,
      sunday_end_time: data.sundayEndTime,
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
    console.error("Fehler beim Aktualisieren des Objekts:", error);
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
    console.error("Fehler beim Abrufen des Benutzerprofils:", profileError);
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
    console.error("Fehler beim Löschen des Objekts:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/objects");
  return { success: true, message: "Objekt erfolgreich gelöscht!" };
}