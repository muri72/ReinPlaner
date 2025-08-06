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

  const { name, address, contactEmail, contactPhone } = data;

  const { error } = await supabase
    .from('customers')
    .insert({
      user_id: user.id,
      name,
      address,
      contact_email: contactEmail,
      contact_phone: contactPhone,
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

  const { error } = await supabase
    .from('customers')
    .update({
      name: data.name,
      address: data.address,
      contact_email: data.contactEmail,
      contact_phone: data.contactPhone,
    })
    .eq('id', customerId)
    .eq('user_id', user.id); // Sicherstellen, dass nur eigene Kunden aktualisiert werden können

  if (error) {
    console.error("Fehler beim Aktualisieren des Kunden:", error);
    return { success: false, message: error.message };
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

  const customerId = formData.get('customerId') as string;

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', customerId)
    .eq('user_id', user.id); // Sicherstellen, dass nur eigene Kunden gelöscht werden können

  if (error) {
    console.error("Fehler beim Löschen des Kunden:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/customers");
  return { success: true, message: "Kunde erfolgreich gelöscht!" };
}