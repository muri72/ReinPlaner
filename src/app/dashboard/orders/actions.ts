"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { OrderFormValues } from "@/components/order-form";
import { sendNotification } from "@/lib/actions/notifications";

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
    customerContactId,
    employeeId, // Simplified
    orderType,
    recurringStartDate,
    recurringEndDate,
    priority,
    totalEstimatedHours,
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
      customer_contact_id: customerContactId,
      employee_id: employeeId, // Simplified
      order_type: orderType,
      recurring_start_date: recurringStartDate ? recurringStartDate.toISOString().split('T')[0] : null,
      recurring_end_date: recurringEndDate ? recurringEndDate.toISOString().split('T')[0] : null,
      priority,
      total_estimated_hours: totalEstimatedHours,
      notes,
      service_type: serviceType,
      request_status: requestStatus,
    });

  if (error) {
    console.error("Fehler beim Erstellen des Auftrags:", error?.message || error);
    return { success: false, message: error.message };
  }

  if (requestStatus === 'pending') {
    const supabaseAdmin = createAdminClient();
    const { data: adminsAndManagers } = await supabaseAdmin.from('profiles').select('id').in('role', ['admin', 'manager']);
    if (adminsAndManagers) {
      for (const admin of adminsAndManagers) {
        await sendNotification({
          userId: admin.id,
          title: "Neue Auftragsanfrage",
          message: `Eine neue Auftragsanfrage "${title}" wurde erstellt.`,
          link: "/dashboard/orders"
        });
      }
    }
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/planning");
  return { success: true, message: "Auftrag erfolgreich hinzugefügt!" };
}

export async function updateOrder(orderId: string, data: OrderFormValues) {
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
    customerContactId,
    employeeId, // Simplified
    orderType,
    recurringStartDate,
    recurringEndDate,
    priority,
    totalEstimatedHours,
    notes,
    serviceType,
    requestStatus,
  } = data;

  const { error } = await supabase
    .from('orders')
    .update({
      title,
      description,
      due_date: dueDate ? dueDate.toISOString() : null,
      status,
      customer_id: customerId,
      object_id: objectId,
      customer_contact_id: customerContactId,
      employee_id: employeeId, // Simplified
      order_type: orderType,
      recurring_start_date: recurringStartDate ? recurringStartDate.toISOString().split('T')[0] : null,
      recurring_end_date: recurringEndDate ? recurringEndDate.toISOString().split('T')[0] : null,
      priority,
      total_estimated_hours: totalEstimatedHours,
      notes,
      service_type: serviceType,
      request_status: requestStatus,
    })
    .eq('id', orderId);

  if (error) {
    console.error("Fehler beim Aktualisieren des Auftrags:", error?.message || error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/planning");
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
    .eq('id', orderId);

  if (error) {
    console.error("Fehler beim Löschen des Auftrags:", error?.message || error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/planning");
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

  const { error: orderUpdateError } = await supabase
    .from('orders')
    .update({
      request_status: decision,
      status: decision === 'approved' ? 'pending' : 'pending',
      employee_id: decision === 'approved' ? employeeId : null,
    })
    .eq('id', orderId);

  if (orderUpdateError) {
    console.error("Fehler bei der Aktualisierung des Auftragsstatus:", orderUpdateError?.message || orderUpdateError);
    return { success: false, message: orderUpdateError.message };
  }

  if (decision === 'approved' && employeeId) {
    const supabaseAdmin = createAdminClient();
    const { data: employeeData } = await supabaseAdmin.from('employees').select('user_id').eq('id', employeeId).single();
    const { data: orderData } = await supabaseAdmin.from('orders').select('title').eq('id', orderId).single();

    if (employeeData?.user_id && orderData) {
      await sendNotification({
        userId: employeeData.user_id,
        title: "Auftrag genehmigt & zugewiesen",
        message: `Die Anfrage für "${orderData.title}" wurde genehmigt und Ihnen zugewiesen.`,
        link: "/dashboard/orders"
      });
    }
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/planning");
  return { success: true, message: `Anfrage erfolgreich ${decision === 'approved' ? 'genehmigt' : 'abgelehnt'}!` };
}