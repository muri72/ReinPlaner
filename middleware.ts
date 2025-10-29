import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)
  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = request.nextUrl;

  // Check for impersonation session
  const impersonationSessionId = request.cookies.get('impersonation_session')?.value;
  let effectiveRole = null;
  let isImpersonating = false;

  if (impersonationSessionId && session) {
    // Verify impersonation session is valid
    const { data: impersonationSession } = await supabase
      .from('impersonation_sessions')
      .select('impersonated_role, is_active')
      .eq('id', impersonationSessionId)
      .eq('admin_user_id', session.user.id)
      .single();
    
    if (impersonationSession?.is_active) {
      effectiveRole = impersonationSession.impersonated_role;
      isImpersonating = true;
    }
  }

  // If not impersonating, get user's actual role
  if (!effectiveRole) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session?.user.id)
      .single();

    if (profileError) {
      console.error("Fehler beim Abrufen des Benutzerprofils:", profileError?.message || JSON.stringify(profileError));
    }

    effectiveRole = profileData?.role || 'employee'; // Standard auf 'employee', falls Rolle nicht gefunden
  }

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

  // Den korrekten Basis-Dashboard-Pfad für die Benutzerrolle bestimmen
  let baseDashboardPath: string;
  if (effectiveRole === 'customer') {
    baseDashboardPath = '/portal/dashboard';
  } else if (effectiveRole === 'employee') {
    baseDashboardPath = '/employee/dashboard';
  } else { // admin oder manager
    baseDashboardPath = '/dashboard';
  }

  // --- 3. Rollenbasierte Routen-Erzwingung ---

  // Wenn der Benutzer auf '/login' oder '/' ist, leite ihn zu seinem korrekten Basis-Dashboard um
  if (pathname === '/login' || pathname === '/') {
    return NextResponse.redirect(new URL(baseDashboardPath, request.url));
  }

  // Spezifische Regeln für jede Rolle, um sicherzustellen, dass sie in ihren erlaubten Bereichen bleiben
  if (effectiveRole === 'customer') {
    // Kunden MÜSSEN sich in /portal/* befinden
    if (!pathname.startsWith('/portal')) {
      return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }
  } else if (effectiveRole === 'employee') {
    // Mitarbeiter MÜSSEN sich in /employee/* befinden
    if (!pathname.startsWith('/employee')) {
      return NextResponse.redirect(new URL('/employee/dashboard', request.url));
    }
  } else if (effectiveRole === 'admin' || effectiveRole === 'manager') {
    // Admins/Manager DÜRFEN NICHT in /portal/* oder /employee/* sein
    if (pathname.startsWith('/portal') || pathname.startsWith('/employee')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Add impersonation info to response headers for client-side access
  if (isImpersonating) {
    response.headers.set('x-impersonating', 'true');
    response.headers.set('x-impersonated-role', effectiveRole);
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