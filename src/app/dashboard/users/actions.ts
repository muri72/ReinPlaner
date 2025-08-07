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