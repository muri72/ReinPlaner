"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { OrderFormValues } from "@/components/order-form"; // Korrigierter Import

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
    customerContactId, // Neues Feld
    orderType,
    recurringStartDate,
    recurringEndDate,
    priority,
    estimatedHours,
    notes,
    serviceType, // Neues Feld
    requestStatus, // Neues Feld
  } = data;

  const { error } = await supabase
    .from('orders') // Tabelle ist jetzt 'orders'
    .insert({
      user_id: user.id,
      title,
      description,
      due_date: dueDate ? dueDate.toISOString() : null,
      status: status || 'pending',
      customer_id: customerId,
      object_id: objectId,
      employee_id: employeeId,
      customer_contact_id: customerContactId, // Neues Feld
      order_type: orderType,
      recurring_start_date: recurringStartDate ? recurringStartDate.toISOString().split('T')[0] : null, // Nur Datum
      recurring_end_date: recurringEndDate ? recurringEndDate.toISOString().split('T')[0] : null,     // Nur Datum
      priority,
      estimated_hours: estimatedHours,
      notes,
      service_type: serviceType, // Neues Feld
      request_status: requestStatus, // Anfragestatus verwenden
    });

  if (error) {
    console.error("Fehler beim Erstellen des Auftrags:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/orders"); // Pfad aktualisiert
  return { success: true, message: "Auftrag erfolgreich hinzugefügt!" };
}

export async function updateOrder(orderId: string, data: OrderFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const { error } = await supabase
    .from('orders') // Tabelle ist jetzt 'orders'
    .update({
      title: data.title,
      description: data.description,
      due_date: data.dueDate ? data.dueDate.toISOString() : null,
      status: data.status,
      customer_id: data.customerId,
      object_id: data.objectId,
      employee_id: data.employeeId,
      customer_contact_id: data.customerContactId, // Neues Feld
      order_type: data.orderType,
      recurring_start_date: data.recurringStartDate ? data.recurringStartDate.toISOString().split('T')[0] : null,
      recurring_end_date: data.recurringEndDate ? data.recurringEndDate.toISOString().split('T')[0] : null,
      priority: data.priority,
      estimated_hours: data.estimatedHours,
      notes: data.notes,
      service_type: data.serviceType, // Neues Feld
      request_status: data.requestStatus, // Anfragestatus aktualisieren
    })
    .eq('id', orderId)
    .eq('user_id', user.id); // Sicherstellen, dass nur eigene Aufträge aktualisiert werden können

  if (error) {
    console.error("Fehler beim Aktualisieren des Auftrags:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/orders"); // Pfad aktualisiert
  return { success: true, message: "Auftrag erfolgreich aktualisiert!" };
}

export async function deleteOrder(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const orderId = formData.get('orderId') as string; // taskId zu orderId

  const { error } = await supabase
    .from('orders') // Tabelle ist jetzt 'orders'
    .delete()
    .eq('id', orderId)
    .eq('user_id', user.id); // Sicherstellen, dass nur eigene Aufträge gelöscht werden können

  if (error) {
    console.error("Fehler beim Löschen des Auftrags:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/orders"); // Pfad aktualisiert
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

  // TODO: Add security check to ensure user is admin or assigned manager

  const { error } = await supabase
    .from('orders')
    .update({
      request_status: decision,
      employee_id: decision === 'approved' ? employeeId : null,
      // When approved, set the main status to 'pending' so it appears in the active orders list
      status: decision === 'approved' ? 'pending' : 'pending', // status remains pending, but request_status changes
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

  const orderId = formData.get('orderId') as string;
  const rating = Number(formData.get('rating'));
  const comment = formData.get('comment') as string | null;
  const imageUrls = formData.getAll('imageUrls[]') as string[];

  if (!orderId || !rating) {
    return { success: false, message: "Auftrags-ID und Bewertung sind erforderlich." };
  }

  // Fetch the original order to get the user_id of the creator
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .select('user_id')
    .eq('id', orderId)
    .single();

  if (orderError || !orderData) {
    return { success: false, message: "Zugehöriger Auftrag konnte nicht gefunden werden." };
  }

  const { error } = await supabase
    .from('order_feedback')
    .insert({
      order_id: orderId,
      user_id: orderData.user_id, // Use the user_id from the original order
      rating: rating,
      comment: comment,
      image_urls: imageUrls.length > 0 ? imageUrls : null,
    });

  if (error) {
    console.error("Fehler beim Erstellen des Feedbacks:", error);
    return { success: false, message: `Fehler beim Speichern des Feedbacks: ${error.message}` };
  }

  revalidatePath("/dashboard/feedback"); // Revalidate the admin feedback page
  return { success: true, message: "Vielen Dank für Ihr Feedback!" };
}