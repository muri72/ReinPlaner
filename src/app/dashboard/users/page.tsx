"use client"; // This page needs to be a client component to use hooks like useIsMobile

import { createClient } from "@/lib/supabase/client"; // Use client-side supabase
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Briefcase, ShieldCheck, UserRound, UsersRound, PlusCircle } from "lucide-react";
import { UserEditDialog } from "@/components/user-edit-dialog";
import { DeleteUserButton } from "@/components/delete-user-button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/search-input";
import { ManagerCustomerAssignmentDialog } from "@/components/manager-customer-assignment-dialog";
import { UserCreateDialog } from "@/components/user-create-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense, useEffect, useState } from "react";
import { FilterSelect } from "@/components/filter-select";
import { UsersTableView } from "@/components/users-table-view"; // Import the new table view component
import { useIsMobile } from "@/hooks/use-mobile"; // Import the hook

interface DisplayUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  created_at: string | null;
  assigned_employee_name: string | null;
  assigned_customer_name: string | null;
}

// Define interfaces for data fetched from Supabase
interface EmployeeData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  user_id: string | null;
}

interface CustomerData {
  id: string;
  name: string;
  user_id: string | null;
}

interface CustomerContactData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  user_id: string | null;
}

interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
}

interface AuthUserData {
  id: string;
  email?: string; // Made optional
  created_at: string;
  user_metadata: {
    first_name?: string;
    last_name?: string;
  };
}


