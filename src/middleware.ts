import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UserRole, hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  const isLoggedIn = !!session?.user;
  const userRole = session?.user?.user_metadata?.role as UserRole;
  const isImpersonating = session?.user?.user_metadata?.impersonationData;

  // Define public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/api/auth',
    '/api/webhooks',
  ];

  // Define role-based route patterns
  const roleRoutes = {
    admin: [
      '/dashboard/admin',
      '/dashboard/users',
      '/dashboard/settings',
      '/dashboard/audit',
    ],
    manager: [
      '/dashboard/manager',
      '/dashboard/customers',
      '/dashboard/employees',
      '/dashboard/orders',
    ],
    employee: [
      '/dashboard/employee',
      '/dashboard/orders/my',
      '/dashboard/objects',
    ],
    customer: [
      '/portal',
      '/portal/dashboard',
      '/portal/orders',
      '/portal/profile',
    ],
  };

  // Check if current path is public
  const isPublicRoute = publicRoutes.some(route => 
    nextUrl.pathname.startsWith(route)
  );

  // Allow access to public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role-based access
  const hasRoleAccess = (role: UserRole, path: string): boolean => {
    // Admin can access everything
    if (role === 'admin') return true;

    // Check specific role routes
    const allowedRoutes = roleRoutes[role] || [];
    return allowedRoutes.some(route => path.startsWith(route));
  };

  // Special handling for impersonation
  if (isImpersonating) {
    const targetRole = isImpersonating.targetRole as UserRole;
    
    // During impersonation, check access based on target role
    if (!hasRoleAccess(targetRole, nextUrl.pathname)) {
      // Redirect to appropriate dashboard for impersonated role
      const redirectPath = getRoleBasedRedirectPath(targetRole);
      return NextResponse.redirect(new URL(redirectPath, nextUrl));
    }
  } else {
    // Normal role-based access check
    if (!hasRoleAccess(userRole, nextUrl.pathname)) {
      // Redirect to appropriate dashboard for user's role
      const redirectPath = getRoleBasedRedirectPath(userRole);
      return NextResponse.redirect(new URL(redirectPath, nextUrl));
    }
  }

  // Permission-based route checks for specific endpoints
  const permissionRoutes = [
    {
      path: '/dashboard/orders/new',
      permission: PERMISSIONS.ORDER_CREATE,
    },
    {
      path: '/dashboard/customers/new',
      permission: PERMISSIONS.CUSTOMER_CREATE,
    },
    {
      path: '/dashboard/employees/new',
      permission: PERMISSIONS.EMPLOYEE_CREATE,
    },
    {
      path: '/dashboard/objects/new',
      permission: PERMISSIONS.OBJECT_CREATE,
    },
  ];

  for (const route of permissionRoutes) {
    if (nextUrl.pathname.startsWith(route.path)) {
      const effectiveRole = isImpersonating 
        ? isImpersonating.targetRole as UserRole
        : userRole;
        
      if (!hasPermission(effectiveRole, route.permission)) {
        return NextResponse.redirect(new URL('/dashboard', nextUrl));
      }
      break;
    }
  }

  // API route protection
  if (nextUrl.pathname.startsWith('/api/')) {
    // Skip auth routes
    if (nextUrl.pathname.startsWith('/api/auth/')) {
      return NextResponse.next();
    }

    // Check API permissions based on endpoint
    const apiPermissions = {
      '/api/orders': PERMISSIONS.ORDER_READ,
      '/api/customers': PERMISSIONS.CUSTOMER_READ,
      '/api/employees': PERMISSIONS.EMPLOYEE_READ,
      '/api/users': PERMISSIONS.USER_READ,
      '/api/objects': PERMISSIONS.OBJECT_READ,
    };

    for (const [apiPath, permission] of Object.entries(apiPermissions)) {
      if (nextUrl.pathname.startsWith(apiPath)) {
        const effectiveRole = isImpersonating 
          ? isImpersonating.targetRole as UserRole
          : userRole;
          
        if (!hasPermission(effectiveRole, permission)) {
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          );
        }
        break;
      }
    }
  }

  return NextResponse.next();
}

function getRoleBasedRedirectPath(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/dashboard/admin';
    case 'manager':
      return '/dashboard/manager';
    case 'employee':
      return '/dashboard/employee';
    case 'customer':
      return '/portal/dashboard';
    default:
      return '/dashboard';
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};