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

  const { email, password, firstName, lastName, role, employeeId, customerId, customerContactId, managerCustomerIds } = data; // customerContactId hinzugefügt

  if (!password) {
    return { success: false, message: "Passwort ist für die Registrierung erforderlich." };
  }

  // Konvertiere null-E-Mail zu undefined, da Supabase createUser null nicht akzeptiert
  const userEmail = email === null ? undefined : email;

  // Benutzer in Supabase Auth registrieren
  const supabaseAdmin = createAdminClient(); // Verwende den Admin Client
  const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: userEmail,
    password,
    email_confirm: true, // Bestätigt die E-Mail automatisch
    user_metadata: { first_name: firstName, last_name: lastName },
  });

  if (authError) {
    console.error("Fehler bei der Benutzerregistrierung:", authError);
    return { success: false, message: authError.message };
  }

  const newUserId = newUser.user?.id;

  if (!newUserId) {
    await supabaseAdmin.auth.admin.deleteUser(newUser.user?.id!);
    return { success: false, message: "Fehler beim Abrufen der neuen Benutzer-ID." };
  }

  // Profil in der profiles-Tabelle aktualisieren (handle_new_user Trigger sollte dies bereits tun,
  // aber wir stellen sicher, dass die Rolle gesetzt wird, falls der Trigger sie nicht setzt oder überschreibt)
  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({ first_name: firstName, last_name: lastName, role: role })
    .eq('id', newUserId);

  if (profileUpdateError) {
    console.error("Fehler beim Aktualisieren des Benutzerprofils:", profileUpdateError);
    // Optional: Benutzer in Auth löschen, wenn Profil-Update fehlschlägt
    await supabaseAdmin.auth.admin.deleteUser(newUser.user?.id!); // Verwende den Admin Client
    return { success: false, message: profileUpdateError.message };
  }

  // Zuweisung des Benutzers zu einem Mitarbeiter
  if (employeeId) {
    // Zuerst prüfen, ob der Mitarbeiter bereits einem anderen Benutzer zugewiesen ist
    const { data: existingEmployee, error: fetchEmployeeError } = await supabaseAdmin
      .from('employees')
      .select('user_id')
      .eq('id', employeeId)
      .single();

    if (fetchEmployeeError && fetchEmployeeError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("Fehler beim Abrufen des Mitarbeiters für Zuweisung:", fetchEmployeeError);
      // Nicht abbrechen, da dies ein optionaler Schritt ist
    } else if (existingEmployee && existingEmployee.user_id && existingEmployee.user_id !== newUserId) {
      // Wenn der Mitarbeiter bereits einem ANDEREN Benutzer zugewiesen ist, diesen entknüpfen
      const { error: unlinkOtherUserError } = await supabaseAdmin
        .from('employees')
        .update({ user_id: null })
        .eq('user_id', existingEmployee.user_id)
        .eq('id', employeeId);
      if (unlinkOtherUserError) console.error("Fehler beim Entknüpfen des Mitarbeiters von anderem Benutzer:", unlinkOtherUserError);
    }

    const { error: assignEmployeeError } = await supabaseAdmin
      .from('employees')
      .update({ user_id: newUserId })
      .eq('id', employeeId);
    if (assignEmployeeError) {
      console.error("Fehler beim Zuweisen des Mitarbeiters zum Benutzer:", assignEmployeeError);
      // Nicht abbrechen, da dies ein optionaler Schritt ist
    }
  }

  // Zuweisung des Benutzers zu einem Kunden
  if (customerId) {
    // Zuerst prüfen, ob der Kunde bereits einem anderen Benutzer zugewiesen ist
    const { data: existingCustomer, error: fetchCustomerError } = await supabaseAdmin
      .from('customers')
      .select('user_id')
      .eq('id', customerId)
      .single();

    if (fetchCustomerError && fetchCustomerError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("Fehler beim Abrufen des Kunden für Zuweisung:", fetchCustomerError);
      // Nicht abbrechen
    } else if (existingCustomer && existingCustomer.user_id && existingCustomer.user_id !== newUserId) {
      // Wenn der Kunde bereits einem ANDEREN Benutzer zugewiesen ist, diesen entknüpfen
      const { error: unlinkOtherUserError } = await supabaseAdmin
        .from('customers')
        .update({ user_id: null })
        .eq('user_id', existingCustomer.user_id)
        .eq('id', customerId);
      if (unlinkOtherUserError) console.error("Fehler beim Entknüpfen des Kunden von anderem Benutzer:", unlinkOtherUserError);
    }

    const { error: assignCustomerError } = await supabaseAdmin
      .from('customers')
      .update({ user_id: newUserId })
      .eq('id', customerId);
    if (assignCustomerError) {
      console.error("Fehler beim Zuweisen des Kunden zum Benutzer:", assignCustomerError);
      // Nicht abbrechen
    }
  }

  // Zuweisung des Benutzers zu einem Kundenkontakt (NEU)
  if (customerContactId) {
    // Zuerst prüfen, ob der Kundenkontakt bereits einem anderen Benutzer zugewiesen ist
    const { data: existingContact, error: fetchContactError } = await supabaseAdmin
      .from('customer_contacts')
      .select('user_id')
      .eq('id', customerContactId)
      .single();

    if (fetchContactError && fetchContactError.code !== 'PGRST116') {
      console.error("Fehler beim Abrufen des Kundenkontakts für Zuweisung:", fetchContactError);
    } else if (existingContact && existingContact.user_id && existingContact.user_id !== newUserId) {
      // Wenn der Kontakt bereits einem ANDEREN Benutzer zugewiesen ist, diesen entknüpfen
      const { error: unlinkOtherUserError } = await supabaseAdmin
        .from('customer_contacts')
        .update({ user_id: null })
        .eq('user_id', existingContact.user_id)
        .eq('id', customerContactId);
      if (unlinkOtherUserError) console.error("Fehler beim Entknüpfen des Kundenkontakts von anderem Benutzer:", unlinkOtherUserError);
    }

    const { error: assignContactError } = await supabaseAdmin
      .from('customer_contacts')
      .update({ user_id: newUserId })
      .eq('id', customerContactId);
    if (assignContactError) {
      console.error("Fehler beim Zuweisen des Kundenkontakts zum Benutzer:", assignContactError);
    }
  }

  // Zuweisung von Kunden zu einem Manager
  if (role === 'manager' && managerCustomerIds && managerCustomerIds.length > 0) {
    const { success: assignSuccess, message: assignMessage } = await assignCustomersToManager(newUserId, managerCustomerIds);
    if (!assignSuccess) {
      console.error("Fehler beim Zuweisen von Kunden zum Manager:", assignMessage);
      // Hier entscheiden, ob der Fehler die gesamte Benutzererstellung fehlschlagen lassen soll
      // Fürs Erste wird der Fehler nur geloggt, da der Benutzer bereits erstellt wurde.
    }
  }

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/employees"); // Revalidiere Mitarbeiterseite, falls Zuweisung geändert
  revalidatePath("/dashboard/customers"); // Revalidiere Kundenseite, falls Zuweisung geändert
  revalidatePath("/dashboard/customer-contacts"); // Revalidiere Kundenkontakte-Seite
  return { success: true, message: "Benutzer erfolgreich registriert und zugewiesen!" };
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

  // Vor dem Löschen des Benutzers, alle Verknüpfungen in employees, customers und customer_contacts aufheben
  const supabaseAdmin = createAdminClient(); // Verwende den Admin Client

  // Mitarbeiter entknüpfen
  const { error: employeeUnlinkError } = await supabaseAdmin
    .from('employees')
    .update({ user_id: null })
    .eq('user_id', userId);
  if (employeeUnlinkError) console.error("Fehler beim Entknüpfen des Mitarbeiters:", employeeUnlinkError);

  // Kunden entknüpfen
  const { error: customerUnlinkError } = await supabaseAdmin
    .from('customers')
    .update({ user_id: null })
    .eq('user_id', userId);
  if (customerUnlinkError) console.error("Fehler beim Entknüpfen des Kunden:", customerUnlinkError);

  // Kundenkontakte entknüpfen (NEU)
  const { error: customerContactUnlinkError } = await supabaseAdmin
    .from('customer_contacts')
    .update({ user_id: null })
    .eq('user_id', userId);
  if (customerContactUnlinkError) console.error("Fehler beim Entknüpfen des Kundenkontakts:", customerContactUnlinkError);


  // Benutzer in Supabase Auth löschen (dies löscht auch das Profil aufgrund der CASCADE-Regel)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    console.error("Fehler beim Löschen des Benutzers:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/employees"); // Revalidiere Mitarbeiterseite, falls Zuweisung geändert
  revalidatePath("/dashboard/customers"); // Revalidiere Kundenseite, falls Zuweisung geändert
  revalidatePath("/dashboard/customer-contacts"); // Revalidiere Kundenkontakte-Seite
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