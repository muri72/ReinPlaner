'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, StopCircle, Users, Shield, AlertTriangle } from 'lucide-react';
import { startImpersonation, stopImpersonation, getAvailableUsersForImpersonation } from '@/lib/actions/impersonation';
import { createClient } from '@/lib/supabase/client';

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  created_at: string;
}

export function AdminImpersonationSwitcher() {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const checkImpersonationStatus = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setCurrentUser(session.user);
        const impersonationData = session.user.user_metadata?.impersonationData;
        setIsImpersonating(!!impersonationData);
      }
    };

    checkImpersonationStatus();
  }, []);

  useEffect(() => {
    if (currentUser && !isImpersonating) {
      loadAvailableUsers();
    }
  }, [currentUser, isImpersonating, selectedRole]);

  const loadAvailableUsers = async () => {
    try {
      setIsLoading(true);
      const users = await getAvailableUsersForImpersonation(
        selectedRole === 'all' ? undefined : selectedRole
      );
      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartImpersonation = async () => {
    if (!selectedUser) return;

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('targetUserId', selectedUser);
      
      const user = availableUsers.find(u => u.id === selectedUser);
      if (user) {
        formData.append('targetRole', user.role);
      }

      await startImpersonation(formData);
    } catch (error) {
      console.error('Failed to start impersonation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopImpersonation = async () => {
    try {
      setIsLoading(true);
      await stopImpersonation();
    } catch (error) {
      console.error('Failed to stop impersonation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return null;
  }

  if (isImpersonating) {
    const impersonationData = currentUser.user_metadata?.impersonationData;
    
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <User className="h-5 w-5" />
            Impersonation Aktiv
          </CardTitle>
          <CardDescription className="text-orange-700">
            Sie agieren derzeit als {impersonationData?.targetRole}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <Avatar>
              <AvatarImage src={currentUser.user_metadata?.avatar_url || ''} />
              <AvatarFallback>
                {currentUser.user_metadata?.first_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">
                {currentUser.user_metadata?.first_name} {currentUser.user_metadata?.last_name}
              </p>
              <p className="text-sm text-muted-foreground">{currentUser.email}</p>
              <Badge variant="secondary" className="mt-1">
                {impersonationData?.targetRole}
              </Badge>
            </div>
          </div>
          
          <Button
            onClick={handleStopImpersonation}
            disabled={isLoading}
            className="w-full"
            variant="destructive"
          >
            <StopCircle className="h-4 w-4 mr-2" />
            {isLoading ? 'Beende Impersonation...' : 'Impersonation Beenden'}
          </Button>
          
          <div className="text-xs text-orange-700 bg-orange-100 p-2 rounded">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            Alle Aktionen werden im Audit-Log protokolliert.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Impersonation
        </CardTitle>
        <CardDescription>
          Als anderer Benutzer anmelden, um deren Ansicht zu erleben
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Rolle filtern</label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Rolle auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Rollen</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Benutzer auswählen</label>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger>
              <SelectValue placeholder="Benutzer auswählen" />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {user.first_name?.charAt(0) || user.email.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm">
                        {user.first_name} {user.last_name}
                      </span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                    <Badge variant="outline" className="ml-auto">
                      {user.role}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleStartImpersonation}
          disabled={!selectedUser || isLoading}
          className="w-full"
        >
          <Users className="h-4 w-4 mr-2" />
          {isLoading ? 'Starte Impersonation...' : 'Als Benutzer anmelden'}
        </Button>

        <div className="text-xs text-muted-foreground">
          <AlertTriangle className="h-3 w-3 inline mr-1" />
          Diese Aktion wird im Audit-Log protokolliert.
        </div>
      </CardContent>
    </Card>
  );
}