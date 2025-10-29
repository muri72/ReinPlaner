'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { UserRole, hasPermission, hasAnyPermission } from '@/lib/permissions';

export function usePermissions() {
  const [userRole, setUserRole] = useState<UserRole>('employee');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const getUserRole = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setIsAuthenticated(true);
        
        // Check for impersonation
        const impersonationData = session.user.user_metadata?.impersonationData;
        if (impersonationData) {
          setUserRole(impersonationData.targetRole);
        } else {
          // Get user role from profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          if (profile) {
            setUserRole(profile.role);
          }
        }
      } else {
        setIsAuthenticated(false);
        setUserRole('employee');
      }
    };

    getUserRole();

    // Listen for auth changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        
        const impersonationData = session.user.user_metadata?.impersonationData;
        if (impersonationData) {
          setUserRole(impersonationData.targetRole);
        } else {
          getUserRole();
        }
      } else {
        setIsAuthenticated(false);
        setUserRole('employee');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    userRole,
    isAuthenticated,
    hasPermission: (permission: string) => hasPermission(userRole, permission),
    hasAnyPermission: (permissions: string[]) => hasAnyPermission(userRole, permissions),
    isAdmin: userRole === 'admin',
    isManager: userRole === 'manager',
    isEmployee: userRole === 'employee',
    isCustomer: userRole === 'customer',
    canManageOrders: hasPermission(userRole, 'order:create') || hasPermission(userRole, 'order:update'),
    canManageUsers: hasPermission(userRole, 'user:create') || hasPermission(userRole, 'user:update'),
    canImpersonate: hasPermission(userRole, 'user:impersonate'),
  };
}