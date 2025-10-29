import { createClient } from '@/lib/supabase/server';
import { UserRole, hasPermission, hasAnyPermission, PERMISSIONS } from './permissions';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  isImpersonating?: boolean;
  originalRole?: UserRole;
  originalUserId?: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) return null;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', session.user.id)
      .single();
    
    if (!profile) return null;
    
    // Check for impersonation in session metadata
    const impersonationData = session.user.user_metadata?.impersonationData;
    if (impersonationData && profile.role === 'admin') {
      return {
        id: impersonationData.targetUserId,
        email: session.user.email || '',
        role: impersonationData.targetRole,
        isImpersonating: true,
        originalRole: profile.role,
        originalUserId: profile.id,
      };
    }
    
    return {
      id: profile.id,
      email: session.user.email || '',
      role: profile.role,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

export async function requirePermission(permission: string): Promise<AuthUser> {
  const user = await requireAuth();
  
  if (!hasPermission(user.role, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
  
  return user;
}

export async function requireAnyPermission(permissions: string[]): Promise<AuthUser> {
  const user = await requireAuth();
  
  if (!hasAnyPermission(user.role, permissions)) {
    throw new Error(`Permission denied: Required one of ${permissions.join(', ')}`);
  }
  
  return user;
}

export async function requireResourceAccess(
  permission: string,
  resourceOwnerId?: string
): Promise<AuthUser> {
  const user = await requireAuth();
  
  if (!hasPermission(user.role, permission)) {
    throw new Error(`Resource access denied: ${permission}`);
  }
  
  // Check ownership for non-admin users
  if (user.role !== 'admin' && resourceOwnerId && resourceOwnerId !== user.id) {
    throw new Error('Access denied: You can only access your own resources');
  }
  
  return user;
}

export function createAuthGuard(permission?: string | string[]) {
  return async () => {
    if (Array.isArray(permission)) {
      return await requireAnyPermission(permission);
    } else if (permission) {
      return await requirePermission(permission);
    } else {
      return await requireAuth();
    }
  };
}

// Server Actions Security Wrapper
export function withAuth<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  options: {
    permission?: string | string[];
    requireOwnership?: boolean;
    ownershipField?: string;
  } = {}
) {
  return async (...args: T): Promise<R> => {
    const user = options.permission 
      ? Array.isArray(options.permission)
        ? await requireAnyPermission(options.permission)
        : await requirePermission(options.permission)
      : await requireAuth();
    
    // Check ownership if required
    if (options.requireOwnership && options.ownershipField) {
      const resource = args[0]; // Assume first argument contains the resource
      const ownerId = resource[options.ownershipField];
      
      if (user.role !== 'admin' && ownerId && ownerId !== user.id) {
        throw new Error('Access denied: You can only access your own resources');
      }
    }
    
    return await action(...args);
  };
}