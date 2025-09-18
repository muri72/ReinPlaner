"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server"; // Importiere createAdminClient
import { revalidatePath } from "next/cache";
import { UserFormValues } from "@/components/user-form";
import { sendNotification } from "@/lib/actions/notifications";

// Define interfaces for the data to avoid using 'any'
interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
}

interface EmployeeData {
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  status: string; // Added status
}

interface CustomerData {
  user_id: string | null;
  name: string | null;
}

interface CustomerContactData {
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface AuthUser {
  id: string;
  email?: string;
  created_at: string;
  user_metadata: {
    first_name?: string;
    last_name?: string;
  };
}

export async function getUsers(
  filters: {
    query?: string;
    role?: string;
    page?: number;
    pageSize?: number;
    sortColumn?: string;
    sortDirection?: string;
  }
): Promise<{ success: boolean; message: string; data?: any[]; totalCount?: number }> {
  const supabaseAdmin = createAdminClient();
  const { page = 1, pageSize = 10, sortColumn = 'last_name', sortDirection = 'asc' } = filters;

  try {
    // 1. Fetch all necessary data in parallel
    const [
      { data: authUsersResult, error: authUsersError },
      { data: profiles, error: profilesError },
      { data: employees, error: employeesError },
      { data: customers, error: customersError },
      { data: customerContacts, error: customerContactsError }
    ] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }), // Fetch all users
      supabaseAdmin.from('profiles').select('id, first_name, last_name, role'),
      supabaseAdmin.from('employees').select('user_id, first_name, last_name, status'), // Fetch status
      supabaseAdmin.from('customers').select('user_id, name'),
      supabaseAdmin.from('customer_contacts').select('user_id, first_name, last_name')
    ]);

    if (authUsersError) throw authUsersError;
    if (profilesError) throw profilesError;
    if (employeesError) throw employeesError;
    if (customersError) throw customersError;
    if (customerContactsError) throw customerContactsError;

    // 2. Create lookup maps for efficient data mapping
    const profilesMap = new Map(profiles?.map((p: ProfileData) => [p.id, p]));
    const employeesMap = new Map(employees?.filter(e => e.user_id).map((e: EmployeeData) => [e.user_id, { name: `${e.first_name} ${e.last_name}`, status: e.status }])); // Store name and status
    const customersMap = new Map(customers?.filter(c => c.user_id).map((c: CustomerData) => [c.user_id, c.name]));
    const customerContactsMap = new Map(customerContacts?.filter(cc => cc.user_id).map((cc: CustomerContactData) => [cc.user_id, `${cc.first_name} ${cc.last_name}`]));

    // 3. Combine auth user data with profile and assignment data
    let combinedUsers = (authUsersResult.users as AuthUser[]).map(authUser => {
      const profile = profilesMap.get(authUser.id);
      const role = profile?.role || 'employee';
      const employeeInfo = employeesMap.get(authUser.id);

      return {
        id: authUser.id,
        email: authUser.email || 'N/A',
        first_name: profile?.first_name || authUser.user_metadata.first_name || null,
        last_name: profile?.last_name || authUser.user_metadata.last_name || null,
        role: role,
        created_at: authUser.created_at,
        assigned_employee_name: employeeInfo?.name || null,
        assigned_employee_status: employeeInfo?.status || null, // Added employee status
        assigned_customer_name: role === 'customer' ? (customersMap.get(authUser.id) || customerContactsMap.get(authUser.id)) : null,
      };
    });

    // 4. Apply filters
    if (filters.query) {
      const lowerCaseQuery = filters.query.toLowerCase();
      combinedUsers = combinedUsers.filter(u =>
        u.email.toLowerCase().includes(lowerCaseQuery) ||
        u.first_name?.toLowerCase().includes(lowerCaseQuery) ||
        u.last_name?.toLowerCase().includes(lowerCaseQuery) ||
        u.role.toLowerCase().includes(lowerCaseQuery) ||
        u.assigned_employee_name?.toLowerCase().includes(lowerCaseQuery) ||
        u.assigned_customer_name?.toLowerCase().includes(lowerCaseQuery)
      );
    }
    if (filters.role) {
      combinedUsers = combinedUsers.filter(u => u.role === filters.role);
    }

    // Filter out employees who are 'inactive' or 'on_leave' if their role is 'employee'
    combinedUsers = combinedUsers.filter(u => {
      if (u.role === 'employee' && (u.assigned_employee_status === 'inactive' || u.assigned_employee_status === 'on_leave')) {
        return false; // Do not display inactive/on_leave employees in the user list
      }
      return true;
    });

    // 5. Apply sorting
    combinedUsers.sort((a, b) => {
      const valA = (a as any)[sortColumn] || '';
      const valB = (b as any)[sortColumn] || '';
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // 6. Apply pagination
    const totalCount = combinedUsers.length;
    const paginatedData = combinedUsers.slice((page - 1) * pageSize, page * pageSize);

    return { success: true, message: "Benutzer erfolgreich geladen.", data: paginatedData, totalCount };

  } catch (error: any) {
    console.error("Fehler beim Abrufen der Benutzer:", error.message);
    return { success: false, message: `Fehler beim Abrufen der Benutzer: ${error.message}` };
  }
}


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
    console.error("Berechtigungsfehler:", profileError?.message || profileError);
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
    user_metadata: { first_name: firstName, last_name: lastName, role: role },
  });

  if (authError) {
    console.error("Fehler bei der Benutzerregistrierung:", authError?.message || authError);
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
    console.error("Fehler beim Aktualisieren des Benutzerprofils:", profileUpdateError?.message || profileUpdateError);
    // Optional: Benutzer in Auth löschen, wenn Profil-Update fehlschlägt
    await supabaseAdmin.auth.admin.deleteUser(newUser.user?.id!); // Verwende den Admin Client
    return { success: false, message: profileUpdateError.message };
  }

  // Explizite Logik zur Erstellung/Verknüpfung von Mitarbeiterdatensätzen
  if (role !== 'customer') {
    if (employeeId) {
      // Verknüpfe den neuen Benutzer mit einem BESTEHENDEN Mitarbeiterdatensatz
      const { error: assignEmployeeError } = await supabaseAdmin
        .from('employees')
        .update({ user_id: newUserId })
        .eq('id', employeeId);
      if (assignEmployeeError) {
        console.error("Fehler beim Zuweisen des Mitarbeiters zum Benutzer:", assignEmployeeError.message);
        // Rollback
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        return { success: false, message: `Fehler beim Zuweisen des Mitarbeiters: ${assignEmployeeError.message}` };
      }
    } else {
      // Erstelle einen NEUEN Mitarbeiterdatensatz für den neuen Benutzer
      const { error: createEmployeeError } = await supabaseAdmin
        .from('employees')
        .insert({
          user_id: newUserId,
          first_name: firstName,
          last_name: lastName,
          email: userEmail,
        });
      if (createEmployeeError) {
        console.error("Fehler beim Erstellen des neuen Mitarbeiterdatensatzes:", createEmployeeError.message);
        // Rollback
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        return { success: false, message: `Fehler beim Erstellen des Mitarbeiterdatensatzes: ${createEmployeeError.message}` };
      }
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
      console.error("Fehler beim Abrufen des Kunden für Zuweisung:", fetchCustomerError?.message || fetchCustomerError);
      // Nicht abbrechen
    } else if (existingCustomer && existingCustomer.user_id && existingCustomer.user_id !== newUserId) {
      // Wenn der Kunde bereits einem ANDEREN Benutzer zugewiesen ist, diesen entknüpfen
      const { error: unlinkOtherUserError } = await supabaseAdmin
        .from('customers')
        .update({ user_id: null })
        .eq('user_id', existingCustomer.user_id)
        .eq('id', customerId);
      if (unlinkOtherUserError) console.error("Fehler beim Entknüpfen des Kunden von anderem Benutzer:", unlinkOtherUserError?.message || unlinkOtherUserError);
    }

    const { error: assignCustomerError } = await supabaseAdmin
      .from('customers')
      .update({ user_id: newUserId })
      .eq('id', customerId);
    if (assignCustomerError) {
      console.error("Fehler beim Zuweisen des Kunden zum Benutzer:", assignCustomerError?.message || assignCustomerError);
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
      console.error("Fehler beim Abrufen des Kundenkontakts für Zuweisung:", fetchContactError?.message || fetchContactError);
    } else if (existingContact && existingContact.user_id && existingContact.user_id !== newUserId) {
      // Wenn der Kontakt bereits einem ANDEREN Benutzer zugewiesen ist, diesen entknüpfen
      const { error: unlinkOtherUserError } = await supabaseAdmin
        .from('customer_contacts')
        .update({ user_id: null })
        .eq('user_id', existingContact.user_id)
        .eq('id', customerContactId);
      if (unlinkOtherUserError) console.error("Fehler beim Entknüpfen des Kundenkontakts von anderem Benutzer:", unlinkOtherUserError?.message || unlinkOtherUserError);
    }

    const { error: assignContactError } = await supabaseAdmin
      .from('customer_contacts')
      .update({ user_id: newUserId })
      .eq('id', customerContactId);
    if (assignContactError) {
      console.error("Fehler beim Zuweisen des Kundenkontakts zum Benutzer:", assignContactError?.message || assignContactError);
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

  // Send a welcome notification to the new user
  await sendNotification({
    userId: newUserId,
    title: "Willkommen bei ARIS Management!",
    message: "Ihr Konto wurde erfolgreich erstellt. Erkunden Sie das Dashboard, um loszulegen.",
    link: "/dashboard"
  });

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
    console.error("Berechtigungsfehler:", profileError?.message || profileError);
    return { success: false, message: "Nicht autorisiert. Nur Admins können Benutzer aktualisieren." };
  }

  const { firstName, lastName, role } = data;

  // Aktualisiere das Profil in der profiles-Tabelle
  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({ first_name: firstName, last_name: lastName, role: role, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (profileUpdateError) {
    console.error("Fehler beim Aktualisieren des Benutzerprofils:", profileUpdateError?.message || profileUpdateError);
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
    console.error("Berechtigungsfehler:", profileError?.message || profileError);
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
  if (employeeUnlinkError) console.error("Fehler beim Entknüpfen des Mitarbeiters:", employeeUnlinkError?.message || employeeUnlinkError);

  // Kunden entknüpfen
  const { error: customerUnlinkError } = await supabaseAdmin
    .from('customers')
    .update({ user_id: null })
    .eq('user_id', userId);
  if (customerUnlinkError) console.error("Fehler beim Entknüpfen des Kunden:", customerUnlinkError?.message || customerUnlinkError);

  // Kundenkontakte entknüpfen (NEU)
  const { error: customerContactUnlinkError } = await supabaseAdmin
    .from('customer_contacts')
    .update({ user_id: null })
    .eq('user_id', userId);
  if (customerContactUnlinkError) console.error("Fehler beim Entknüpfen des Kundenkontakts:", customerContactUnlinkError?.message || customerContactUnlinkError);


  // Benutzer in Supabase Auth löschen (dies löscht auch das Profil aufgrund der CASCADE-Regel)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    console.error("Fehler beim Löschen des Benutzers:", error?.message || error);
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
    console.error("Berechtigungsfehler:", profileError?.message || profileError);
    return { success: false, message: "Nicht autorisiert. Nur Admins können Zuweisungen vornehmen." };
  }

  // Transaktion starten (oder simulieren, da Server Actions keine echten Transaktionen unterstützen)
  // Zuerst alle bestehenden Zuweisungen für diesen Manager löschen
  const { error: deleteError } = await supabase
    .from('manager_customer_assignments')
    .delete()
    .eq('manager_id', managerId);

  if (deleteError) {
    console.error("Fehler beim Löschen alter Zuweisungen:", deleteError?.message || deleteError);
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
      console.error("Fehler beim Einfügen neuer Zuweisungen:", insertError?.message || insertError);
      return { success: false, message: `Fehler beim Aktualisieren der Zuweisungen: ${insertError.message}` };
    }
  }

  // Notify the manager
  await sendNotification({
    userId: managerId,
    title: "Ihre Kundenzuweisungen wurden aktualisiert",
    message: "Ein Administrator hat die Liste der Ihnen zugewiesenen Kunden geändert.",
    link: "/dashboard/customers"
  });

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/customers"); // Revalidiere auch Kunden, da sich deren Sichtbarkeit ändern könnte
  revalidatePath("/dashboard/objects");   // Revalidiere auch Objekte
  revalidatePath("/dashboard/orders");    // Revalidiere auch Aufträge
  revalidatePath("/dashboard/customer-contacts"); // Revalidiere auch Kundenkontakte

  return { success: true, message: "Kundenzuweisungen erfolgreich aktualisiert!" };
}