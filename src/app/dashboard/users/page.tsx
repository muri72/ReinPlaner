import { createClient, createAdminClient } from "@/lib/supabase/server"; // Importiere createAdminClient
import { redirect } from "next/navigation";
import { UserForm } from "@/components/user-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { registerUser } from "./actions";
import { UserEditDialog } from "@/components/user-edit-dialog";
import { DeleteUserButton } from "@/components/delete-user-button";
import { Mail, UserRound, Briefcase, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/search-input";
import { ManagerCustomerAssignmentDialog } from "@/components/manager-customer-assignment-dialog";
import { UserAssignmentDialog } from "@/components/user-assignment-dialog"; // Neuer Import

interface DisplayUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  created_at: string | null;
  assigned_employee_id: string | null; // Neues Feld
  assigned_customer_id: string | null; // Neues Feld
}

export default async function UsersPage({
  searchParams,
}: any) {
  const supabase = await createClient(); // Für die Überprüfung des aktuellen Benutzers
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect("/login");
  }

  // Überprüfen, ob der aktuelle Benutzer ein Admin ist
  const { data: adminProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  if (profileError || adminProfile?.role !== 'admin') {
    // Wenn der Benutzer kein Admin ist, umleiten oder Fehlermeldung anzeigen
    redirect("/dashboard"); // Oder eine "Zugriff verweigert"-Seite
  }

  const query = typeof searchParams?.query === 'string' ? searchParams.query : '';

  let users: DisplayUser[] | null;
  let error: any;

  // Supabase Admin Client verwenden, um alle Benutzer abzurufen
  const supabaseAdmin = await createAdminClient(); // Verwende den Admin Client
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

  if (authError) {
    console.error("Fehler beim Laden der Auth-Benutzer:", authError);
    return <div className="p-8">Fehler beim Laden der Benutzer.</div>;
  }

  // Profile-Daten abrufen, um Rollen und Namen zu erhalten
  const userIds = authUsers.users.map(u => u.id);
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role')
    .in('id', userIds);

  if (profilesError) {
    console.error("Fehler beim Laden der Profile:", profilesError);
    return <div className="p-8">Fehler beim Laden der Benutzerprofile.</div>;
  }

  // Mitarbeiter- und Kundenzuweisungen abrufen
  const { data: employeesData, error: employeesError } = await supabase
    .from('employees')
    .select('id, user_id')
    .in('user_id', userIds);

  const { data: customersData, error: customersError } = await supabase
    .from('customers')
    .select('id, user_id')
    .in('user_id', userIds);

  if (employeesError) console.error("Fehler beim Laden der Mitarbeiter-Zuweisungen:", employeesError);
  if (customersError) console.error("Fehler beim Laden der Kunden-Zuweisungen:", customersError);

  const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
  const employeeAssignmentsMap = new Map(employeesData?.filter(e => e.user_id).map(e => [e.user_id, e.id]));
  const customerAssignmentsMap = new Map(customersData?.filter(c => c.user_id).map(c => [c.user_id, c.id]));

  users = authUsers.users.map(authUser => {
    const profile = profilesMap.get(authUser.id);
    return {
      id: authUser.id,
      email: authUser.email || 'N/A',
      first_name: profile?.first_name || authUser.user_metadata.first_name || null,
      last_name: profile?.last_name || authUser.user_metadata.last_name || null,
      role: profile?.role || 'employee', // Standardrolle, falls nicht im Profil gefunden
      created_at: authUser.created_at,
      assigned_employee_id: employeeAssignmentsMap.get(authUser.id) || null,
      assigned_customer_id: customerAssignmentsMap.get(authUser.id) || null,
    };
  }).filter(user => {
    // Filterung basierend auf der Suchanfrage
    if (!query) return true;
    const lowerCaseQuery = query.toLowerCase();
    return (
      user.email.toLowerCase().includes(lowerCaseQuery) ||
      user.first_name?.toLowerCase().includes(lowerCaseQuery) ||
      user.last_name?.toLowerCase().includes(lowerCaseQuery) ||
      user.role.toLowerCase().includes(lowerCaseQuery)
    );
  }).sort((a, b) => {
    // Sortierung nach Nachname, dann Vorname
    const lastNameComparison = (a.last_name || '').localeCompare(b.last_name || '');
    if (lastNameComparison !== 0) return lastNameComparison;
    return (a.first_name || '').localeCompare(b.first_name || '');
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'manager':
        return 'default';
      case 'employee':
        return 'secondary';
      case 'customer':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Benutzerverwaltung</h1>

      <div className="mb-4">
        <SearchInput placeholder="Benutzer suchen..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground">
            {query ? "Keine Benutzer gefunden, die Ihrer Suche entsprechen." : "Noch keine Benutzer vorhanden. Fügen Sie einen hinzu!"}
          </p>
        ) : (
          users.map((user) => (
            <Card key={user.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{user.first_name} {user.last_name}</CardTitle>
                <div className="flex items-center space-x-2">
                  {user.role === 'manager' && (
                    <ManagerCustomerAssignmentDialog
                      managerId={user.id}
                      managerName={`${user.first_name || ''} ${user.last_name || ''}`.trim()}
                    />
                  )}
                  <UserAssignmentDialog
                    userId={user.id}
                    userName={`${user.first_name || ''} ${user.last_name || ''}`.trim()}
                    initialEmployeeId={user.assigned_employee_id}
                    initialCustomerId={user.assigned_customer_id}
                  />
                  <UserEditDialog user={user} />
                  <DeleteUserButton userId={user.id} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Briefcase className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span>Rolle: <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge></span>
                </div>
                {user.assigned_employee_id && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <UserRound className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Zugewiesener Mitarbeiter-ID: {user.assigned_employee_id.substring(0, 8)}...</span>
                  </div>
                )}
                {user.assigned_customer_id && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <UserRound className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Zugewiesener Kunden-ID: {user.assigned_customer_id.substring(0, 8)}...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <h2 className="text-2xl font-bold mt-8">Neuen Benutzer registrieren</h2>
      <UserForm onSubmit={registerUser} submitButtonText="Benutzer registrieren" />
    </div>
  );
}