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
  return role === 'admin' || role === 'platform_admin';
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

  // Admin and platform_admin can access everything
  if (role === 'admin' || role === 'platform_admin') return true;

  switch (resource) {
    case 'orders':
      return ['manager', 'employee'].includes(role);
    case 'employees':
      return ['manager'].includes(role);
    case 'customers':
      return ['manager', 'customer'].includes(role);
    case 'time-tracking':
      return ['manager', 'employee'].includes(role);
    case 'reports':
      return ['manager'].includes(role);
    case 'admin':
      return false;
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
    case 'platform_admin':
      return '/dashboard';
    case 'manager':
      return '/dashboard/planning';
    case 'employee':
      return '/employee/dashboard';
    case 'customer':
      return '/portal/dashboard';
    case 'unknown':
      return '/role-pending';
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
 * Filter records based on user role (for client-side filtering).
 *
 * For employees, orders/customers are scoped via the
 * `order_employee_assignments` join table — NOT `orders.user_id`
 * (which is the creator/admin). Returning a `user_id` filter on
 * orders/customers would yield zero rows for non-admin employees.
 *
 * This helper now returns either a simple equality filter (object)
 * or `{ orderIds: string[] }` for tables where pre-resolved IDs are
 * required. Callers should branch accordingly.
 */
export async function getRoleBasedFilter(tableName: 'orders' | 'customers' | 'time_entries' | 'shifts') {
  const role = await getCurrentUserRole();

  if (role === 'admin' || role === 'manager' || role === 'platform_admin') {
    return {}; // Managers/admins see all tenant data
  }

  const employee = await getCurrentEmployee();
  if (!employee) {
    return { id: 'none' }; // No access
  }

  switch (tableName) {
    case 'orders':
    case 'customers': {
      // Resolve assigned order IDs via join table
      const supabase = await createClient();
      const { data: assignments } = await supabase
        .from('order_employee_assignments')
        .select('order_id')
        .eq('employee_id', employee.id);

      const orderIds = (assignments || [])
        .map((a) => a.order_id as string)
        .filter(Boolean);

      if (orderIds.length === 0) {
        return { id: 'none' };
      }

      if (tableName === 'orders') {
        return { id: { in: orderIds } };
      }

      // customers: resolve customer_ids via the assigned orders
      const { data: orderRows } = await supabase
        .from('orders')
        .select('customer_id')
        .in('id', orderIds);

      const customerIds = Array.from(
        new Set((orderRows || []).map((o) => o.customer_id as string).filter(Boolean))
      );
      return customerIds.length > 0
        ? { id: { in: customerIds } }
        : { id: 'none' };
    }
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

  if (requiredRole === 'admin' && role !== 'admin' && role !== 'platform_admin') {
    throw new Error('Administrator-Berechtigung erforderlich');
  }

  if (
    requiredRole === 'manager' &&
    role !== 'admin' &&
    role !== 'manager' &&
    role !== 'platform_admin'
  ) {
    throw new Error('Manager-Berechtigung erforderlich');
  }

  if (requiredRole === 'employee' && role === 'unknown') {
    throw new Error('Authentifizierung erforderlich');
  }
}

/**
 * Require admin role - throws error if user isn't admin or platform_admin
 */
export async function requireAdmin(): Promise<void> {
  const role = await getCurrentUserRole();
  if (role !== 'admin' && role !== 'platform_admin') {
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
