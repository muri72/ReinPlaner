"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createGeneralDashboardFeedback(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const customerId = formData.get('customerId') as string | null;
  const subject = formData.get('subject') as string | null;
  const message = formData.get('message') as string;
  const imageUrls = formData.getAll('imageUrls[]') as string[];

  if (!message) {
    return { success: false, message: "Eine Nachricht ist erforderlich." };
  }

  let feedbackName = user.email || 'Unbekannter Benutzer';
  let feedbackEmail = user.email;

  // If an admin is submitting on behalf of a customer, get that customer's details
  if (customerId) {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('name, contact_email')
      .eq('id', customerId)
      .single();
    
    if (customerError || !customer) {
      return { success: false, message: "Ausgewählter Kunde konnte nicht gefunden werden." };
    }
    feedbackName = customer.name;
    feedbackEmail = customer.contact_email || null;
  }

  const { error } = await supabase
    .from('general_feedback')
    .insert({
      name: feedbackName,
      email: feedbackEmail,
      subject,
      message,
      image_urls: imageUrls.length > 0 ? imageUrls : null,
    });

  if (error) {
    console.error("Fehler beim Erstellen des allgemeinen Feedbacks:", error);
    return { success: false, message: `Fehler beim Speichern des Feedbacks: ${error.message}` };
  }

  revalidatePath("/dashboard/feedback");
  return { success: true, message: "Vielen Dank für Ihr Feedback!" };
}