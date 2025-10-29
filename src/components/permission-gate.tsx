'use client';

import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { UserRole } from '@/lib/permissions';

interface PermissionGateProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  role?: UserRole;
  roles?: UserRole[];
  fallback?: ReactNode;
  requireAuth?: boolean;
}

export function PermissionGate({
  children,
  permission,
  permissions,
  role,
  roles,
  fallback = null,
  requireAuth = true,
}: PermissionGateProps) {
  const {
    userRole,
    isAuthenticated,
    hasPermission,
    hasAnyPermission,
  } = usePermissions();

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    return <>{fallback}</>;
  }

  // Check role-based access
  if (role && userRole !== role) {
    return <>{fallback}</>;
  }

  if (roles && !roles.includes(userRole)) {
    return <>{fallback}</>;
  }

  // Check permission-based access
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  if (permissions && !hasAnyPermission(permissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}