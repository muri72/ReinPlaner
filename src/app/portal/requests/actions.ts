"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createServiceRequest(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const serviceType = formData.get('serviceType') as string;
  const objectId = formData.get('objectId') as string;
  const description = formData.get('description') as string;
  const customerId = formData.get('customerId') as string;
  const customerContactId = formData.get('customerContactId') as string | null;

  const title = `Anfrage: ${serviceType}`;

  const { error } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      title,
      description,
      service_type: serviceType,
      object_id: objectId,
      customer_id: customerId,
      customer_contact_id: customerContactId,
      status: 'pending', // Main status
      request_status: 'pending', // Specific request status
      order_type: 'one_time', // Requests are typically one-time
      priority: 'medium',
    });

  if (error) {
    console.error("Fehler beim Erstellen der Service-Anfrage:", error);
    return { success: false, message: `Fehler: ${error.message}` };
  }

  revalidatePath("/portal/dashboard");
  return { success: true, message: "Ihre Anfrage wurde erfolgreich übermittelt! Wir werden uns in Kürze bei Ihnen melden." };
}