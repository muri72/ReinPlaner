"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { OrderFormValues } from "@/components/order-form";
import { sendNotification } from "@/lib/actions/notifications";
import { logDataChange } from "@/lib/audit-log";
import { formatDateToYMD } from "@/lib/utils";

export async function createOrder(data: OrderFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const {
    title,
    description,
    status,
    customerId,
    objectId,
    customerContactId,
    orderType,
    startDate,
    priority,
    totalEstimatedHours,
    fixedMonthlyPrice,
    notes,
    serviceType,
    serviceKey,
    markupPercentage,
    customHourlyRate,
    requestStatus,
    assignedEmployees,
    endDate,
  } = data;

  const { data: newOrder, error } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      title,
      description,
      status: status || 'pending',
      customer_id: customerId,
      object_id: objectId,
      customer_contact_id: customerContactId,
      order_type: orderType,
      start_date: formatDateToYMD(startDate),
      priority,
      total_estimated_hours: totalEstimatedHours,
      fixed_monthly_price: fixedMonthlyPrice,
      notes,
      service_type: serviceType,
      service_key: serviceKey,
      markup_percentage: markupPercentage,
      custom_hourly_rate: customHourlyRate,
      request_status: requestStatus,
      end_date: formatDateToYMD(endDate),
    })
    .select('id')
    .single();

  if (error) {
    console.error("Fehler beim Erstellen des Auftrags:", error?.message || error);
    return { success: false, message: error.message };
  }

  // Mitarbeiterzuweisungen speichern
  if (newOrder?.id && assignedEmployees && assignedEmployees.length > 0) {
    const assignmentsToInsert = assignedEmployees.map(assignment => ({
      order_id: newOrder.id,
      employee_id: assignment.employeeId,
      assigned_daily_schedules: assignment.assigned_daily_schedules,
      assigned_recurrence_interval_weeks: assignment.assigned_recurrence_interval_weeks,
      assigned_start_week_offset: assignment.assigned_start_week_offset,
    }));

    const { error: assignError } = await supabase
      .from('order_employee_assignments')
      .insert(assignmentsToInsert);

    if (assignError) {
      console.error("Fehler beim Speichern der Mitarbeiterzuweisungen:", assignError?.message || assignError);
    }
  }

  // Benachrichtigung bei neuer Anfrage
  if (requestStatus === 'pending') {
    const supabaseAdmin = createAdminClient();
    const { data: adminsAndManagers } = await supabaseAdmin.from('profiles').select('id').in('role', ['admin', 'manager']);
    if (adminsAndManagers) {
      for (const admin of adminsAndManagers) {
        await sendNotification({
          userId: admin.id,
          title: "Neuer Auftragsanfrage",
          message: `Eine neue Auftragsanfrage "${title}" wurde erstellt.`,
          link: "/dashboard/orders"
        });
      }
    }
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/planning");
  if (newOrder?.id) {
    revalidatePath(`/dashboard/orders/${newOrder.id}`);
  }

  // Create audit log
  if (newOrder) {
    await logDataChange(
      user.id,
      "INSERT",
      "orders",
      newOrder.id,
      null,
      { title, customerId, objectId, orderType, status }
    );
  }

  return {
    success: true,
    message: "Auftrag erfolgreich hinzugefügt!",
    data: { id: newOrder?.id }
  };
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
    status,
    customerId,
    objectId,
    customerContactId,
    orderType,
    startDate,
    priority,
    totalEstimatedHours,
    fixedMonthlyPrice,
    notes,
    serviceType,
    serviceKey,
    markupPercentage,
    customHourlyRate,
    requestStatus,
    assignedEmployees,
    endDate,
  } = data;

  // Get old order data for audit log
  const { data: oldOrder } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  const { error } = await supabase
    .from('orders')
    .update({
      title: data.title,
      description: data.description,
      status: data.status,
      customer_id: data.customerId,
      object_id: data.objectId,
      customer_contact_id: data.customerContactId,
      order_type: orderType,
      start_date: formatDateToYMD(startDate),
      priority,
      // Handle numeric fields - convert empty/undefined to null
      total_estimated_hours: totalEstimatedHours == null || String(totalEstimatedHours).trim() === "" ? null : Number(totalEstimatedHours),
      fixed_monthly_price: fixedMonthlyPrice == null || String(fixedMonthlyPrice).trim() === "" ? null : Number(fixedMonthlyPrice),
      notes: data.notes,
      service_type: serviceType,
      service_key: serviceKey,
      markup_percentage: markupPercentage == null || String(markupPercentage).trim() === "" ? null : Number(markupPercentage),
      custom_hourly_rate: customHourlyRate == null || String(customHourlyRate).trim() === "" ? null : Number(customHourlyRate),
      request_status: requestStatus,
      end_date: formatDateToYMD(endDate),
    })
    .eq('id', orderId);

  if (error) {
    console.error("Fehler beim Aktualisieren des Auftrags:", error?.message || error);
    return { success: false, message: error.message };
  }

  // Mitarbeiterzuweisungen aktualisieren: Zuerst alle löschen, dann neu einfügen
  const { error: deleteAssignError } = await supabase
    .from('order_employee_assignments')
    .delete()
    .eq('order_id', orderId);

  if (deleteAssignError) {
    console.error("Fehler beim Löschen alter Mitarbeiterzuweisungen:", deleteAssignError?.message || deleteAssignError);
    return { success: false, message: `Fehler beim Aktualisieren der Zuweisungen: ${deleteAssignError.message}` };
  }

  if (assignedEmployees && assignedEmployees.length > 0) {
    const assignmentsToInsert = assignedEmployees.map(assignment => ({
      order_id: orderId,
      employee_id: assignment.employeeId,
      assigned_daily_schedules: assignment.assigned_daily_schedules,
      assigned_recurrence_interval_weeks: assignment.assigned_recurrence_interval_weeks,
      assigned_start_week_offset: assignment.assigned_start_week_offset,
    }));

    const { error: insertAssignError } = await supabase
      .from('order_employee_assignments')
      .insert(assignmentsToInsert);

    if (insertAssignError) {
      console.error("Fehler beim Einfügen neuer Mitarbeiterzuweisungen:", insertAssignError?.message || insertAssignError);
      return { success: false, message: `Fehler beim Aktualisieren der Zuweisungen: ${insertAssignError.message }` };
    }
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/planning");
  revalidatePath(`/dashboard/orders/${orderId}`);

  // Create audit log
  await logDataChange(
    user.id,
    "UPDATE",
    "orders",
    orderId,
    oldOrder,
    { title, customerId, objectId, orderType, status }
  );

  return { success: true, message: "Auftrag erfolgreich aktualisiert!" };
}

