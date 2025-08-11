"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from 'uuid';

// --- ORDER FEEDBACK ACTIONS ---

// This is a new helper action to securely generate upload URLs on the server.
// The client will use these URLs to upload files directly to Supabase Storage.
export async function generateSignedUploadUrls(
  feedbackType: 'order' | 'general',
  referenceId: string,
  files: { name: string; type: string }[]
): Promise<{ success: boolean; message: string; uploads?: { signedUrl: string; publicUrl: string }[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const supabaseAdmin = createAdminClient();
  const uploads: { signedUrl: string; publicUrl: string }[] = [];

  for (const file of files) {
    const folder = feedbackType === 'order' ? referenceId : 'general-feedback';
    // Create a unique path for each file to prevent overwrites
    const filePath = `${folder}/${uuidv4()}-${file.name}`;

    const { data, error } = await supabaseAdmin.storage
      .from("feedback-images")
      .createSignedUploadUrl(filePath);

    if (error) {
      console.error("Fehler beim Erstellen der Signed URL:", error);
      return { success: false, message: `Fehler beim Erstellen der Upload-URL: ${error.message}` };
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from("feedback-images").getPublicUrl(filePath);
    
    uploads.push({
      signedUrl: data.signedUrl,
      publicUrl: publicUrlData.publicUrl,
    });
  }

  return { success: true, message: "Upload-URLs erfolgreich erstellt.", uploads };
}


// The create action now only receives the final data, not the files themselves.
export async function createOrderFeedback(data: {
  orderId: string;
  rating: number;
  comment: string | null;
  imageUrls: string[];
}): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { orderId, rating, comment, imageUrls } = data;

  if (!orderId || !rating) {
    return { success: false, message: "Auftrags-ID und Bewertung sind erforderlich." };
  }

  const { error } = await supabase
    .from('order_feedback')
    .insert({
      order_id: orderId,
      user_id: user.id,
      rating: rating,
      comment: comment,
      image_urls: imageUrls.length > 0 ? imageUrls : null,
    });

  if (error) {
    console.error("Fehler beim Erstellen des Feedbacks:", error);
    return { success: false, message: `Fehler beim Speichern des Feedbacks: ${error.message}` };
  }

  revalidatePath("/dashboard/feedback");
  return { success: true, message: "Vielen Dank für Ihr Feedback!" };
}

export async function updateOrderFeedback(feedbackId: string, formData: FormData): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    const rating = Number(formData.get('rating'));
    const comment = formData.get('comment') as string | null;

    const { error } = await supabase
        .from('order_feedback')
        .update({
            rating,
            comment,
        })
        .eq('id', feedbackId);

    if (error) {
        console.error("Fehler beim Aktualisieren des Feedbacks:", error);
        return { success: false, message: `Fehler: ${error.message}` };
    }

    revalidatePath("/dashboard/feedback");
    return { success: true, message: "Feedback erfolgreich aktualisiert." };
}

export async function replyToOrderFeedback(feedbackId: string, replyText: string): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { error } = await supabase
    .from('order_feedback')
    .update({
      reply: replyText,
      replied_by: user.id,
      replied_at: new Date().toISOString(),
    })
    .eq('id', feedbackId);

  if (error) {
    console.error("Fehler beim Antworten auf Feedback:", error);
    return { success: false, message: `Fehler: ${error.message}` };
  }

  revalidatePath("/dashboard/feedback");
  return { success: true, message: "Antwort erfolgreich gesendet." };
}

export async function deleteOrderFeedback(feedbackId: string): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient();
    const { error } = await supabase.from('order_feedback').delete().eq('id', feedbackId);

    if (error) {
        console.error("Fehler beim Löschen des Feedbacks:", error);
        return { success: false, message: `Fehler: ${error.message}` };
    }

    revalidatePath("/dashboard/feedback");
    return { success: true, message: "Feedback erfolgreich gelöscht." };
}


// --- GENERAL FEEDBACK ACTIONS ---

export async function createGeneralFeedback(data: {
  customerId: string | null;
  subject: string | null;
  message: string;
  imageUrls: string[];
}): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { customerId, subject, message, imageUrls } = data;

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

  const { error } = await supabase
    .from('general_feedback')
    .insert({
      user_id: user.id,
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

export async function updateGeneralFeedback(feedbackId: string, formData: FormData): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    const subject = formData.get('subject') as string | null;
    const message = formData.get('message') as string;

    const { error } = await supabase
        .from('general_feedback')
        .update({
            subject,
            message,
        })
        .eq('id', feedbackId);

    if (error) {
        console.error("Fehler beim Aktualisieren des Feedbacks:", error);
        return { success: false, message: `Fehler: ${error.message}` };
    }

    revalidatePath("/dashboard/feedback");
    return { success: true, message: "Feedback erfolgreich aktualisiert." };
}

export async function replyToGeneralFeedback(feedbackId: string, replyText: string): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { error } = await supabase
    .from('general_feedback')
    .update({
      reply: replyText,
      replied_by: user.id,
      replied_at: new Date().toISOString(),
    })
    .eq('id', feedbackId);

  if (error) {
    console.error("Fehler beim Antworten auf Feedback:", error);
    return { success: false, message: `Fehler: ${error.message}` };
  }

  revalidatePath("/dashboard/feedback");
  return { success: true, message: "Antwort erfolgreich gesendet." };
}

export async function deleteGeneralFeedback(feedbackId: string): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient();
    const { error } = await supabase.from('general_feedback').delete().eq('id', feedbackId);

    if (error) {
        console.error("Fehler beim Löschen des Feedbacks:", error);
        return { success: false, message: `Fehler: ${error.message}` };
    }

    revalidatePath("/dashboard/feedback");
    return { success: true, message: "Feedback erfolgreich gelöscht." };
}