export default function UsersPage({
  searchParams,
}: {
  searchParams?: any;
}) {
  const supabase = createClient(); // This is fine here, as it's a client component.

  const router = useRouter();
  const currentSearchParams = useSearchParams();
  const isMobile = useIsMobile();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<DisplayUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(0);

  const query = typeof searchParams?.query === 'string' ? searchParams.query : '';
  const currentPage = Number(searchParams?.page) || 1;
  const pageSize = Number(searchParams?.pageSize) || 9;
  const roleFilter = searchParams?.role || '';
  const viewMode = searchParams?.viewMode === 'table' ? 'table' : 'grid';

  // Sorting parameters
  const sortColumn = Array.isArray(searchParams?.sortColumn) ? searchParams.sortColumn[0] : searchParams?.sortColumn || 'last_name';
  const sortDirection = Array.isArray(searchParams?.sortDirection) ? searchParams.sortDirection[0] : searchParams?.sortDirection || 'asc';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser(); // Await here
      if (!user) {
        redirect("/login");
        return;
      }
      setCurrentUser(user);

      const { data: adminProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || adminProfile?.role !== 'admin') {
        console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || profileError);
        redirect("/dashboard"); // Redirect if not admin
        return;
      }

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let usersData: DisplayUser[] = [];
      let usersError: any = null;
      let usersCount: number | null = 0;

      // Fetch employee, customer, and customer contact names for display
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, user_id');

      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, user_id');

      const { data: customerContactsData, error: customerContactsError } = await supabase
        .from('customer_contacts')
        .select('id, first_name, last_name, user_id');

      if (employeesError) console.error("Fehler beim Laden der Mitarbeiterdaten:", employeesError?.message || employeesError);
      if (customersError) console.error("Fehler beim Laden der Kundendaten:", customersError?.message || customersError);
      if (customerContactsError) console.error("Fehler beim Laden der Kundenkontaktdaten:", customerContactsError?.message || customerContactsError);

      const employeesMap = new Map(employeesData?.map((e: EmployeeData) => [e.user_id, `${e.first_name} ${e.last_name}`]));
      const customersMap = new Map(customersData?.map((c: CustomerData) => [c.user_id, c.name]));
      const customerContactsMap = new Map(customerContactsData?.map((cc: CustomerContactData) => [cc.user_id, `${cc.first_name} ${cc.last_name}`]));

      if (query) {
        // If a search query is present, fetch all profiles and filter them
        const { data: allProfiles, error: allProfilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role');
        
        if (allProfilesError) {
          usersError = allProfilesError;
        } else {
          const allAuthUsersResult = await supabase.auth.admin.listUsers(); // Use admin client for all auth users
          const allAuthUsers: AuthUserData[] = allAuthUsersResult.data?.users || [];

          const profilesMap = new Map(allProfiles?.map((p: ProfileData) => [p.id, p]));

          const usersToFilter = allAuthUsers.map((authUser: AuthUserData) => {
            const profile = profilesMap.get(authUser.id);
            const userRole = profile?.role || 'employee';
            return {
              id: authUser.id,
              email: authUser.email || 'N/A',
              first_name: profile?.first_name || authUser.user_metadata.first_name || null,
              last_name: profile?.last_name || authUser.user_metadata.last_name || null,
              role: userRole,
              created_at: authUser.created_at || null,
              assigned_employee_name: employeesMap.get(authUser.id) || null,
              assigned_customer_name: userRole === 'admin' ? null : (customersMap.get(authUser.id) || customerContactsMap.get(authUser.id) || null),
            };
          });

          const lowerCaseQuery = query.toLowerCase();
          const filteredUsers = usersToFilter.filter((u: DisplayUser) => 
            u.email.toLowerCase().includes(lowerCaseQuery) ||
            u.first_name?.toLowerCase().includes(lowerCaseQuery) ||
            u.last_name?.toLowerCase().includes(lowerCaseQuery) ||
            u.role.toLowerCase().includes(lowerCaseQuery) ||
            u.assigned_employee_name?.toLowerCase().includes(lowerCaseQuery) ||
            u.assigned_customer_name?.toLowerCase().includes(lowerCaseQuery)
          );
          usersData = filteredUsers;
          usersCount = usersData.length;
        }
      } else {
        // If no search query, apply pagination and filters to profiles
        let selectQuery = supabase
          .from('profiles')
          .select('id, first_name, last_name, role', { count: 'exact' })
          .order(sortColumn, { ascending: sortDirection === 'asc' });

        if (roleFilter) {
          selectQuery = selectQuery.eq('role', roleFilter);
        }

        const { data, error: selectError, count: selectCount } = await selectQuery
          .range(from, to);
        
        if (selectError) {
          usersError = selectError;
        } else {
          const authUsersResult = await supabase.auth.admin.listUsers(); // Fetch all auth users
          const authUsersMap = new Map(authUsersResult.data?.users.map((u: AuthUserData) => [u.id, u]) || []);

          usersData = data.map((profile: ProfileData) => {
            const authUser = authUsersMap.get(profile.id);
            return {
              id: profile.id,
              email: authUser?.email || 'N/A',
              first_name: profile.first_name,
              last_name: profile.last_name,
              role: profile.role,
              created_at: authUser?.created_at || null,
              assigned_employee_name: employeesMap.get(profile.id) || null,
              assigned_customer_name: profile.role === 'admin' ? null : (customersMap.get(profile.id) || customerContactsMap.get(profile.id) || null),
            };
          });
          usersCount = selectCount;
        }
      }

      if (usersError) {
        console.error("Fehler beim Laden der Benutzer:", usersError?.message || usersError);
      }
      setAllUsers(usersData);
      setTotalCount(usersCount);
      setLoading(false);
    };

    fetchData();
  }, [
    supabase,
    query,
    currentPage,
    pageSize,
    roleFilter,
    sortColumn,
    sortDirection,
  ]);

  if (loading || !currentUser) {
    return <div className="p-4 md:p-8">Lade Benutzer...</div>;
  }

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'employee': return 'secondary';
      case 'customer': return 'outline';
      default: return 'outline';
    }
  };

  const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'employee', label: 'Mitarbeiter' },
    { value: 'customer', label: 'Kunde' },
  ];

  const activeTab = isMobile ? 'grid' : viewMode;

  const handleViewModeChange = (value: string) => {
    const params = new URLSearchParams(currentSearchParams);
    params.set('viewMode', value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold">Benutzerverwaltung</h1>

      <div className="mb-4 flex justify-between items-center">
        <SearchInput placeholder="Benutzer suchen..." />
        <UserCreateDialog />
      </div>

      {/* Filter Section */}
      <Suspense fallback={<div>Lade Filter...</div>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          <FilterSelect
            paramName="role"
            label="Rolle"
            options={roleOptions}
            currentValue={roleFilter}
          />
        </div>
      </Suspense>

      <Tabs value={activeTab} onValueChange={handleViewModeChange} className="w-full">
        <div className="flex justify-end mb-4">
          <TabsList className="hidden md:grid grid-cols-2 w-fit">
            <TabsTrigger value="grid">Kartenansicht</TabsTrigger>
            <TabsTrigger value="table">Tabellenansicht</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="grid" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {allUsers.length === 0 && !query && !roleFilter ? (
              <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
                <UsersRound className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                <p className="text-base md:text-lg font-semibold">Noch keine Benutzer vorhanden</p>
                <p className="text-sm">Registrieren Sie einen neuen Benutzer, um Ihr Team zu erweitern.</p>
                <div className="mt-4">
                  {/* The button to open the dialog is now part of UserCreateDialog */}
                </div>
              </div>
            ) : allUsers.length === 0 && (query || roleFilter) ? (
              <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
                <UsersRound className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                <p className="text-base md:text-lg font-semibold">Keine Benutzer gefunden</p>
                <p className="text-sm">Ihre Suche nach "{query}" ergab keine Treffer.</p>
              </div>
            ) : (
              allUsers.map((user) => (
                <Card key={user.id} className="shadow-neumorphic glassmorphism-card">
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
        </TabsContent>
        <TabsContent value="table" className="mt-0">
          <UsersTableView
            users={allUsers}
            totalPages={totalPages}
            currentPage={currentPage}
            query={query}
            roleFilter={roleFilter}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            currentUserId={currentUser.id}
          />
        </TabsContent>
      </Tabs>
      {!query && totalPages > 1 && (
        <PaginationControls currentPage={currentPage} totalPages={totalPages} />
      )}
    </div>
  );
}