/**
 * RBAC Service - Role-Based Access Control utilities for Supabase
 * 
 * This module provides utilities for enforcing RBAC at the data level
 * using Supabase Row Level Security (RLS) policies.
 * 
 * Roles:
 * - admin: Full access to all tenant data
 * - manager: Can manage employees, orders, and view reports
 * - employee: Can access time-tracking and planning, view assigned orders
 * - customer: Read-only access to their own data
 * - platform_admin: Cross-tenant admin for reinplaner.vercel.app only (Murat only)
 */

import { createClient } from '@/lib/supabase/server';

// ============================================
// ROLE CHECKS (used in server components and API routes)
// ============================================

/**
 * Get the role of a user from their profile
 */
export async function getUserRole(userId: string): Promise<string | null> {
  const supabase = await createClient();
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
    
  if (error || !profile) {
    return null;
  }
  
  return profile.role;
}

/**
 * Check if user is admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'admin';
}

/**
 * Check if user is manager
 */
export async function isManager(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'manager';
}

/**
 * Check if user is employee (not admin or manager)
 */
export async function isEmployee(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'employee';
}

/**
 * Check if user is customer
 */
export async function isCustomer(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'customer';
}

/**
 * Check if user is platform_admin (cross-tenant admin - Murat only)
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'platform_admin';
}

// ============================================
// PERMISSION CHECKS
// ============================================

/**
 * Check if user can access a specific resource based on their role
 */
export async function canAccess(
  userId: string, 
  resource: 'orders' | 'employees' | 'customers' | 'time-tracking' | 'reports' | 'admin'
): Promise<boolean> {
  const role = await getUserRole(userId);
  
  if (!role) return false;
  
  // Admin can access everything
  if (role === 'admin') return true;
  
  switch (resource) {
    case 'orders':
      return ['admin', 'manager', 'employee'].includes(role);
    case 'employees':
      return ['admin', 'manager'].includes(role);
    case 'customers':
      return ['admin', 'manager', 'customer'].includes(role);
    case 'time-tracking':
      return ['admin', 'manager', 'employee'].includes(role);
    case 'reports':
      return ['admin', 'manager'].includes(role);
    case 'admin':
      return role === 'admin';
    default:
      return false;
  }
}

/**
 * Get the default redirect URL for a role
 */
export function getRoleDefaultRedirect(role: string | null): string {
  switch (role) {
    case 'admin':
      return '/dashboard';
    case 'manager':
      return '/dashboard/planning';
    case 'employee':
      return '/dashboard/time-tracking';
    case 'customer':
      return '/dashboard';
    default:
      return '/login';
  }
}

// ============================================
// TENANT ISOLATION (RLS helper)
// ============================================

/**
 * Get the tenant ID for a user
 */
export async function getUserTenantId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single();
    
  if (error || !profile) {
    return null;
  }
  
  return profile.tenant_id;
}

/**
 * Check if user belongs to a specific tenant
 */
export async function userBelongsToTenant(userId: string, tenantId: string): Promise<boolean> {
  const userTenantId = await getUserTenantId(userId);
  return userTenantId === tenantId;
}

// ============================================
// CURRENT USER HELPERS (were in services-rls.ts)
// ============================================

/**
 * Get the current user's role from their profile (no userId argument)
 */
export async function getCurrentUserRole(): Promise<'admin' | 'manager' | 'employee' | 'customer' | 'platform_admin' | 'support' | 'unknown'> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return 'unknown';
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return 'unknown';
  }

  return (profile.role as 'admin' | 'manager' | 'employee' | 'customer' | 'platform_admin' | 'support') || 'unknown';
}

/**
 * Get the current user's employee record
 */
export async function getCurrentEmployee() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: employee } = await supabase
    .from('employees')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return employee;
}

/**
 * Check if current user is assigned to a specific order
 */
export async function isAssignedToOrder(orderId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!employee) {
    return false;
  }

  const { data: shiftEmployee } = await supabase
    .from('order_employee_assignments')
    .select('id')
    .eq('order_id', orderId)
    .eq('employee_id', employee.id)
    .maybeSingle();

  return !!shiftEmployee;
}

/**
 * Filter records based on user role (for client-side filtering)
 */
export async function getRoleBasedFilter(tableName: 'orders' | 'customers' | 'time_entries' | 'shifts') {
  const role = await getCurrentUserRole();

  if (role === 'admin' || role === 'manager') {
    return {}; // Managers/admins see all tenant data
  }

  const employee = await getCurrentEmployee();
  if (!employee) {
    return { id: 'none' }; // No access
  }

  switch (tableName) {
    case 'orders':
      return { user_id: employee.user_id };
    case 'customers':
      return { user_id: employee.user_id };
    case 'time_entries':
      return { employee_id: employee.id };
    case 'shifts':
      return { employee_id: employee.id };
    default:
      return {};
  }
}

/**
 * Require role check - throws error if user doesn't have required role
 */
export async function requireRole(requiredRole: 'admin' | 'manager' | 'employee'): Promise<void> {
  const role = await getCurrentUserRole();

  if (requiredRole === 'admin' && role !== 'admin') {
    throw new Error('Administrator-Berechtigung erforderlich');
  }

  if (requiredRole === 'manager' && role !== 'admin' && role !== 'manager') {
    throw new Error('Manager-Berechtigung erforderlich');
  }

  if (requiredRole === 'employee' && role === 'unknown') {
    throw new Error('Authentifizierung erforderlich');
  }
}

/**
 * Require admin role - throws error if user isn't admin
 */
export async function requireAdmin(): Promise<void> {
  const role = await getCurrentUserRole();
  if (role !== 'admin') {
    throw new Error('Administrator-Berechtigung erforderlich');
  }
}

/**
 * Require manager role - throws error if user isn't admin, manager, or platform_admin
 */
export async function requireManager(): Promise<void> {
  const role = await getCurrentUserRole();
  if (role !== 'admin' && role !== 'manager' && role !== 'platform_admin') {
    throw new Error('Manager-Berechtigung erforderlich');
  }
}

/**
 * Require platform_admin role - throws error if user isn't platform_admin
 * Used for /dashboard/admin/* routes (cross-tenant access)
 */
export async function requirePlatformAdmin(): Promise<void> {
  const role = await getCurrentUserRole();
  if (role !== 'platform_admin') {
    throw new Error('Platform-Admin-Berechtigung erforderlich');
  }
}

// ============================================
// RLS POLICIES (SQL templates for Supabase)
// ============================================

/**
 * SQL to create RBAC RLS policies for a table
 * 
 * Usage: Run this SQL in Supabase SQL Editor
 */
export const RLS_POLICIES_SQL = `
-- Enable RLS
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Admin policy (full access)
CREATE POLICY "Admin full access" ON your_table
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Manager policy (read/write for tenant data)
CREATE POLICY "Manager read access" ON your_table
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Employee policy (read only own data)
CREATE POLICY "Employee read own" ON your_table
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR 
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'employee')
    )
  );
`;
