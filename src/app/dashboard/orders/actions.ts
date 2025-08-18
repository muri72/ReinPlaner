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
    assignedEmployeeIds, // Changed from employeeId
    customerContactId,
    orderType,
    recurringStartDate,
    recurringEndDate,
    priority,
    totalEstimatedHours, // Changed from estimatedHours
    notes,
    serviceType,
    requestStatus,
    employeeAssignments, // New field for individual assignments
  } = data;

  const { data: newOrder, error } = await supabase
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
      order_type: orderType,
      recurring_start_date: recurringStartDate ? recurringStartDate.toISOString().split('T')[0] : null,
      recurring_end_date: recurringEndDate ? recurringEndDate.toISOString().split('T')[0] : null,
      priority,
      total_estimated_hours: totalEstimatedHours, // Use new column
      notes,
      service_type: serviceType,
      request_status: requestStatus,
    })
    .select('id')
    .single();

  if (error) {
    console.error("Fehler beim Erstellen des Auftrags:", error?.message || error);
    return { success: false, message: error.message };
  }

  // Insert into order_employee_assignments
  if (newOrder?.id && assignedEmployeeIds && assignedEmployeeIds.length > 0) {
    const assignmentsToInsert = assignedEmployeeIds.map(empId => {
      const individualAssignment = employeeAssignments?.find(ea => ea.employeeId === empId);
      return {
        order_id: newOrder.id,
        employee_id: empId,
        assigned_daily_hours: individualAssignment?.assignedDailyHours || null,
      };
    });

    const { error: assignmentsError } = await supabase
      .from('order_employee_assignments')
      .insert(assignmentsToInsert);

    if (assignmentsError) {
      console.error("Fehler beim Zuweisen von Mitarbeitern zum Auftrag:", assignmentsError?.message || assignmentsError);
      // Decide if this error should roll back the order creation or just log
      // For now, we'll just log and return success for the order itself.
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
          title: "Neue Auftragsanfrage",
          message: `Eine neue Auftragsanfrage "${title}" wurde erstellt.`,
          link: "/dashboard/orders"
        });
      }
    }
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/planning"); // Revalidate planning page
  revalidatePath("/employee/dashboard"); // Revalidate employee dashboard
  revalidatePath("/dashboard"); // Revalidate main dashboard
  return { success: true, message: "Auftrag erfolgreich hinzugefügt!" };
}

