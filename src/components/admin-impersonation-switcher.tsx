"use client";

import React, { useState, useEffect } from "react";
import { Users, UserCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getUsersForImpersonation, startImpersonation } from "@/lib/actions/impersonation";
import { toast } from "sonner";

interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  email: string | null;
}

export function AdminImpersonationSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setFetchingUsers(true);
        const usersData = await getUsersForImpersonation();
        setUsers(usersData || []);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Fehler beim Laden der Benutzer");
      } finally {
        setFetchingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  const handleStartImpersonation = async () => {
    if (!selectedUserId) {
      toast.error("Bitte wählen Sie einen Benutzer aus");
      return;
    }

    try {
      setLoading(true);
      const result = await startImpersonation(selectedUserId);
      
      if (result.success) {
        toast.success("Impersonation gestartet");
        window.location.reload(); // Reload to apply impersonation
      } else {
        toast.error("Fehler beim Starten der Impersonation");
      }
    } catch (error: any) {
      console.error("Error starting impersonation:", error);
      toast.error(error.message || "Fehler beim Starten der Impersonation");
    } finally {
      setLoading(false);
      setIsOpen(false);
      setSelectedUserId("");
    }
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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'manager': return 'Manager';
      case 'employee': return 'Mitarbeiter';
      case 'customer': return 'Kunde';
      default: return role;
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserCheck className="h-4 w-4 mr-2" />
          Impersonieren
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Benutzer-Impersonation
          </DialogTitle>
          <DialogDescription>
            Wählen Sie einen Benutzer aus, als den Sie sich anmelden möchten. Diese Aktion wird protokolliert.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {fetchingUsers ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="ml-2">Lade Benutzer...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <AlertCircle className="h-5 w-5 mr-2" />
              Keine Benutzer zum Impersonieren gefunden
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium">Benutzer auswählen</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Benutzer auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center">
                            <span>
                              {user.first_name} {user.last_name}
                            </span>
                            {user.email && (
                              <span className="text-sm text-muted-foreground ml-2">
                                ({user.email})
                              </span>
                            )}
                          </div>
                          <Badge variant={getRoleBadgeVariant(user.role)} className="ml-2">
                            {getRoleLabel(user.role)}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedUser && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-1">Ausgewählter Benutzer:</p>
                  <div className="flex items-center justify-between">
                    <span>
                      {selectedUser.first_name} {selectedUser.last_name}
                    </span>
                    <Badge variant={getRoleBadgeVariant(selectedUser.role)}>
                      {getRoleLabel(selectedUser.role)}
                    </Badge>
                  </div>
                  {selectedUser.email && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedUser.email}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleStartImpersonation}
                  disabled={!selectedUserId || loading}
                >
                  {loading ? "Wird gestartet..." : "Impersonation starten"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}