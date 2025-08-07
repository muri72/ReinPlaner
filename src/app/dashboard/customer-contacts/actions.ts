"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { CustomerContactFormValues } from "@/components/customer-contact-form";

export async function createCustomerContact(data: CustomerContactFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { customerId, firstName, lastName, email, phone, role } = data;

  const { error } = await supabase
    .from('customer_contacts')
    .insert({
      customer_id: customerId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      role,
    });

  if (error) {
    console.error("Fehler beim Erstellen des Kundenkontakts:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/customer-contacts");
  revalidatePath("/dashboard/objects"); // Revalidiere auch Objekte, da Kontakte dort verwendet werden
  revalidatePath("/dashboard/orders"); // Revalidiere auch Aufträge, da Kontakte dort verwendet werden
  return { success: true, message: "Kundenkontakt erfolgreich hinzugefügt!" };
}

export async function updateCustomerContact(contactId: string, data: CustomerContactFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  // Kunden-IDs des aktuellen Benutzers abrufen
  const { data: customerIds, error: customerIdsError } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id);

  if (customerIdsError) {
    console.error("Fehler beim Abrufen der Kunden-IDs:", customerIdsError);
    return { success: false, message: "Fehler beim Überprüfen der Berechtigungen." };
  }

  const allowedCustomerIds = customerIds.map(c => c.id);

  const { error } = await supabase
    .from('customer_contacts')
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      role: data.role,
    })
    .eq('id', contactId)
    .in('customer_id', allowedCustomerIds); // Korrigiert: Übergabe eines Arrays von IDs

  if (error) {
    console.error("Fehler beim Aktualisieren des Kundenkontakts:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/customer-contacts");
  revalidatePath("/dashboard/objects");
  revalidatePath("/dashboard/orders");
  return { success: true, message: "Kundenkontakt erfolgreich aktualisiert!" };
}

export async function deleteCustomerContact(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const contactId = formData.get('contactId') as string;

  // Kunden-IDs des aktuellen Benutzers abrufen
  const { data: customerIds, error: customerIdsError } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id);

  if (customerIdsError) {
    console.error("Fehler beim Abrufen der Kunden-IDs:", customerIdsError);
    return { success: false, message: "Fehler beim Überprüfen der Berechtigungen." };
  }

  const allowedCustomerIds = customerIds.map(c => c.id);

  const { error } = await supabase
    .from('customer_contacts')
    .delete()
    .eq('id', contactId)
    .in('customer_id', allowedCustomerIds); // Korrigiert: Übergabe eines Arrays von IDs

  if (error) {
    console.error("Fehler beim Löschen des Kundenkontakts:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/customer-contacts");
  revalidatePath("/dashboard/objects");
  revalidatePath("/dashboard/orders");
  return { success: true, message: "Kundenkontakt erfolgreich gelöscht!" };
}