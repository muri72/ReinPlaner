"use client"; // This page needs to be a client component to use hooks like useIsMobile

import { createClient } from "@/lib/supabase/client"; // This is fine here, as it's a client component.

import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
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
import { Suspense, useEffect, useState, useCallback } from "react";
import { FilterSelect } from "@/components/filter-select";
import { UsersTableView } from "@/components/users-table-view"; // Import the new table view component
import { useIsMobile } from "@/hooks/use-mobile"; // Import the hook
import { RecordDetailsDialog } from "@/components/record-details-dialog"; // Import RecordDetailsDialog
import { LoadingOverlay } from "@/components/loading-overlay"; // Import the new LoadingOverlay
import { getUsers } from "./actions"; // Import the new server action
import { toast } from "sonner"; // Import toast for error handling
import { PageHeader } from "@/components/page-header";
import { DataTableToolbar } from "@/components/data-table-toolbar";

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

  const query = (currentSearchParams.get('query') || '') as string;
  const currentPage = Number(currentSearchParams.get('page')) || 1;
  const pageSize = 10; // Set page size to 10
  const roleFilter = (currentSearchParams.get('role') || '') as string;
  const viewMode = (currentSearchParams.get('viewMode') || 'grid') as string;

  // Sorting parameters
  const sortColumn = (currentSearchParams.get('sortColumn') || 'last_name') as string;
  const sortDirection = (currentSearchParams.get('sortDirection') || 'asc') as string;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser(); // Await here
    if (!user) {
      redirect("/login");
      return;
    }
    setCurrentUser(user);

    const result = await getUsers({
      query,
      role: roleFilter,
      page: currentPage,
      pageSize,
      sortColumn,
      sortDirection,
    });

    if (result.success && result.data) {
      setAllUsers(result.data);
      setTotalCount(result.totalCount || 0);
    } else {
      toast.error(result.message);
      setAllUsers([]);
      setTotalCount(0);
    }

    setLoading(false);
  }, [
    supabase,
    query,
    currentPage,
    pageSize,
    roleFilter,
    sortColumn,
    sortDirection,
    currentSearchParams // Add currentSearchParams to dependency array
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!currentUser) {
    return null; // Render nothing or a global loading if user is not yet determined
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
      {loading && <LoadingOverlay isLoading={loading} />}
      <PageHeader title="Benutzerverwaltung">
        <UserCreateDialog />
      </PageHeader>

      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <DataTableToolbar>
            <SearchInput placeholder="Benutzer suchen..." className="w-full sm:w-auto sm:flex-grow" />
            <Suspense fallback={<div>Lade Filter...</div>}>
              <FilterSelect
                paramName="role"
                placeholder="Rolle"
                options={roleOptions}
                currentValue={roleFilter}
              />
            </Suspense>
          </DataTableToolbar>
        </CardHeader>
        <CardContent>
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
                          <RecordDetailsDialog record={user} title={`Details zu Benutzer: ${user.first_name} ${user.last_name}`} />
                          {user.role === 'manager' && (
                            <ManagerCustomerAssignmentDialog
                              managerId={user.id}
                              managerName={`${user.first_name || ''} ${user.last_name || ''}`.trim()}
                            />
                          )}
                          <UserEditDialog user={user} />
                          <DeleteUserButton userId={user.id} onDeleteSuccess={fetchData} />
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
        </CardContent>
        <CardFooter className="flex justify-center">
          {!query && totalPages > 1 && (
            <PaginationControls currentPage={currentPage} totalPages={totalPages} />
          )}
        </CardFooter>
      </Card>
    </div>
  );
}