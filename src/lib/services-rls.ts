/**
 * RLS (Row Level Security) Service Layer
 * Centralized functions for checking user permissions and roles
 * Based on Supabase RLS policies
 */

import { createClient } from '@/lib/supabase/server';

export type UserRole = 'admin' | 'manager' | 'worker' | 'unknown';

/**
 * Get the current user's role from their profile
 */
export async function getUserRole(): Promise<UserRole> {
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

  return (profile.role as UserRole) || 'unknown';
}

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'admin';
}

/**
 * Check if current user is manager
 */
export async function isManager(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'manager' || role === 'admin';
}

/**
 * Check if current user is worker
 */
export async function isWorker(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'worker';
}

/**
 * Check if current user can perform action on a record based on their role
 * This is a client-side check that complements server-side RLS policies
 */
export async function canEditRecord(
  tableName: 'orders' | 'employees' | 'customers' | 'time_entries' | 'shifts',
  recordId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { allowed: false, reason: 'Nicht authentifiziert' };
  }

  const role = await getUserRole();

  // Admins can do everything
  if (role === 'admin') {
    return { allowed: true };
  }

  switch (tableName) {
    case 'orders': {
      const { data: order } = await supabase
        .from('orders')
        .select('user_id')
        .eq('id', recordId)
        .single();

      if (role === 'manager') {
        return { allowed: true };
      }

      if (role === 'worker' && order?.user_id === user.id) {
        return { allowed: true };
      }

      return { allowed: false, reason: 'Keine Berechtigung für diesen Auftrag' };
    }

    case 'employees': {
      const { data: employee } = await supabase
        .from('employees')
        .select('user_id')
        .eq('id', recordId)
        .single();

      if (role === 'manager') {
        return { allowed: true };
      }

      if (employee?.user_id === user.id) {
        return { allowed: true };
      }

      return { allowed: false, reason: 'Keine Berechtigung für diesen Mitarbeiter' };
    }

    case 'customers': {
      const { data: customer } = await supabase
        .from('customers')
        .select('user_id')
        .eq('id', recordId)
        .single();

      if (role === 'manager') {
        return { allowed: true };
      }

      if (customer?.user_id === user.id) {
        return { allowed: true };
      }

      return { allowed: false, reason: 'Keine Berechtigung für diesen Kunden' };
    }

    case 'time_entries': {
      const { data: entry } = await supabase
        .from('time_entries')
        .select('employee_id')
        .eq('id', recordId)
        .single();

      if (role === 'manager') {
        return { allowed: true };
      }

      if (entry?.employee_id) {
        const { data: employee } = await supabase
          .from('employees')
          .select('user_id')
          .eq('id', entry.employee_id)
          .single();

        if (employee?.user_id === user.id) {
          return { allowed: true };
        }
      }

      return { allowed: false, reason: 'Keine Berechtigung für diesen Zeiteintrag' };
    }

    case 'shifts': {
      const { data: shift } = await supabase
        .from('shifts')
        .select('assignment_id')
        .eq('id', recordId)
        .single();

      if (role === 'manager') {
        return { allowed: true };
      }

      if (shift?.assignment_id) {
        const { data: assignment } = await supabase
          .from('order_employee_assignments')
          .select('employee_id')
          .eq('id', shift.assignment_id)
          .single();

        if (assignment?.employee_id) {
          const { data: employee } = await supabase
            .from('employees')
            .select('user_id')
            .eq('id', assignment.employee_id)
            .single();

          if (employee?.user_id === user.id) {
            return { allowed: true };
          }
        }
      }

      return { allowed: false, reason: 'Keine Berechtigung für diesen Einsatz' };
    }

    default:
      return { allowed: false, reason: 'Unbekannte Tabelle' };
  }
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

  const { data: assignment } = await supabase
    .from('order_employee_assignments')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle();

  if (!assignment) {
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
 * Returns the appropriate filter for Supabase queries
 */
export function getRoleBasedFilter(tableName: 'orders' | 'customers' | 'time_entries' | 'shifts') {
  return isManager().then(isMgr => {
    if (isMgr) {
      return {}; // Managers see all
    }

    return getCurrentEmployee().then(employee => {
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
    });
  });
}

/**
 * Require role check - throws error if user doesn't have required role
 */
export async function requireRole(requiredRole: 'admin' | 'manager' | 'worker'): Promise<void> {
  const role = await getUserRole();

  if (requiredRole === 'admin' && role !== 'admin') {
    throw new Error('Administrator-Berechtigung erforderlich');
  }

  if (requiredRole === 'manager' && role !== 'admin' && role !== 'manager') {
    throw new Error('Manager-Berechtigung erforderlich');
  }

  if (requiredRole === 'worker' && role === 'unknown') {
    throw new Error('Authentifizierung erforderlich');
  }
}

/**
 * Require admin role - throws error if user isn't admin
 */
export async function requireAdmin(): Promise<void> {
  const isAdminUser = await isAdmin();
  if (!isAdminUser) {
    throw new Error('Administrator-Berechtigung erforderlich');
  }
}

/**
 * Require manager role - throws error if user isn't admin or manager
 */
export async function requireManager(): Promise<void> {
  const isManagerUser = await isManager();
  if (!isManagerUser) {
    throw new Error('Manager-Berechtigung erforderlich');
  }
}
