"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { CustomerContactFormValues } from "@/components/customer-contact-form";
import { logDataChange } from "@/lib/audit-log";

export async function createCustomerContact(data: CustomerContactFormValues): Promise<{ success: boolean; message: string; newContactId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { customerId, firstName, lastName, email, phone, role } = data;

  const { data: newContact, error } = await supabase
    .from('customer_contacts')
    .insert({
      customer_id: customerId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      role,
    })
    .select('id') // Wichtig: Die ID des neu erstellten Kontakts auswählen
    .single();

  if (error) {
    console.error("Fehler beim Erstellen des Kundenkontakts:", error?.message || error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/objects"); // Revalidiere auch Objekte, da Kontakte dort verwendet werden
  revalidatePath("/dashboard/orders"); // Revalidiere auch Aufträge, da Kontakte dort verwendet werden
  revalidatePath("/dashboard/customers");

  // Create audit log
  if (newContact) {
    await logDataChange(
      user.id,
      "INSERT",
      "customer_contacts",
      newContact.id,
      null,
      { customerId, firstName, lastName, email }
    );
  }

  return { success: true, message: "Kundenkontakt erfolgreich hinzugefügt!", newContactId: newContact?.id };
}

export async function updateCustomerContact(contactId: string, data: CustomerContactFormValues) {
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

  // Get old contact data for audit log
  const { data: oldContact } = await supabase
    .from('customer_contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  let query = supabase
    .from('customer_contacts')
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      role: data.role,
    })
    .eq('id', contactId);

  // Wenn der Benutzer kein Admin ist, nur Kontakte aktualisieren, die zu seinen Kunden gehören
  if (profile?.role !== 'admin') {
    const { data: customerIds, error: customerIdsError } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id);

    if (customerIdsError) {
      console.error("Fehler beim Abrufen der Kunden-IDs für Berechtigungsprüfung:", customerIdsError?.message || customerIdsError);
      return { success: false, message: "Fehler beim Überprüfen der Berechtigungen." };
    }
    const allowedCustomerIds = customerIds.map(c => c.id);
    query = query.in('customer_id', allowedCustomerIds);
  }

  const { data: updatedRows, error } = await query.select();

  if (error) {
    console.error("Fehler beim Aktualisieren des Kundenkontakts:", error?.message || error);
    return { success: false, message: error.message };
  }

  if (!updatedRows || updatedRows.length === 0) {
    console.warn(`Update-Operation für Kundenkontakt-ID ${contactId} durch Benutzer ${user.id} führte zu keiner Aktualisierung. Dies könnte ein RLS-Problem sein oder der Datensatz existiert nicht/gehört nicht zu den Kunden des Benutzers.`);
    return { success: false, message: "Kundenkontakt konnte nicht aktualisiert werden. Möglicherweise haben Sie keine Berechtigung oder der Kontakt existiert nicht." };
  }

  revalidatePath("/dashboard/objects");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/customers");

  // Create audit log
  await logDataChange(
    user.id,
    "UPDATE",
    "customer_contacts",
    contactId,
    oldContact,
    { firstName: data.firstName, lastName: data.lastName, email: data.email }
  );

  return { success: true, message: "Kundenkontakt erfolgreich aktualisiert!" };
}

export async function deleteCustomerContact(formData: FormData): Promise<{ success: boolean; message: string }> {
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

  const contactId = formData.get('contactId') as string;

  // Get contact data before deletion for audit log
  const { data: contactToDelete } = await supabase
    .from('customer_contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  let query = supabase
    .from('customer_contacts')
    .delete()
    .eq('id', contactId);

  // Wenn der Benutzer kein Admin ist, nur Kontakte löschen, die zu seinen Kunden gehören
  if (profile?.role !== 'admin') {
    const { data: customerIds, error: customerIdsError } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id);

    if (customerIdsError) {
      console.error("Fehler beim Abrufen der Kunden-IDs für Berechtigungsprüfung:", customerIdsError?.message || customerIdsError);
      return { success: false, message: "Fehler beim Überprüfen der Berechtigungen." };
    }
    const allowedCustomerIds = customerIds.map(c => c.id);
    query = query.in('customer_id', allowedCustomerIds);
  }

  const { error } = await query;

  if (error) {
    console.error("Fehler beim Löschen des Kundenkontakts:", error?.message || error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/objects");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/customers");

  // Create audit log
  if (contactToDelete) {
    await logDataChange(
      user.id,
      "DELETE",
      "customer_contacts",
      contactId,
      contactToDelete,
      null
    );
  }

  return { success: true, message: "Kundenkontakt erfolgreich gelöscht!" };
}
