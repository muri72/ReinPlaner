import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)
  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = request.nextUrl;

  // --- 1. Behandlung von nicht authentifizierten Benutzern ---
  if (!session) {
    // Erlaube Zugriff auf öffentliche Pfade (Login, Auth Callback)
    if (pathname === '/login' || pathname.startsWith('/auth/callback')) {
      return response;
    }
    // Leite alle anderen Pfade zum Login um
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // --- 2. Behandlung von authentifizierten Benutzern ---
  // Benutzerrolle abrufen
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  const userRole = profileData?.role || 'employee'; // Standard auf 'employee', falls Rolle nicht gefunden

  // Den korrekten Basis-Dashboard-Pfad für die Benutzerrolle bestimmen
  let baseDashboardPath: string;
  if (userRole === 'customer') {
    baseDashboardPath = '/portal/dashboard';
  } else if (userRole === 'employee') {
    baseDashboardPath = '/employee/dashboard';
  } else { // admin oder manager
    baseDashboardPath = '/dashboard';
  }

  // Explizit erlaubte gemeinsame /dashboard-Pfade für Mitarbeiter (Ausnahmen zur allgemeinen Regel)
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

  // --- 3. Rollenbasierte Routen-Erzwingung ---

  // Wenn der Benutzer auf '/login' oder '/' ist, leite ihn zu seinem korrekten Basis-Dashboard um
  if (pathname === '/login' || pathname === '/') {
    return NextResponse.redirect(new URL(baseDashboardPath, request.url));
  }

  // Spezifische Regeln für jede Rolle, um sicherzustellen, dass sie in ihren erlaubten Bereichen bleiben
  if (userRole === 'customer') {
    // Kunden MÜSSEN sich in /portal/* befinden
    if (!pathname.startsWith('/portal')) {
      return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }
  } else if (userRole === 'employee') {
    // Mitarbeiter MÜSSEN sich in /employee/* ODER in erlaubten /dashboard/* Pfaden befinden
    const isAllowedPath = pathname.startsWith('/employee') || allowedEmployeeSharedDashboardPaths.some(path => pathname.startsWith(path));
    if (!isAllowedPath) {
      return NextResponse.redirect(new URL('/employee/dashboard', request.url));
    }
  } else if (userRole === 'admin' || userRole === 'manager') {
    // Admins/Manager DÜRFEN NICHT in /portal/* oder /employee/* sein
    if (pathname.startsWith('/portal') || pathname.startsWith('/employee')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Wenn keine der oben genannten Umleitungsregeln zutrifft, erlaube die Anfrage.
  return response;
}

export const config = {
  matcher: [
    /*
     * Alle Anfragewege abgleichen, außer denen, die beginnen mit:
     * - _next/static (statische Dateien)
     * - _next/image (Bildoptimierungsdateien)
     * - favicon.ico (Favicon-Datei)
     * - beliebige Dateien im öffentlichen Ordner (z.B. /vercel.svg)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}