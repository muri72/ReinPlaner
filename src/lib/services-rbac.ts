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
