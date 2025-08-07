"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server"; // Importiere createAdminClient
import { revalidatePath } from "next/cache";
import { UserFormValues } from "@/components/user-form";

export async function registerUser(data: UserFormValues) {
  const supabase = await createClient(); // Für die Überprüfung des aktuellen Benutzers
  const { data: { user: adminUser } } = await supabase.auth.getUser();

  if (!adminUser) {
    return { success: false, message: "Nicht autorisiert. Nur Admins können Benutzer registrieren." };
  }

  // Überprüfen, ob der aktuelle Benutzer ein Admin ist (später durch RLS ersetzt)
  const { data: adminProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', adminUser.id)
    .single();

  if (profileError || adminProfile?.role !== 'admin') {
    console.error("Berechtigungsfehler:", profileError);
    return { success: false, message: "Nicht autorisiert. Nur Admins können Benutzer registrieren." };
  }

  const { email, password, firstName, lastName, role } = data;

  if (!password) {
    return { success: false, message: "Passwort ist für die Registrierung erforderlich." };
  }

  // Benutzer in Supabase Auth registrieren
  const supabaseAdmin = await createAdminClient(); // Verwende den Admin Client
  const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Bestätigt die E-Mail automatisch
    user_metadata: { first_name: firstName, last_name: lastName },
  });

  if (authError) {
    console.error("Fehler bei der Benutzerregistrierung:", authError);
    return { success: false, message: authError.message };
  }

  // Profil in der profiles-Tabelle aktualisieren (handle_new_user Trigger sollte dies bereits tun,
  // aber wir stellen sicher, dass die Rolle gesetzt wird, falls der Trigger sie nicht setzt oder überschreibt)
  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({ first_name: firstName, last_name: lastName, role: role })
    .eq('id', newUser.user?.id);

  if (profileUpdateError) {
    console.error("Fehler beim Aktualisieren des Benutzerprofils:", profileUpdateError);
    // Optional: Benutzer in Auth löschen, wenn Profil-Update fehlschlägt
    await supabaseAdmin.auth.admin.deleteUser(newUser.user?.id!); // Verwende den Admin Client
    return { success: false, message: profileUpdateError.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true, message: "Benutzer erfolgreich registriert und Rolle zugewiesen!" };
}

