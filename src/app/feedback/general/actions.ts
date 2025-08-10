"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createGeneralFeedback(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient(); // For inserting the text data
  const supabaseAdmin = createAdminClient(); // For uploading files with admin rights

  const name = formData.get('name') as string;
  const email = formData.get('email') as string | null;
  const subject = formData.get('subject') as string | null;
  const message = formData.get('message') as string;
  const images = formData.getAll('images') as File[];

  if (!name || !message) {
    return { success: false, message: "Name und Nachricht sind erforderlich." };
  }

  let uploadedImageUrls: string[] = [];
  if (images.length > 0 && images[0].size > 0) {
    for (const image of images) {
      const filePath = `general-feedback/${Date.now()}-${image.name}`;
      // Use the admin client for the upload
      const { error: uploadError } = await supabaseAdmin.storage
        .from("feedback-images")
        .upload(filePath, image);

      if (uploadError) {
        console.error("Fehler beim Hochladen des Bildes:", uploadError);
        return { success: false, message: `Fehler beim Hochladen des Bildes: ${uploadError.message}` };
      }

      // Use the admin client to get the public URL
      const { data: urlData } = supabaseAdmin.storage.from("feedback-images").getPublicUrl(filePath);
      if (urlData) {
        uploadedImageUrls.push(urlData.publicUrl);
      }
    }
  }

  const { error } = await supabase
    .from('general_feedback')
    .insert({
      name,
      email,
      subject,
      message,
      image_urls: uploadedImageUrls.length > 0 ? uploadedImageUrls : null,
    });

  if (error) {
    console.error("Fehler beim Erstellen des allgemeinen Feedbacks:", error);
    return { success: false, message: `Fehler beim Speichern des Feedbacks: ${error.message}` };
  }

  revalidatePath("/dashboard/feedback");
  return { success: true, message: "Vielen Dank für Ihr Feedback! Wir werden uns bald bei Ihnen melden." };
}