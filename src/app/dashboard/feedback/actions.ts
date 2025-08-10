"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
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
  const images = formData.getAll('images') as File[];

  if (!message) {
    return { success: false, message: "Eine Nachricht ist erforderlich." };
  }

  let feedbackName = user.email || 'Unbekannter Benutzer';
  let feedbackEmail = user.email;

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

  let uploadedImageUrls: string[] = [];
  if (images.length > 0 && images[0].size > 0) {
    const supabaseAdmin = createAdminClient();
    for (const image of images) {
      const filePath = `general-feedback/${Date.now()}-${image.name}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("feedback-images")
        .upload(filePath, image);

      if (uploadError) {
        console.error("Fehler beim Hochladen des Bildes:", uploadError);
        return { success: false, message: `Fehler beim Hochladen des Bildes: ${uploadError.message}` };
      }

      const { data: urlData } = supabaseAdmin.storage.from("feedback-images").getPublicUrl(filePath);
      if (urlData) {
        // Add a timestamp to the URL to bypass cache
        uploadedImageUrls.push(`${urlData.publicUrl}?t=${new Date().getTime()}`);
      }
    }
  }

  const { error } = await supabase
    .from('general_feedback')
    .insert({
      name: feedbackName,
      email: feedbackEmail,
      subject,
      message,
      image_urls: uploadedImageUrls.length > 0 ? uploadedImageUrls : null,
    });

  if (error) {
    console.error("Fehler beim Erstellen des allgemeinen Feedbacks:", error);
    return { success: false, message: `Fehler beim Speichern des Feedbacks: ${error.message}` };
  }

  revalidatePath("/dashboard/feedback");
  return { success: true, message: "Vielen Dank für Ihr Feedback!" };
}