"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendNotification } from "@/lib/actions/notifications";

export async function assignOrderToEmployee(orderId: string, employeeId: string, date: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }
  
  // Check if the current user is an admin or manager
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || (profile?.role !== 'admin' && profile?.role !== 'manager')) {
    console.error("Berechtigungsfehler:", profileError?.message || profileError);
    return { success: false, message: "Nicht autorisiert. Nur Admins oder Manager können Aufträge zuweisen." };
  }

  const supabaseAdmin = createAdminClient();

  // First, check if this employee is already assigned to this order
  const { data: existingAssignment, error: checkError } = await supabaseAdmin
    .from('order_employee_assignments')
    .select('id')
    .eq('order_id', orderId)
    .eq('employee_id', employeeId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
    console.error("Fehler beim Prüfen bestehender Zuweisung:", checkError?.message || checkError);
    return { success: false, message: `Fehler beim Zuweisen: ${checkError.message}` };
  }

  if (existingAssignment) {
    return { success: false, message: "Dieser Mitarbeiter ist diesem Auftrag bereits zugewiesen." };
  }

  // Create the new assignment
  const { error: assignError } = await supabaseAdmin
    .from('order_employee_assignments')
    .insert({
      order_id: orderId,
      employee_id: employeeId,
      // assigned_daily_hours can be null, implying equal distribution or default
    });

  if (assignError) {
    console.error("Fehler beim Zuweisen des Auftrags:", assignError?.message || assignError);
    return { success: false, message: `Fehler beim Zuweisen: ${assignError.message}` };
  }

  // Update the order's due_date and status if it's a one-time order being assigned
  const { data: orderDetails, error: orderDetailsError } = await supabaseAdmin
    .from('orders')
    .select('order_type, status, title')
    .eq('id', orderId)
    .single();

  if (orderDetailsError) {
    console.error("Fehler beim Abrufen der Auftragsdetails:", orderDetailsError?.message || orderDetailsError);
    // Continue, as assignment was successful
  } else if (orderDetails) {
    const updateData: { due_date?: string; status?: string } = {};
    if (orderDetails.order_type === 'one_time') {
      updateData.due_date = date; // Set the due date to the day it was dropped on
    }
    if (orderDetails.status === 'pending') { // Only change status if it's still pending
      updateData.status = 'in_progress'; // Set status to in_progress once assigned
    }

    if (Object.keys(updateData).length > 0) {
      const { error: orderUpdateError } = await supabaseAdmin
        .from('orders')
        .update(updateData)
        .eq('id', orderId);
      if (orderUpdateError) {
        console.error("Fehler beim Aktualisieren des Auftragsstatus/Fälligkeitsdatums:", orderUpdateError?.message || orderUpdateError);
      }
    }
  }

  // --- Benachrichtigungslogik ---
  const { data: employeeData } = await supabaseAdmin.from('employees').select('user_id').eq('id', employeeId).single();
  const { data: orderData } = await supabaseAdmin.from('orders').select('title').eq('id', orderId).single();

  if (employeeData?.user_id && orderData) {
    await sendNotification({
      userId: employeeData.user_id,
      title: "Neuer Auftrag zugewiesen",
      message: `Ihnen wurde der Auftrag "${orderData.title}" zugewiesen.`,
      link: "/employee/dashboard"
    });
  }
  // --- Ende Benachrichtigungslogik ---

  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard/orders"); // Revalidate orders page
  revalidatePath("/employee/dashboard"); // Revalidate employee dashboard
  return { success: true, message: "Auftrag erfolgreich zugewiesen!" };
}