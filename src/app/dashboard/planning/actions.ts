"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

  revalidatePath("/dashboard/planning");
  return { success: true, message: "Auftrag erfolgreich zugewiesen!" };
}