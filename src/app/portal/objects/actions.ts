"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ObjectFormValues } from "@/components/object-form";

export async function createCustomerObject(data: ObjectFormValues, customerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  // Verify the user is creating an object for their own customer_id
  const { data: customerData, error: customerError } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .eq('id', customerId)
    .single();

  if (customerError || !customerData) {
      return { success: false, message: "Berechtigungsfehler: Sie können nur für Ihr eigenes Unternehmen Objekte anlegen." };
  }

  const { error } = await supabase
    .from('objects')
    .insert({
      ...data,
      user_id: user.id, // The creator is the logged-in user
      customer_id: customerId, // The object belongs to the customer
    });

  if (error) {
    console.error("Fehler beim Erstellen des Objekts durch Kunden:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/portal/objects");
  return { success: true, message: "Objekt erfolgreich hinzugefügt!" };
}