export async function deleteOrder(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const orderId = formData.get('orderId') as string;

  // Get order data before deletion for audit log
  const { data: orderToDelete } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

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
  revalidatePath(`/dashboard/orders/${orderId}`);

  // Create audit log
  if (orderToDelete) {
    await logDataChange(
      user.id,
      "DELETE",
      "orders",
      orderId,
      orderToDelete,
      null
    );
  }

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
  
  // Retrieve assigned daily schedules from form data
  const assignedDailySchedulesString = formData.get('assigned_daily_schedules') as string;
  let assignedDailySchedules: any[] = [];
  if (assignedDailySchedulesString) {
    try {
      assignedDailySchedules = JSON.parse(assignedDailySchedulesString);
    } catch (e) {
      console.error("Fehler beim Parsen von assigned_daily_schedules:", e);
      return { success: false, message: "Ungültiges Format für zugewiesene Wochenpläne." };
    }
  }

  // Retrieve recurrence fields
  const assigned_recurrence_interval_weeks = formData.get('assigned_recurrence_interval_weeks') ? Number(formData.get('assigned_recurrence_interval_weeks')) : 1;
  const assigned_start_week_offset = formData.get('assigned_start_week_offset') ? Number(formData.get('assigned_start_week_offset')) : 0;


  if (!orderId || !decision) {
    return { success: false, message: "Ungültige Anfrage." };
  }

  if (decision === 'approved' && !employeeId) {
    return { success: false, message: "Bitte weisen Sie einen Mitarbeiter zu, um den Auftrag zu genehmigen." };
  }

  // Update order request status
  const { error: orderUpdateError } = await supabase
    .from('orders')
    .update({
      request_status: decision,
      status: decision === 'approved' ? 'pending' : 'pending',
    })
    .eq('id', orderId);

  if (orderUpdateError) {
    console.error("Fehler bei der Aktualisierung des Auftragsstatus:", orderUpdateError?.message || orderUpdateError);
    return { success: false, message: orderUpdateError.message };
  }

  // Handle employee assignment in order_employee_assignments table
  if (decision === 'approved' && employeeId) {
    // First, remove any existing assignments for this order
    const { error: deleteAssignmentError } = await supabase
      .from('order_employee_assignments')
      .delete()
      .eq('order_id', orderId);

    if (deleteAssignmentError) {
      console.error("Fehler beim Löschen alter Zuweisungen:", deleteAssignmentError?.message || deleteAssignmentError);
      return { success: false, message: `Fehler bei der Zuweisung: ${deleteAssignmentError.message}` };
    }

    // Then, insert the new assignment with daily schedules
    const { error: insertAssignmentError } = await supabase
      .from('order_employee_assignments')
      .insert({
        order_id: orderId,
        employee_id: employeeId,
        assigned_daily_schedules: assignedDailySchedules,
        assigned_recurrence_interval_weeks,
        assigned_start_week_offset,
      });

    if (insertAssignmentError) {
      console.error("Fehler beim Einfügen neuer Zuweisung:", insertAssignmentError?.message || insertAssignmentError);
      return { success: false, message: `Fehler bei der Zuweisung: ${insertAssignmentError.message}` };
    }

    // Notify employee
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
    } else {
      console.warn(`Could not send notification for order assignment to employee ${employeeId}. User ID or order title missing.`);
    }
  } else if (decision === 'rejected') {
    // If rejected, remove any existing assignments for this order
    const { error: deleteAssignmentError } = await supabase
      .from('order_employee_assignments')
      .delete()
      .eq('order_id', orderId);

    if (deleteAssignmentError) {
      console.error("Fehler beim Löschen von Zuweisungen nach Ablehnung:", deleteAssignmentError?.message || deleteAssignmentError);
    }
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/planning");
  revalidatePath(`/dashboard/orders/${orderId}`);
  return { success: true, message: `Anfrage erfolgreich ${decision === 'approved' ? 'genehmigt' : 'abgelehnt'}!` };
}