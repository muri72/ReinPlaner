"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { OrderFormValues } from "@/components/order-form";

export async function createOrder(data: OrderFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const {
    title,
    description,
    dueDate,
    status,
    customerId,
    objectId,
    employeeId,
    customerContactId,
    orderType,
    recurringStartDate,
    recurringEndDate,
    priority,
    estimatedHours,
    notes,
    serviceType,
    requestStatus,
  } = data;

  const { error } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      title,
      description,
      due_date: dueDate ? dueDate.toISOString() : null,
      status: status || 'pending',
      customer_id: customerId,
      object_id: objectId,
      employee_id: employeeId,
      customer_contact_id: customerContactId,
      order_type: orderType,
      recurring_start_date: recurringStartDate ? recurringStartDate.toISOString().split('T')[0] : null,
      recurring_end_date: recurringEndDate ? recurringEndDate.toISOString().split('T')[0] : null,
      priority,
      estimated_hours: estimatedHours,
      notes,
      service_type: serviceType,
      request_status: requestStatus,
    });

  if (error) {
    console.error("Fehler beim Erstellen des Auftrags:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/orders");
  return { success: true, message: "Auftrag erfolgreich hinzugefügt!" };
}

export async function updateOrder(orderId: string, data: OrderFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { error } = await supabase
    .from('orders')
    .update({
      title: data.title,
      description: data.description,
      due_date: data.dueDate ? data.dueDate.toISOString() : null,
      status: data.status,
      customer_id: data.customerId,
      object_id: data.objectId,
      employee_id: data.employeeId,
      customer_contact_id: data.customerContactId,
      order_type: data.orderType,
      recurring_start_date: data.recurringStartDate ? data.recurringStartDate.toISOString().split('T')[0] : null,
      recurring_end_date: data.recurringEndDate ? data.recurringEndDate.toISOString().split('T')[0] : null,
      priority: data.priority,
      estimated_hours: data.estimatedHours,
      notes: data.notes,
      service_type: data.serviceType,
      request_status: data.requestStatus,
    })
    .eq('id', orderId)
    .eq('user_id', user.id);

  if (error) {
    console.error("Fehler beim Aktualisieren des Auftrags:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/orders");
  return { success: true, message: "Auftrag erfolgreich aktualisiert!" };
}

export async function deleteOrder(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const orderId = formData.get('orderId') as string;

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId)
    .eq('user_id', user.id);

  if (error) {
    console.error("Fehler beim Löschen des Auftrags:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/orders");
  return { success: true, message: "Auftrag erfolgreich gelöscht!" };
}

export async function processOrderRequest(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const orderId = formData.get('orderId') as string;
  const employeeId = formData.get('employeeId') as string | null;
  const decision = formData.get('decision') as 'approved' | 'rejected';

  if (!orderId || !decision) {
    return { success: false, message: "Ungültige Anfrage." };
  }

  if (decision === 'approved' && !employeeId) {
    return { success: false, message: "Bitte weisen Sie einen Mitarbeiter zu, um den Auftrag zu genehmigen." };
  }

  const { error } = await supabase
    .from('orders')
    .update({
      request_status: decision,
      employee_id: decision === 'approved' ? employeeId : null,
      status: decision === 'approved' ? 'pending' : 'pending',
    })
    .eq('id', orderId);

  if (error) {
    console.error("Fehler bei der Bearbeitung der Auftragsanfrage:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/orders");
  return { success: true, message: `Anfrage erfolgreich ${decision === 'approved' ? 'genehmigt' : 'abgelehnt'}!` };
}

export async function createOrderFeedback(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const orderId = formData.get('orderId') as string;
  const rating = Number(formData.get('rating'));
  const comment = formData.get('comment') as string | null;
  const images = formData.getAll('images') as File[];

  if (!orderId || !rating) {
    return { success: false, message: "Auftrags-ID und Bewertung sind erforderlich." };
  }

  let uploadedImageUrls: string[] = [];
  if (images.length > 0 && images[0].size > 0) {
    const supabaseAdmin = await createAdminClient();
    for (const image of images) {
      const filePath = `${orderId}/${Date.now()}-${image.name}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("feedback-images")
        .upload(filePath, image);

      if (uploadError) {
        console.error("Fehler beim Hochladen des Bildes:", uploadError);
        return { success: false, message: `Fehler beim Hochladen des Bildes: ${uploadError.message}` };
      }

      const { data: urlData } = supabaseAdmin.storage.from("feedback-images").getPublicUrl(filePath);
      if (urlData) {
        uploadedImageUrls.push(urlData.publicUrl);
      }
    }
  }

  const { error } = await supabase
    .from('order_feedback')
    .insert({
      order_id: orderId,
      user_id: user.id,
      rating: rating,
      comment: comment,
      image_urls: uploadedImageUrls.length > 0 ? uploadedImageUrls : null,
    });

  if (error) {
    console.error("Fehler beim Erstellen des Feedbacks:", error);
    return { success: false, message: `Fehler beim Speichern des Feedbacks: ${error.message}` };
  }

  revalidatePath("/dashboard/feedback");
  return { success: true, message: "Vielen Dank für Ihr Feedback!" };
}