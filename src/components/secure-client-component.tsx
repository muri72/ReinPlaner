'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { UserRole, hasPermission } from '@/lib/permissions';

interface SecureClientComponentProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  role?: UserRole;
  roles?: UserRole[];
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

export function SecureClientComponent({
  children,
  permission,
  permissions,
  role,
  roles,
  fallback = null,
  requireAuth = true,
}: SecureClientComponentProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('employee');

  useEffect(() => {
    const checkAuthorization = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user && requireAuth) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      if (!session?.user && !requireAuth) {
        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }

      // Get user role
      const impersonationData = session?.user?.user_metadata?.impersonationData;
      let currentUserRole: UserRole;

      if (impersonationData) {
        currentUserRole = impersonationData.targetRole;
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session?.user?.id || '')
          .single();
        
        currentUserRole = profile?.role || 'employee';
      }

      setUserRole(currentUserRole);

      // Check role-based access
      if (role && currentUserRole !== role) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      if (roles && !roles.includes(currentUserRole)) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      // Check permission-based access
      if (permission && !hasPermission(currentUserRole, permission)) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      if (permissions && !permissions.some(p => hasPermission(currentUserRole, p))) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      setIsAuthorized(true);
      setIsLoading(false);
    };

    checkAuthorization();
  }, [permission, permissions, role, roles, requireAuth]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthorized) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}