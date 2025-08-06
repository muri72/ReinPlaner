import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)

  // Refresh session if expired - required for Server Components
  // and ensures the session is up to date for client-side logic
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl;

  console.log(`[Middleware] Pathname: ${pathname}`);
  console.log(`[Middleware] Session exists: ${!!session}`);
  if (session) {
    console.log(`[Middleware] User ID: ${session.user.id}`);
  }

  // Handle root path '/'
  if (pathname === '/') {
    if (session) {
      console.log("[Middleware] Redirecting / to /dashboard (logged in)");
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      console.log("[Middleware] Redirecting / to /login (not logged in)");
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Allow access to auth pages without authentication
  if (pathname.startsWith('/login') || pathname.startsWith('/auth/callback')) {
    if (session) {
      // If authenticated, redirect from login to dashboard
      console.log(`[Middleware] Redirecting ${pathname} to /dashboard (already logged in)`);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    console.log(`[Middleware] Allowing access to ${pathname}`);
    return response; // Allow access to login/callback
  }

  // Protect all other routes, redirect to login if not authenticated
  if (!session) {
    console.log(`[Middleware] Protecting ${pathname}, redirecting to /login (not logged in)`);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  console.log(`[Middleware] Allowing access to ${pathname} (logged in)`);
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