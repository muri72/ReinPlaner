export type UserRole = 'admin' | 'manager' | 'employee' | 'customer';

export interface Permission {
  resource: string;
  action: string;
  condition?: (user: any, resource: any) => boolean;
}

export const PERMISSIONS = {
  // Order permissions
  ORDER_CREATE: 'order:create',
  ORDER_READ: 'order:read',
  ORDER_UPDATE: 'order:update',
  ORDER_DELETE: 'order:delete',
  ORDER_ASSIGN: 'order:assign',
  ORDER_APPROVE: 'order:approve',
  
  // Customer permissions
  CUSTOMER_CREATE: 'customer:create',
  CUSTOMER_READ: 'customer:read',
  CUSTOMER_UPDATE: 'customer:update',
  CUSTOMER_DELETE: 'customer:delete',
  
  // Employee permissions
  EMPLOYEE_CREATE: 'employee:create',
  EMPLOYEE_READ: 'employee:read',
  EMPLOYEE_UPDATE: 'employee:update',
  EMPLOYEE_DELETE: 'employee:delete',
  
  // Object permissions
  OBJECT_CREATE: 'object:create',
  OBJECT_READ: 'object:read',
  OBJECT_UPDATE: 'object:update',
  OBJECT_DELETE: 'object:delete',
  
  // User management permissions
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_IMPERSONATE: 'user:impersonate',
  
  // System permissions
  AUDIT_READ: 'audit:read',
  SYSTEM_CONFIG: 'system:config',
} as const;

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: Object.values(PERMISSIONS),
  manager: [
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.ORDER_READ,
    PERMISSIONS.ORDER_UPDATE,
    PERMISSIONS.ORDER_DELETE,
    PERMISSIONS.ORDER_ASSIGN,
    PERMISSIONS.ORDER_APPROVE,
    PERMISSIONS.CUSTOMER_CREATE,
    PERMISSIONS.CUSTOMER_READ,
    PERMISSIONS.CUSTOMER_UPDATE,
    PERMISSIONS.CUSTOMER_DELETE,
    PERMISSIONS.EMPLOYEE_READ,
    PERMISSIONS.EMPLOYEE_UPDATE,
    PERMISSIONS.OBJECT_CREATE,
    PERMISSIONS.OBJECT_READ,
    PERMISSIONS.OBJECT_UPDATE,
    PERMISSIONS.OBJECT_DELETE,
  ],
  employee: [
    PERMISSIONS.ORDER_READ,
    PERMISSIONS.OBJECT_READ,
    PERMISSIONS.CUSTOMER_READ,
  ],
  customer: [
    PERMISSIONS.ORDER_READ,
    PERMISSIONS.OBJECT_READ,
  ],
};

export function hasPermission(userRole: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
}

export function hasAnyPermission(userRole: UserRole, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

export function canAccessResource(
  userRole: UserRole,
  permission: string,
  resourceOwnerId?: string,
  currentUserId?: string
): boolean {
  // Check basic permission
  if (!hasPermission(userRole, permission)) {
    return false;
  }
  
  // Check ownership for certain resources
  if (resourceOwnerId && currentUserId && resourceOwnerId !== currentUserId) {
    // Admins can access all resources
    if (userRole !== 'admin') {
      return false;
    }
  }
  
  return true;
}