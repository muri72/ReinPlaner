"use client"; // This page needs to be a client component to use hooks like useIsMobile

import { createClient } from "@/lib/supabase/client";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { UserCreateDialog } from "@/components/user-create-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense, useEffect, useState, useCallback } from "react";
import { UsersTableView } from "@/components/users-table-view";
import { useIsMobile } from "@/hooks/use-mobile";
import { getUsers } from "./actions";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { DataTableToolbar, FilterOption, SortOption } from "@/components/data-table-toolbar";
import { UsersGridView } from "@/components/users-grid-view"; // Assuming this will be created or exists

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

export default function UsersPage() {
  const supabase = createClient();
  const router = useRouter();
  const currentSearchParams = useSearchParams();
  const isMobile = useIsMobile();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<DisplayUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(0);

  const query = currentSearchParams.get('query') || '';
  const currentPage = Number(currentSearchParams.get('page')) || 1;
  const pageSize = 10;
  const roleFilter = currentSearchParams.get('role') || '';
  const viewMode = currentSearchParams.get('viewMode') || 'grid';
  const sortColumn = currentSearchParams.get('sortColumn') || 'last_name';
  const sortDirection = currentSearchParams.get('sortDirection') || 'asc';

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
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
    currentSearchParams
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!currentUser) {
    return null;;
  }

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  const filterOptions: FilterOption[] = [
    {
      value: 'role',
      label: 'Rolle',
      options: [
        { value: 'admin', label: 'Admin' },
        { value: 'manager', label: 'Manager' },
        { value: 'employee', label: 'Mitarbeiter' },
        { value: 'customer', label: 'Kunde' },
      ]
    }
  ];

  const sortOptions: SortOption[] = [
    { value: 'last_name', label: 'Nachname' },
    { value: 'first_name', label: 'Vorname' },
    { value: 'email', label: 'E-Mail' },
    { value: 'role', label: 'Rolle' },
    { value: 'created_at', label: 'Erstellt am' },
  ];

  const activeTab = isMobile ? 'grid' : viewMode;

  const handleViewModeChange = (value: string) => {
    const params = new URLSearchParams(currentSearchParams);
    params.set('viewMode', value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      
      <PageHeader title="Benutzerverwaltung">
        <UserCreateDialog onUserCreated={fetchData} />
      </PageHeader>

      <Card className="shadow-neumorphic glassmorphism-card">
        <CardHeader>
          <DataTableToolbar
            searchPlaceholder="Benutzer suchen..."
            filterOptions={filterOptions}
            sortOptions={sortOptions}
          />
          {totalCount !== null && (
            <div className="text-sm text-muted-foreground mt-2">
              {totalCount} {totalCount === 1 ? 'Ergebnis' : 'Ergebnisse'} gefunden.
            </div>
          )}
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
              <UsersGridView
                users={allUsers}
                query={query}
                roleFilter={roleFilter}
                currentUserId={currentUser.id}
                onActionSuccess={fetchData}
              />
            </TabsContent>
            <TabsContent value="table" className="mt-0">
              <UsersTableView
                users={allUsers}
                totalPages={totalPages}
                currentPage={currentPage}
                query={query}
                roleFilter={roleFilter}
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