export async function updateUser(userId: string, data: Partial<UserFormValues>) {
  const supabase = await createClient(); // Für die Überprüfung des aktuellen Benutzers
  const { data: { user: adminUser } } = await supabase.auth.getUser();

  if (!adminUser) {
    return { success: false, message: "Nicht autorisiert." };
  }

  // Überprüfen, ob der aktuelle Benutzer ein Admin ist
  const { data: adminProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', adminUser.id)
    .single();

  if (profileError || adminProfile?.role !== 'admin') {
    console.error("Berechtigungsfehler:", profileError);
    return { success: false, message: "Nicht autorisiert. Nur Admins können Benutzer aktualisieren." };
  }

  const { firstName, lastName, role } = data;

  // Aktualisiere das Profil in der profiles-Tabelle
  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({ first_name: firstName, last_name: lastName, role: role, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (profileUpdateError) {
    console.error("Fehler beim Aktualisieren des Benutzerprofils:", profileUpdateError);
    return { success: false, message: profileUpdateError.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true, message: "Benutzerprofil erfolgreich aktualisiert!" };
}

export async function deleteUser(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient(); // Für die Überprüfung des aktuellen Benutzers
  const { data: { user: adminUser } } = await supabase.auth.getUser();

  if (!adminUser) {
    return { success: false, message: "Nicht autorisiert." };
  }

  // Überprüfen, ob der aktuelle Benutzer ein Admin ist
  const { data: adminProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', adminUser.id)
    .single();

  if (profileError || adminProfile?.role !== 'admin') {
    console.error("Berechtigungsfehler:", profileError);
    return { success: false, message: "Nicht autorisiert. Nur Admins können Benutzer löschen." };
  }

  const userId = formData.get('userId') as string;

  if (userId === adminUser.id) {
    return { success: false, message: "Sie können Ihr eigenes Benutzerkonto nicht löschen." };
  }

  // Benutzer in Supabase Auth löschen (dies löscht auch das Profil aufgrund der CASCADE-Regel)
  const supabaseAdmin = await createAdminClient(); // Verwende den Admin Client
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    console.error("Fehler beim Löschen des Benutzers:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/users");
  return { success: true, message: "Benutzer erfolgreich gelöscht!" };
}

export async function assignCustomersToManager(managerId: string, customerIds: string[]): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient(); // Für die Überprüfung des aktuellen Benutzers
  const { data: { user: adminUser } } = await supabase.auth.getUser();

  if (!adminUser) {
    return { success: false, message: "Nicht autorisiert. Nur Admins können Zuweisungen vornehmen." };
  }

  // Überprüfen, ob der aktuelle Benutzer ein Admin ist
  const { data: adminProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', adminUser.id)
    .single();

  if (profileError || adminProfile?.role !== 'admin') {
    console.error("Berechtigungsfehler:", profileError);
    return { success: false, message: "Nicht autorisiert. Nur Admins können Zuweisungen vornehmen." };
  }

  // Transaktion starten (oder simulieren, da Server Actions keine echten Transaktionen unterstützen)
  // Zuerst alle bestehenden Zuweisungen für diesen Manager löschen
  const { error: deleteError } = await supabase
    .from('manager_customer_assignments')
    .delete()
    .eq('manager_id', managerId);

  if (deleteError) {
    console.error("Fehler beim Löschen alter Zuweisungen:", deleteError);
    return { success: false, message: `Fehler beim Aktualisieren der Zuweisungen: ${deleteError.message}` };
  }

  // Dann die neuen Zuweisungen einfügen, falls vorhanden
  if (customerIds.length > 0) {
    const assignmentsToInsert = customerIds.map(cId => ({
      manager_id: managerId,
      customer_id: cId,
    }));

    const { error: insertError } = await supabase
      .from('manager_customer_assignments')
      .insert(assignmentsToInsert);

    if (insertError) {
      console.error("Fehler beim Einfügen neuer Zuweisungen:", insertError);
      return { success: false, message: `Fehler beim Aktualisieren der Zuweisungen: ${insertError.message}` };
    }
  }

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/customers"); // Revalidiere auch Kunden, da sich deren Sichtbarkeit ändern könnte
  revalidatePath("/dashboard/objects");   // Revalidiere auch Objekte
  revalidatePath("/dashboard/orders");    // Revalidiere auch Aufträge
  revalidatePath("/dashboard/customer-contacts"); // Revalidiere auch Kundenkontakte

  return { success: true, message: "Kundenzuweisungen erfolgreich aktualisiert!" };
}

export async function assignUserToEntity(
  userId: string,
  employeeId: string | null | undefined,
  customerId: string | null | undefined
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: { user: adminUser } } = await supabase.auth.getUser();

  if (!adminUser) {
    return { success: false, message: "Nicht autorisiert. Nur Admins können Zuweisungen vornehmen." };
  }

  const { data: adminProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', adminUser.id)
    .single();

  if (profileError || adminProfile?.role !== 'admin') {
    console.error("Berechtigungsfehler:", profileError);
    return { success: false, message: "Nicht autorisiert. Nur Admins können Zuweisungen vornehmen." };
  }

  const supabaseAdmin = await createAdminClient();

  try {
    // Mitarbeiter-Zuweisung aktualisieren
    // Zuerst alle Mitarbeiter, die diesem Benutzer zugewiesen sind, entknüpfen
    const { error: unlinkEmployeeError } = await supabaseAdmin
      .from('employees')
      .update({ user_id: null })
      .eq('user_id', userId);

    if (unlinkEmployeeError) throw unlinkEmployeeError;

    // Dann den ausgewählten Mitarbeiter diesem Benutzer zuweisen (falls ausgewählt)
    if (employeeId) {
      // Prüfen, ob der Mitarbeiter bereits einem anderen Benutzer zugewiesen ist
      const { data: existingEmployee, error: fetchEmployeeError } = await supabaseAdmin
        .from('employees')
        .select('user_id')
        .eq('id', employeeId)
        .single();

      if (fetchEmployeeError) throw fetchEmployeeError;

      if (existingEmployee && existingEmployee.user_id && existingEmployee.user_id !== userId) {
        // Wenn der Mitarbeiter bereits einem ANDEREN Benutzer zugewiesen ist, diesen entknüpfen
        const { error: unlinkOtherUserError } = await supabaseAdmin
          .from('employees')
          .update({ user_id: null })
          .eq('user_id', existingEmployee.user_id)
          .eq('id', employeeId);
        if (unlinkOtherUserError) throw unlinkOtherUserError;
      }

      const { error: assignEmployeeError } = await supabaseAdmin
        .from('employees')
        .update({ user_id: userId })
        .eq('id', employeeId);
      if (assignEmployeeError) throw assignEmployeeError;
    }

    // Kunden-Zuweisung aktualisieren
    // Zuerst alle Kunden, die diesem Benutzer zugewiesen sind, entknüpfen
    const { error: unlinkCustomerError } = await supabaseAdmin
      .from('customers')
      .update({ user_id: null })
      .eq('user_id', userId);

    if (unlinkCustomerError) throw unlinkCustomerError;

    // Dann den ausgewählten Kunden diesem Benutzer zuweisen (falls ausgewählt)
    if (customerId) {
      // Prüfen, ob der Kunde bereits einem anderen Benutzer zugewiesen ist
      const { data: existingCustomer, error: fetchCustomerError } = await supabaseAdmin
        .from('customers')
        .select('user_id')
        .eq('id', customerId)
        .single();

      if (fetchCustomerError) throw fetchCustomerError;

      if (existingCustomer && existingCustomer.user_id && existingCustomer.user_id !== userId) {
        // Wenn der Kunde bereits einem ANDEREN Benutzer zugewiesen ist, diesen entknüpfen
        const { error: unlinkOtherUserError } = await supabaseAdmin
          .from('customers')
          .update({ user_id: null })
          .eq('user_id', existingCustomer.user_id)
          .eq('id', customerId);
        if (unlinkOtherUserError) throw unlinkOtherUserError;
      }

      const { error: assignCustomerError } = await supabaseAdmin
        .from('customers')
        .update({ user_id: userId })
        .eq('id', customerId);
      if (assignCustomerError) throw assignCustomerError;
    }

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/employees");
    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard/orders"); // Aufträge könnten von Mitarbeiter-/Kunden-Zuweisungen betroffen sein
    revalidatePath("/dashboard/objects"); // Objekte könnten von Kunden-Zuweisungen betroffen sein
    revalidatePath("/dashboard/customer-contacts"); // Kundenkontakte könnten von Kunden-Zuweisungen betroffen sein

    return { success: true, message: "Benutzer erfolgreich zugewiesen!" };
  } catch (error: any) {
    console.error("Fehler bei der Zuweisung des Benutzers:", error);
    return { success: false, message: error.message || "Fehler bei der Zuweisung des Benutzers." };
  }
}