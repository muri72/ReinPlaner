"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Briefcase, UserRound, ArrowUp, ArrowDown } from "lucide-react";
import { UserEditDialog } from "@/components/user-edit-dialog";
import { DeleteUserButton } from "@/components/delete-user-button";
import { ManagerCustomerAssignmentDialog } from "@/components/manager-customer-assignment-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

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

interface UsersTableViewProps {
  users: DisplayUser[];
  totalPages: number;
  currentPage: number;
  query: string;
  roleFilter: string;
  sortColumn: string;
  sortDirection: string;
  currentUserId: string;
}

export function UsersTableView({
  users,
  totalPages,
  currentPage,
  query,
  roleFilter,
  sortColumn,
  sortDirection,
  currentUserId,
}: UsersTableViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSort = useCallback((column: string) => {
    const params = new URLSearchParams(searchParams);
    let newDirection = 'asc';
    if (sortColumn === column && sortDirection === 'asc') {
      newDirection = 'desc';
    }
    params.set('sortColumn', column);
    params.set('sortDirection', newDirection);
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  }, [sortColumn, sortDirection, pathname, router, searchParams]);

  const renderSortIcon = (column: string) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
    }
    return null;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'employee': return 'secondary';
      case 'customer': return 'outline';
      default: return 'outline';
    }
  };

  if (users.length === 0 && !query && !roleFilter) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <UserRound className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Noch keine Benutzer vorhanden</p>
        <p className="text-sm">Registrieren Sie einen neuen Benutzer, um Ihr Team zu erweitern.</p>
      </div>
    );
  }

  if (users.length === 0 && (query || roleFilter)) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <UserRound className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Benutzer gefunden</p>
        <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto p-4 rounded-lg shadow-neumorphic glassmorphism-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">
              <Button variant="ghost" onClick={() => handleSort('first_name')} className="px-0 hover:bg-transparent">
                Vorname {renderSortIcon('first_name')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[150px]">
              <Button variant="ghost" onClick={() => handleSort('last_name')} className="px-0 hover:bg-transparent">
                Nachname {renderSortIcon('last_name')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[180px]">
              <Button variant="ghost" onClick={() => handleSort('email')} className="px-0 hover:bg-transparent">
                E-Mail {renderSortIcon('email')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[100px]">
              <Button variant="ghost" onClick={() => handleSort('role')} className="px-0 hover:bg-transparent">
                Rolle {renderSortIcon('role')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[180px]">
              <Button variant="ghost" onClick={() => handleSort('assigned_employee_name')} className="px-0 hover:bg-transparent">
                Zugewiesen an {renderSortIcon('assigned_employee_name')}
              </Button>
            </TableHead>
            <TableHead className="text-right min-w-[120px]">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium text-sm">{user.first_name || 'N/A'}</TableCell>
              <TableCell className="font-medium text-sm">{user.last_name || 'N/A'}</TableCell>
              <TableCell className="text-sm">{user.email}</TableCell>
              <TableCell className="text-sm">
                <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
              </TableCell>
              <TableCell className="text-sm">
                {user.assigned_employee_name || user.assigned_customer_name || 'N/A'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-1">
                  {user.role === 'manager' && (
                    <ManagerCustomerAssignmentDialog
                      managerId={user.id}
                      managerName={`${user.first_name || ''} ${user.last_name || ''}`.trim()}
                    />
                  )}
                  <UserEditDialog user={user} />
                  <DeleteUserButton userId={user.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}