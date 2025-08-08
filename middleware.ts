import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  console.log("Middleware: Executing for path:", request.nextUrl.pathname); // NEUER LOG
  const { supabase, response } = createClient(request)

  // Refresh session if expired - required for Server Components
  // and ensures the session is up to date for client-side logic
  const { data: { session } } = await supabase.auth.getSession()
  console.log("Middleware: Session status:", session ? "Session exists." : "No session."); // NEUER LOG

  const { pathname } = request.nextUrl;

  // Wenn angemeldet und versucht, auf die Root-URL '/' zuzugreifen, zum Dashboard weiterleiten
  if (session && pathname === '/') {
    console.log("Middleware: Redirecting authenticated user from / to /dashboard."); // NEUER LOG
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Zugriff auf Auth-Seiten ohne Authentifizierung erlauben
  if (pathname.startsWith('/login') || pathname.startsWith('/auth/callback')) {
    if (session) {
      // Wenn angemeldet, von der Login-Seite zum Dashboard weiterleiten
      console.log("Middleware: Redirecting authenticated user from auth page to /dashboard."); // NEUER LOG
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    console.log("Middleware: Allowing access to auth page."); // NEUER LOG
    return response; // Zugriff auf Login/Callback erlauben
  }

  // Alle anderen Routen schützen, bei nicht angemeldeten Benutzern zur Login-Seite weiterleiten
  if (!session) {
    console.log("Middleware: No session, redirecting to /login."); // NEUER LOG
    return NextResponse.redirect(new URL('/login', request.url));
  }

  console.log("Middleware: Allowing access to protected route."); // NEUER LOG
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