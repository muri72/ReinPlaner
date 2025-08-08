"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { CustomerFormValues } from "@/components/customer-form"; // Importiere den Typ

export async function createCustomer(data: CustomerFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { name, address, contactEmail, contactPhone, customerType } = data;

  const { error } = await supabase
    .from('customers')
    .insert({
      user_id: user.id,
      name,
      address,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      customer_type: customerType, // Neues Feld
    });

  if (error) {
    console.error("Fehler beim Erstellen des Kunden:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/customers");
  return { success: true, message: "Kunde erfolgreich hinzugefügt!" };
}

export async function updateCustomer(customerId: string, data: CustomerFormValues) {
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
    .from('customers')
    .update({
      name: data.name,
      address: data.address,
      contact_email: data.contactEmail,
      contact_phone: data.contactPhone,
      customer_type: data.customerType, // Neues Feld
    })
    .eq('id', customerId);

  // Wenn der Benutzer kein Admin ist, nur eigene Kunden aktualisieren
  if (profile?.role !== 'admin') {
    query = query.eq('user_id', user.id);
  }

  const { data: updatedRows, error } = await query.select();

  if (error) {
    console.error("Fehler beim Aktualisieren des Kunden:", error);
    return { success: false, message: error.message };
  }

  if (!updatedRows || updatedRows.length === 0) {
    console.warn(`Update-Operation für Kunden-ID ${customerId} durch Benutzer ${user.id} führte zu keiner Aktualisierung. Dies könnte ein RLS-Problem sein oder der Datensatz existiert nicht/gehört nicht dem Benutzer.`);
    return { success: false, message: "Kunde konnte nicht aktualisiert werden. Möglicherweise haben Sie keine Berechtigung oder der Kunde existiert nicht." };
  }

  revalidatePath("/dashboard/customers");
  return { success: true, message: "Kunde erfolgreich aktualisiert!" };
}

export async function deleteCustomer(formData: FormData): Promise<{ success: boolean; message: string }> {
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

  const customerId = formData.get('customerId') as string;

  let query = supabase
    .from('customers')
    .delete()
    .eq('id', customerId);

  // Wenn der Benutzer kein Admin ist, nur eigene Kunden löschen
  if (profile?.role !== 'admin') {
    query = query.eq('user_id', user.id);
  }

  const { error } = await query;

  if (error) {
    console.error("Fehler beim Löschen des Kunden:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/customers");
  return { success: true, message: "Kunde erfolgreich gelöscht!" };
}