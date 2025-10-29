"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserRole = 'admin' | 'manager' | 'employee' | 'customer';

interface PermissionGateProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
  fallback?: React.ReactNode;
  requireAll?: boolean; // If true, user must have ALL required roles (for multiple roles)
}

export function PermissionGate({ 
  children, 
  requiredRole, 
  requiredRoles = [], 
  fallback = null, 
  requireAll = false 
}: PermissionGateProps) {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setUserRole(null);
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        setUserRole(profile?.role as UserRole || null);
      } catch (error) {
        console.error("Error checking user role:", error);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, []);

  if (loading) {
    return fallback;
  }

  if (!userRole) {
    return fallback;
  }

  // Check if user has required permission
  const hasPermission = requiredRole 
    ? userRole === requiredRole
    : requiredRoles.length > 0
      ? requireAll 
        ? requiredRoles.every(role => userRole === role)
        : requiredRoles.some(role => userRole === role)
      : true; // No role requirement means everyone has access

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

// Convenience components for common role checks
export function AdminOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate requiredRole="admin" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function ManagerOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate requiredRole="manager" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function EmployeeOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate requiredRole="employee" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function CustomerOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate requiredRole="customer" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function AdminOrManagerOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate requiredRoles={['admin', 'manager']} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

export function AdminOrManagerOrEmployeeOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate requiredRoles={['admin', 'manager', 'employee']} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}