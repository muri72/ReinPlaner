import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UserForm } from "@/components/user-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { registerUser } from "./actions";
import { UserEditDialog } from "@/components/user-edit-dialog";
import { DeleteUserButton } from "@/components/delete-user-button";
import { Mail, Briefcase, ShieldCheck, UserRound, UsersRound, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/search-input";
import { ManagerCustomerAssignmentDialog } from "@/components/manager-customer-assignment-dialog";
import { Button } from "@/components/ui/button"; // Hinzugefügt
import { UserCreateDialog } from "@/components/user-create-dialog"; // Import the new dialog

interface DisplayUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  created_at: string | null;
  assigned_employee_name: string | null; // Name des zugewiesenen Mitarbeiters
  assigned_customer_name: string | null; // Name des zugewiesenen Kunden
}

export default async function UsersPage({
  searchParams,
}: any) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect("/login");
  }

  const { data: adminProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  if (profileError || adminProfile?.role !== 'admin') {
    redirect("/dashboard");
  }

  const query = typeof searchParams?.query === 'string' ? searchParams.query : '';

  const supabaseAdmin = createAdminClient();
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

  if (authError) {
    console.error("Fehler beim Laden der Auth-Benutzer:", authError);
    return <div className="p-4 md:p-8 text-sm">Fehler beim Laden der Benutzer.</div>;
  }

  const userIds = authUsers.users.map(u => u.id);
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role');

  if (profilesError) {
    console.error("Fehler beim Laden der Profile:", profilesError);
    return <div className="p-4 md:p-8 text-sm">Fehler beim Laden der Benutzerprofile.</div>;
  }

  // Mitarbeiter- und Kundennamen für die Anzeige abrufen
  const { data: employeesData, error: employeesError } = await supabase
    .from('employees')
    .select('id, first_name, last_name, user_id');

  const { data: customersData, error: customersError } = await supabase
    .from('customers')
    .select('id, name, user_id');

  const { data: customerContactsData, error: customerContactsError } = await supabase
    .from('customer_contacts')
    .select('id, first_name, last_name, user_id');

  if (employeesError) console.error("Fehler beim Laden der Mitarbeiterdaten:", employeesError);
  if (customersError) console.error("Fehler beim Laden der Kundendaten:", customersError);
  if (customerContactsError) console.error("Fehler beim Laden der Kundenkontaktdaten:", customerContactsError);

  const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
  const employeesMap = new Map(employeesData?.map(e => [e.user_id, `${e.first_name} ${e.last_name}`]));
  const customersMap = new Map(customersData?.map(c => [c.user_id, c.name]));
  const customerContactsMap = new Map(customerContactsData?.map(cc => [cc.user_id, `${cc.first_name} ${cc.last_name}`]));


  const users: DisplayUser[] = authUsers.users.map(authUser => {
    const profile = profilesMap.get(authUser.id);
    const userRole = profile?.role || 'employee'; // Standardrolle, falls nicht im Profil gefunden
    return {
      id: authUser.id,
      email: authUser.email || 'N/A',
      first_name: profile?.first_name || authUser.user_metadata.first_name || null,
      last_name: profile?.last_name || authUser.user_metadata.last_name || null,
      role: userRole,
      created_at: authUser.created_at,
      assigned_employee_name: employeesMap.get(authUser.id) || null,
      // Zeige zugewiesenen Kunden nur an, wenn die Rolle NICHT 'admin' ist
      assigned_customer_name: userRole === 'admin' ? null : (customersMap.get(authUser.id) || customerContactsMap.get(authUser.id) || null),
    };
  }).filter(user => {
    if (!query) return true;
    const lowerCaseQuery = query.toLowerCase();
    return (
      user.email.toLowerCase().includes(lowerCaseQuery) ||
      user.first_name?.toLowerCase().includes(lowerCaseQuery) ||
      user.last_name?.toLowerCase().includes(lowerCaseQuery) ||
      user.role.toLowerCase().includes(lowerCaseQuery) ||
      user.assigned_employee_name?.toLowerCase().includes(lowerCaseQuery) ||
      user.assigned_customer_name?.toLowerCase().includes(lowerCaseQuery)
    );
  }).sort((a, b) => {
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
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Benutzerverwaltung</h1>

      <div className="mb-4 flex justify-between items-center">
        <SearchInput placeholder="Benutzer suchen..." />
        <UserCreateDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {users.length === 0 && !query ? (
          <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30">
            <UsersRound className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
            <p className="text-base md:text-lg font-semibold">Noch keine Benutzer vorhanden</p>
            <p className="text-sm">Registrieren Sie einen neuen Benutzer, um Ihr Team zu erweitern.</p>
            <div className="mt-4">
              {/* The button to open the dialog is now part of UserCreateDialog */}
            </div>
          </div>
        ) : users.length === 0 && query ? (
          <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30">
            <UsersRound className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
            <p className="text-base md:text-lg font-semibold">Keine Benutzer gefunden</p>
            <p className="text-sm">Ihre Suche nach "{query}" ergab keine Treffer.</p>
          </div>
        ) : (
          users.map((user) => (
            <Card key={user.id} className="shadow-elevation-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base md:text-lg font-semibold">{user.first_name} {user.last_name}</CardTitle>
                <div className="flex items-center space-x-2">
                  {user.role === 'manager' && (
                    <ManagerCustomerAssignmentDialog
                      managerId={user.id}
                      managerName={`${user.first_name || ''} ${user.last_name || ''}`.trim()}
                    />
                  )}
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
                {user.assigned_employee_name && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <UserRound className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Zugewiesener Mitarbeiter: {user.assigned_employee_name}</span>
                  </div>
                )}
                {user.assigned_customer_name && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <UserRound className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>Zugewiesener Kunde: {user.assigned_customer_name}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}