import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)

  // Refresh session if expired - required for Server Components
  // and ensures the session is up to date for client-side logic
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl;

  // Allow access to auth pages without authentication
  if (pathname.startsWith('/login') || pathname.startsWith('/auth/callback')) {
    if (session) {
      // If authenticated, redirect from login to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return response; // Allow access to login/callback
  }

  // Protect all other routes, redirect to login if not authenticated
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
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