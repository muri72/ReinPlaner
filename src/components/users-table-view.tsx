"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Briefcase, UserRound } from "lucide-react";
import { UserEditDialog } from "@/components/user-edit-dialog";
import { DeleteUserButton } from "@/components/delete-user-button";
import { ManagerCustomerAssignmentDialog } from "@/components/manager-customer-assignment-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { RecordDetailsDialog } from "@/components/record-details-dialog"; // Import RecordDetailsDialog

interface DisplayUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  created_at: string | null;
  assigned_employee_name: string | null;
  assigned_employee_status: string | null;
  assigned_customer_name: string | null;
}

interface UsersTableViewProps {
  users: DisplayUser[];
  totalPages: number;
  currentPage: number;
  query: string;
  roleFilter: string;
  currentUserId: string;
  onActionSuccess?: () => void;
}

export function UsersTableView({
  users,
  totalPages,
  currentPage,
  query,
  roleFilter,
  currentUserId,
  onActionSuccess,
}: UsersTableViewProps) {

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
            <TableHead className="min-w-[150px]">Vorname</TableHead>
            <TableHead className="min-w-[150px]">Nachname</TableHead>
            <TableHead className="min-w-[180px]">E-Mail</TableHead>
            <TableHead className="min-w-[100px]">Rolle</TableHead>
            <TableHead className="min-w-[180px]">Zugewiesen an</TableHead>
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
                  <RecordDetailsDialog record={user} title={`Details zu Benutzer: ${user.first_name} ${user.last_name}`} />
                  {user.role === 'manager' && (
                    <ManagerCustomerAssignmentDialog
                      managerId={user.id}
                      managerName={`${user.first_name || ''} ${user.last_name || ''}`.trim()}
                    />
                  )}
                  <UserEditDialog user={user} onActionSuccess={onActionSuccess} />
                  <DeleteUserButton userId={user.id} onDeleteSuccess={onActionSuccess} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}