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
    fixedMonthlyPrice, // Neues Feld
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
      fixed_monthly_price: fixedMonthlyPrice, // Neues Feld
    });

  if (error) {
    console.error("Fehler beim Erstellen des Auftrags:", error);
    return { success: false, message: error.message };
  }

  // Benachrichtigung bei neuer Anfrage
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
  return { success: true, message: "Auftrag erfolgreich hinzugefügt!" };
}

export async function updateOrder(orderId: string, data: OrderFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  // Originalen Auftrag abrufen, um Änderungen zu vergleichen
  const { data: originalOrder } = await supabase.from('orders').select('employee_id, title').eq('id', orderId).single();

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
      fixed_monthly_price: data.fixedMonthlyPrice, // Neues Feld
    })
    .eq('id', orderId);
    // RLS wird die Berechtigungsprüfung für Updates handhaben

  if (error) {
    console.error("Fehler beim Aktualisieren des Auftrags:", error);
    return { success: false, message: error.message };
  }

  // Benachrichtigung bei Mitarbeiterwechsel
  if (originalOrder && originalOrder.employee_id !== data.employeeId && data.employeeId) {
    const supabaseAdmin = createAdminClient();
    const { data: employeeData } = await supabaseAdmin.from('employees').select('user_id').eq('id', data.employeeId).single();
    if (employeeData?.user_id) {
      await sendNotification({
        userId: employeeData.user_id,
        title: "Sie wurden einem Auftrag zugewiesen",
        message: `Sie wurden dem Auftrag "${originalOrder.title}" zugewiesen.`,
        link: "/dashboard/orders"
      });
    }
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
    .eq('id', orderId);
    // RLS wird die Berechtigungsprüfung für Löschungen handhaben

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

  // Benachrichtigung bei Genehmigung
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
  return { success: true, message: `Anfrage erfolgreich ${decision === 'approved' ? 'genehmigt' : 'abgelehnt'}!` };
}