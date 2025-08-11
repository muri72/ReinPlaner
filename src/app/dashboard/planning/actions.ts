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
  
  // TODO: Add role check for admin/manager to ensure only authorized users can assign.

  const { error } = await supabase
    .from('orders')
    .update({
      employee_id: employeeId,
      due_date: date, // Set the due date to the day it was dropped on
      status: 'pending', // Ensure status is set to pending so it appears in workload
    })
    .eq('id', orderId);

  if (error) {
    console.error("Fehler beim Zuweisen des Auftrags:", error);
    return { success: false, message: `Fehler beim Zuweisen: ${error.message}` };
  }

  // --- Benachrichtigungslogik ---
  const supabaseAdmin = createAdminClient();
  const { data: employeeData } = await supabaseAdmin.from('employees').select('user_id').eq('id', employeeId).single();
  const { data: orderData } = await supabaseAdmin.from('orders').select('title').eq('id', orderId).single();

  if (employeeData?.user_id && orderData) {
    await sendNotification({
      userId: employeeData.user_id,
      title: "Neuer Auftrag zugewiesen",
      message: `Ihnen wurde der Auftrag "${orderData.title}" zugewiesen.`,
      link: "/dashboard/orders"
    });
  }
  // --- Ende Benachrichtigungslogik ---

  revalidatePath("/dashboard/planning");
  return { success: true, message: "Auftrag erfolgreich zugewiesen!" };
}