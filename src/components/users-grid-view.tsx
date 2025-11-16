"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Briefcase, UserRound } from "lucide-react";
import { UserEditDialog } from "@/components/user-edit-dialog";
import { DeleteUserButton } from "@/components/delete-user-button";
import { ManagerCustomerAssignmentDialog } from "@/components/manager-customer-assignment-dialog";
import { RecordDetailsDialog } from "@/components/record-details-dialog";
import { UserCreateDialog } from "@/components/user-create-dialog";

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

interface UsersGridViewProps {
  users: DisplayUser[];
  query: string;
  roleFilter: string;
  currentUserId: string;
  onActionSuccess: () => void;
}

export function UsersGridView({
  users,
  query,
  roleFilter,
  currentUserId,
  onActionSuccess,
}: UsersGridViewProps) {

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
      <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
        <UserRound className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Noch keine Benutzer vorhanden</p>
        <p className="text-sm">Registrieren Sie einen neuen Benutzer, um Ihr Team zu erweitern.</p>
        <div className="mt-4">
          <UserCreateDialog onUserCreated={onActionSuccess} />
        </div>
      </div>
    );
  }

  if (users.length === 0 && (query || roleFilter)) {
    return (
      <div className="col-span-full text-center text-muted-foreground py-8 bg-gradient-to-br from-muted/20 to-background/50 rounded-xl p-8 border border-dashed border-muted-foreground/30 shadow-neumorphic glassmorphism-card">
        <UserRound className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <p className="text-base md:text-lg font-semibold">Keine Benutzer gefunden</p>
        <p className="text-sm">Ihre Suche oder Filter ergaben keine Treffer.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {users.map((user) => (
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
              <UserEditDialog user={user} onActionSuccess={onActionSuccess} />
              <DeleteUserButton userId={user.id} onDeleteSuccess={onActionSuccess} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Mail className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center">
              <Briefcase className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>Rolle: <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge></span>
            </div>
            {user.assigned_employee_name && (
              <div className="flex items-center">
                <UserRound className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>
                  Zugewiesener Mitarbeiter: {user.assigned_employee_name}
                  {user.assigned_employee_status && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {user.assigned_employee_status}
                    </Badge>
                  )}
                </span>
              </div>
            )}
            {user.assigned_customer_name && (
              <div className="flex items-center">
                <UserRound className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>Zugewiesener Kunde: {user.assigned_customer_name}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}