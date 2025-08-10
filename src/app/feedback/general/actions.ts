"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createGeneralFeedback(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();

  const name = formData.get('name') as string;
  const email = formData.get('email') as string | null;
  const subject = formData.get('subject') as string | null;
  const message = formData.get('message') as string;
  const imageUrls = formData.getAll('imageUrls[]') as string[];

  if (!name || !message) {
    return { success: false, message: "Name und Nachricht sind erforderlich." };
  }

  const { error } = await supabase
    .from('general_feedback')
    .insert({
      name,
      email,
      subject,
      message,
      image_urls: imageUrls.length > 0 ? imageUrls : null,
    });

  if (error) {
    console.error("Fehler beim Erstellen des allgemeinen Feedbacks:", error);
    return { success: false, message: `Fehler beim Speichern des Feedbacks: ${error.message}` };
  }

  revalidatePath("/dashboard/feedback");
  return { success: true, message: "Vielen Dank für Ihr Feedback! Wir werden uns bald bei Ihnen melden." };
}