export async function updateOrder(orderId: string, data: OrderFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  // Originalen Auftrag abrufen, um Änderungen zu vergleichen
  const { data: originalOrder } = await supabase
    .from('orders')
    .select('title')
    .eq('id', orderId)
    .single();

  // Fetch original assignments to detect changes
  const { data: originalAssignments, error: originalAssignmentsError } = await supabase
    .from('order_employee_assignments')
    .select('employee_id, assigned_daily_hours') // Fixed: Select assigned_daily_hours
    .eq('order_id', orderId);
  
  if (originalAssignmentsError) {
    console.error("Fehler beim Abrufen der ursprünglichen Zuweisungen:", originalAssignmentsError);
    return { success: false, message: "Fehler beim Aktualisieren des Auftrags: konnte ursprüngliche Zuweisungen nicht abrufen." };
  }

  const originalEmployeeIds = originalAssignments?.map(a => a.employee_id) || [];

  const { error } = await supabase
    .from('orders')
    .update({
      title: data.title,
      description: data.description,
      due_date: data.dueDate ? data.dueDate.toISOString() : null,
      status: data.status,
      customer_id: data.customerId,
      object_id: data.objectId,
      customer_contact_id: data.customerContactId,
      order_type: data.orderType,
      recurring_start_date: data.recurringStartDate ? data.recurringStartDate.toISOString().split('T')[0] : null,
      recurring_end_date: data.recurringEndDate ? data.recurringEndDate.toISOString().split('T')[0] : null,
      priority: data.priority,
      total_estimated_hours: data.totalEstimatedHours, // Use new column
      notes: data.notes,
      service_type: data.serviceType,
      request_status: data.requestStatus,
    })
    .eq('id', orderId);
    // RLS wird die Berechtigungsprüfung für Updates handhaben

  if (error) {
    console.error("Fehler beim Aktualisieren des Auftrags:", error?.message || error);
    return { success: false, message: error.message };
  }

  // Update order_employee_assignments
  const newAssignedEmployeeIds = data.assignedEmployeeIds || [];
  const assignmentsToInsert = [];
  const assignmentsToDelete = [];
  const assignmentsToUpdate = [];

  const supabaseAdmin = createAdminClient(); // Use admin client for assignments management

  // Determine which assignments to delete (removed employees)
  for (const oldEmpId of originalEmployeeIds) {
    if (!newAssignedEmployeeIds.includes(oldEmpId)) {
      assignmentsToDelete.push(oldEmpId);
    }
  }

  // Determine which assignments to insert or update (new or existing employees)
  for (const newEmpId of newAssignedEmployeeIds) {
    const individualAssignment = data.employeeAssignments?.find(ea => ea.employeeId === newEmpId);
    const assignedDailyHours = individualAssignment?.assignedDailyHours || null;

    if (!originalEmployeeIds.includes(newEmpId)) {
      // New assignment
      assignmentsToInsert.push({
        order_id: orderId,
        employee_id: newEmpId,
        assigned_daily_hours: assignedDailyHours,
      });
    } else {
      // Existing assignment, check if assigned_daily_hours changed
      const originalIndividualAssignment = originalAssignments?.find(a => a.employee_id === newEmpId);
      if (originalIndividualAssignment?.assigned_daily_hours !== assignedDailyHours) { // Fixed: Property now exists
        assignmentsToUpdate.push({
          order_id: orderId,
          employee_id: newEmpId,
          assigned_daily_hours: assignedDailyHours,
        });
      }
    }
  }

  // Execute deletions
  if (assignmentsToDelete.length > 0) {
    const { error: deleteAssignmentsError } = await supabaseAdmin
      .from('order_employee_assignments')
      .delete()
      .eq('order_id', orderId)
      .in('employee_id', assignmentsToDelete);
    if (deleteAssignmentsError) console.error("Fehler beim Löschen von Mitarbeiterzuweisungen:", deleteAssignmentsError?.message || deleteAssignmentsError);
  }

  // Execute insertions
  if (assignmentsToInsert.length > 0) {
    const { error: insertAssignmentsError } = await supabaseAdmin
      .from('order_employee_assignments')
      .insert(assignmentsToInsert);
    if (insertAssignmentsError) console.error("Fehler beim Einfügen neuer Mitarbeiterzuweisungen:", insertAssignmentsError?.message || insertAssignmentsError);
  }

  // Execute updates
  for (const assignment of assignmentsToUpdate) {
    const { error: updateAssignmentError } = await supabaseAdmin
      .from('order_employee_assignments')
      .update({ assigned_daily_hours: assignment.assigned_daily_hours })
      .eq('order_id', assignment.order_id)
      .eq('employee_id', assignment.employee_id);
    if (updateAssignmentError) console.error("Fehler beim Aktualisieren von Mitarbeiterzuweisungen:", updateAssignmentError?.message || updateAssignmentError);
  }

  // Notify employees about changes in their assignments
  const allAffectedEmployeeIds = new Set([...originalEmployeeIds, ...newAssignedEmployeeIds]);
  for (const empId of Array.from(allAffectedEmployeeIds)) {
    const { data: employeeData } = await supabaseAdmin.from('employees').select('user_id').eq('id', empId).single();
    if (employeeData?.user_id) {
      await sendNotification({
        userId: employeeData.user_id,
        title: "Auftragszuweisung aktualisiert",
        message: `Die Zuweisung für den Auftrag "${originalOrder?.title}" wurde aktualisiert.`,
        link: "/employee/dashboard"
      });
    }
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/planning"); // Revalidate planning page
  revalidatePath("/employee/dashboard"); // Revalidate employee dashboard
  revalidatePath("/dashboard"); // Revalidate main dashboard
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
    console.error("Fehler beim Löschen des Auftrags:", error?.message || error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/planning"); // Revalidate planning page
  revalidatePath("/employee/dashboard"); // Revalidate employee dashboard
  revalidatePath("/dashboard"); // Revalidate main dashboard
  return { success: true, message: "Auftrag erfolgreich gelöscht!" };
}

export async function processOrderRequest(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  const orderId = formData.get('orderId') as string;
  const employeeId = formData.get('employeeId') as string | null; // This is now for initial assignment
  const decision = formData.get('decision') as 'approved' | 'rejected';

  if (!orderId || !decision) {
    return { success: false, message: "Ungültige Anfrage." };
  }

  if (decision === 'approved' && !employeeId) {
    return { success: false, message: "Bitte weisen Sie einen Mitarbeiter zu, um den Auftrag zu genehmigen." };
  }

  // Update the order's request_status
  const { error: orderUpdateError } = await supabase
    .from('orders')
    .update({
      request_status: decision,
      status: decision === 'approved' ? 'pending' : 'pending', // Keep status pending for approved requests
    })
    .eq('id', orderId);

  if (orderUpdateError) {
    console.error("Fehler bei der Bearbeitung der Auftragsanfrage:", orderUpdateError?.message || orderUpdateError);
    return { success: false, message: orderUpdateError.message };
  }

  // If approved, create an entry in order_employee_assignments
  if (decision === 'approved' && employeeId) {
    const { error: assignmentError } = await supabase
      .from('order_employee_assignments')
      .insert({
        order_id: orderId,
        employee_id: employeeId,
        // assigned_daily_hours can be null, implying equal distribution or default
      });

    if (assignmentError) {
      console.error("Fehler beim Zuweisen des Mitarbeiters zur Anfrage:", assignmentError?.message || assignmentError);
      // Decide if this error should revert the order status update
      // For now, we'll just log and proceed.
    }

    const supabaseAdmin = createAdminClient();
    const { data: employeeData } = await supabaseAdmin.from('employees').select('user_id').eq('id', employeeId).single();
    const { data: orderData } = await supabaseAdmin.from('orders').select('title').eq('id', orderId).single();

    if (employeeData?.user_id && orderData) {
      await sendNotification({
        userId: employeeData.user_id,
        title: "Auftrag genehmigt & zugewiesen",
        message: `Die Anfrage für "${orderData.title}" wurde genehmigt und Ihnen zugewiesen.`,
        link: "/employee/dashboard"
      });
    }
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/planning"); // Revalidate planning page
  revalidatePath("/employee/dashboard"); // Revalidate employee dashboard
  revalidatePath("/dashboard"); // Revalidate main dashboard
  return { success: true, message: `Anfrage erfolgreich ${decision === 'approved' ? 'genehmigt' : 'abgelehnt'}!` };
}