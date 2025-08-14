import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)
  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = request.nextUrl;

  // Define public paths that don't require authentication or specific role checks
  const publicPaths = ['/login', '/auth/callback'];

  // If no session, redirect protected routes to login
  if (!session) {
    // If trying to access any dashboard-related path without a session, redirect to login
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/portal') || pathname.startsWith('/employee')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return response; // Allow access to other public paths
  }

  // If session exists, fetch user role
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  const userRole = profileData?.role || 'employee'; // Default to employee if role not found

  // Determine the correct dashboard path based on role
  let correctDashboardPath = '/dashboard';
  if (userRole === 'customer') {
    correctDashboardPath = '/portal/dashboard';
  } else if (userRole === 'employee') {
    correctDashboardPath = '/employee/dashboard';
  }

  // Redirect from login page or root to the correct dashboard if already logged in
  if (pathname === '/login' || pathname === '/') {
    return NextResponse.redirect(new URL(correctDashboardPath, request.url));
  }

  // Define explicitly allowed shared /dashboard paths for employees
  const allowedEmployeeSharedDashboardPaths = [
    '/dashboard/orders',
    '/dashboard/objects',
    '/dashboard/employees',
    '/dashboard/absence-requests',
    '/dashboard/time-tracking',
    '/dashboard/feedback',
    '/dashboard/profile',
    '/dashboard/customer-contacts',
    '/dashboard/notifications',
  ];

  // Strict Role-based Route Enforcement for authenticated users
  // Rule 1: Customer can ONLY access /portal/* routes
  if (userRole === 'customer') {
    if (!pathname.startsWith('/portal')) {
      return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }
  }
  // Rule 2: Employee can ONLY access /employee/* routes OR specific shared /dashboard/* routes
  else if (userRole === 'employee') {
    const isAllowedEmployeePath = pathname.startsWith('/employee') || allowedEmployeeSharedDashboardPaths.some(path => pathname.startsWith(path));
    if (!isAllowedEmployeePath) {
      return NextResponse.redirect(new URL('/employee/dashboard', request.url));
    }
  }
  // Rule 3: Admin/Manager can NOT access /portal/* or /employee/* routes
  else if (userRole === 'admin' || userRole === 'manager') {
    if (pathname.startsWith('/portal') || pathname.startsWith('/employee')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - any files in the public folder (e.g. /vercel.svg)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}