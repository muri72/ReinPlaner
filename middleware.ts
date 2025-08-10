import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)
  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = request.nextUrl;

  // If no session, redirect protected routes to login
  if (!session) {
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/portal')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return response;
  }

  // If session exists, handle role-based routing
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  const userRole = profile?.role;

  // Redirect logged-in users away from the login page
  if (pathname === '/login') {
    const url = userRole === 'customer' ? '/portal/dashboard' : '/dashboard';
    return NextResponse.redirect(new URL(url, request.url));
  }

  // Role-based routing for the rest of the app
  if (userRole === 'customer') {
    // If a customer tries to access anything outside the portal, redirect them.
    // Exception for auth callback route.
    if (!pathname.startsWith('/portal') && pathname !== '/auth/callback') {
      return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }
  } else { // For admin, manager, employee
    // If an internal user tries to access the customer portal, redirect them to the main dashboard.
    if (pathname.startsWith('/portal')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // Also handle the root path for internal users
    if (pathname === '/') {
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