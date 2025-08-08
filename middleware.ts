import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)

  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl;

  // Wenn angemeldet und versucht, auf die Root-URL '/' zuzugreifen, zum Dashboard weiterleiten
  if (session && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Zugriff auf Auth-Seiten ohne Authentifizierung erlauben
  if (pathname.startsWith('/login') || pathname.startsWith('/auth/callback')) {
    if (session) {
      // Wenn angemeldet, von der Login-Seite zum Dashboard weiterleiten
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return response; // Zugriff auf Login/Callback erlauben
  }

  // Alle anderen Routen schützen, bei nicht angemeldeten Benutzern zur Login-Seite weiterleiten
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