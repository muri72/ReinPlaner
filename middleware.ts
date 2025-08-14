import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)
  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = request.nextUrl;

  // If no session, redirect protected routes to login
  if (!session && pathname.startsWith('/dashboard') && !pathname.startsWith('/portal') && !pathname.startsWith('/employee')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If session exists, fetch user role
  if (session) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const userRole = profileData?.role || 'employee'; // Default to employee if role not found

    // Redirect from login page to appropriate dashboard
    if (pathname === '/login') {
      if (userRole === 'customer') {
        return NextResponse.redirect(new URL('/portal/dashboard', request.url));
      } else if (userRole === 'employee') {
        return NextResponse.redirect(new URL('/employee/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Redirect from root to appropriate dashboard
    if (pathname === '/') {
      if (userRole === 'customer') {
        return NextResponse.redirect(new URL('/portal/dashboard', request.url));
      } else if (userRole === 'employee') {
        return NextResponse.redirect(new URL('/employee/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Ensure users are on their correct dashboard path if they try to access others
    if (pathname.startsWith('/dashboard') && userRole !== 'admin' && userRole !== 'manager') {
      if (userRole === 'customer') {
        return NextResponse.redirect(new URL('/portal/dashboard', request.url));
      } else if (userRole === 'employee') {
        return NextResponse.redirect(new URL('/employee/dashboard', request.url));
      }
    }
    if (pathname.startsWith('/portal/dashboard') && userRole !== 'customer') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (pathname.startsWith('/employee/dashboard') && userRole !== 'employee') {
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