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

  const { title, description, dueDate, status, customerId, objectId, employeeId } = data;

  const { error } = await supabase
    .from('orders') // Tabelle ist jetzt 'orders'
    .insert({
      user_id: user.id,
      title,
      description,
      due_date: dueDate ? dueDate.toISOString() : null,
      status: status || 'pending',
      customer_id: customerId, // Neue Spalte
      object_id: objectId,     // Neue Spalte
      employee_id: employeeId, // Neue Spalte
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
      customer_id: data.customerId, // Neue Spalte
      object_id: data.objectId,     // Neue Spalte
      employee_id: data.employeeId, // Neue Spalte
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