import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)
  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = request.nextUrl;

  // --- 1. Handle unauthenticated users ---
  if (!session) {
    // Allow access to public paths (Login, Auth Callback)
    if (pathname === '/login' || pathname.startsWith('/auth/callback')) {
      return response;
    }
    // Redirect all other paths to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // --- 2. Handle authenticated users: Fetch user role ---
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  // If there's an error fetching the profile or no profile data,
  // it means the user might not have a profile entry or there's a DB issue.
  // In this case, it's safer to redirect to login.
  if (profileError || !profileData) {
    console.error("Middleware: Fehler beim Abrufen des Benutzerprofils oder Profil nicht gefunden:", profileError?.message || JSON.stringify(profileError));
    // Clear session and redirect to login to force re-authentication or profile creation
    await supabase.auth.signOut(); // Important: clear session
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const userRole = profileData.role as 'admin' | 'manager' | 'employee' | 'customer';

  // Determine the correct base dashboard path for the user role
  let baseDashboardPath: string;
  if (userRole === 'customer') {
    baseDashboardPath = '/portal/dashboard';
  } else if (userRole === 'employee') {
    baseDashboardPath = '/employee/dashboard';
  } else { // admin or manager
    baseDashboardPath = '/dashboard';
  }

  // --- 3. Role-based route enforcement ---

  // If the user is on '/login' or '/', redirect them to their correct base dashboard
  if (pathname === '/login' || pathname === '/') {
    return NextResponse.redirect(new URL(baseDashboardPath, request.url));
  }

  // Enforce strict path prefixes based on role
  if (userRole === 'customer') {
    if (!pathname.startsWith('/portal')) {
      return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }
  } else if (userRole === 'employee') {
    if (!pathname.startsWith('/employee')) {
      return NextResponse.redirect(new URL('/employee/dashboard', request.url));
    }
  } else if (userRole === 'admin' || userRole === 'manager') {
    // Admins/Managers should not be in /portal/* or /employee/*
    if (pathname.startsWith('/portal') || pathname.startsWith('/employee')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // If none of the above redirection rules apply, allow the request.
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