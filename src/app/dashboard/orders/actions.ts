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
      request_status: 'approved', // Standardmäßig 'approved' für vom Admin erstellte Aufträge
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
      // request_status wird hier nicht aktualisiert, da dies ein separater Workflow ist
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