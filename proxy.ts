import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'
import { extractTenantFromSubdomain } from '@/lib/tenant/types'
import { getTenantBySlug } from '@/lib/tenant/registry'

export const runtime = 'edge'

const PUBLIC_PATHS = new Set([
  '/', '/pricing', '/register', '/impressum', '/datenschutz', '/agb',
])

const AUTH_PATHS = new Set(['/login', '/role-pending'])

const PLATFORM_HOSTS = new Set([
  'localhost',
  'reinplaner.de',
  'www.reinplaner.de',
  'reinplaner.vercel.app',
])

function isPlatformHost(host: string): boolean {
  const h = host.split(':')[0].toLowerCase()
  if (PLATFORM_HOSTS.has(h)) return true
  if (h.endsWith('.vercel.app')) return true
  return false
}

export async function proxy(request: NextRequest) {
  const { supabase, response } = createClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // --- Public paths ---
  const isPublicPath = PUBLIC_PATHS.has(pathname)
    || pathname.startsWith('/auth/callback')
    || AUTH_PATHS.has(pathname)

  // --- 1. Unauthenticated users ---
  if (!user) {
    if (isPublicPath) return response
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // --- 2. Authenticated users: fetch role + tenant_id ---
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error(
      'Fehler beim Abrufen des Benutzerprofils:',
      profileError?.message || JSON.stringify(profileError),
    )
  }

  // SECURITY: do NOT default to a privileged role. If profile is missing,
  // route the user to /role-pending so admin can assign a role.
  const userRole = (profileData?.role as string | undefined) || 'unknown'
  const userTenantId = (profileData?.tenant_id as string | null | undefined) || null

  if (userRole === 'unknown') {
    if (pathname === '/role-pending' || pathname.startsWith('/auth/')) {
      return response
    }
    return NextResponse.redirect(new URL('/role-pending', request.url))
  }

  // --- 3. Subdomain ↔ tenant_id validation (defense in depth) ---
  // Skip for platform hosts (Vercel preview, localhost, root domain).
  if (!isPlatformHost(hostname) && userRole !== 'platform_admin') {
    const slug = extractTenantFromSubdomain(hostname)
    if (slug && slug !== 'reinplaner') {
      try {
        const tenant = await getTenantBySlug(slug)
        if (!tenant || (userTenantId && tenant.id !== userTenantId)) {
          // Wrong subdomain for this user — sign-out + redirect to login
          await supabase.auth.signOut()
          return NextResponse.redirect(new URL('/login?error=wrong_tenant', request.url))
        }
      } catch (err) {
        console.error('Subdomain validation failed:', err)
      }
    }
  }

  // --- 4. Determine base dashboard for role ---
  let baseDashboardPath: string
  if (userRole === 'customer') {
    baseDashboardPath = '/portal/dashboard'
  } else if (userRole === 'employee') {
    baseDashboardPath = '/employee/dashboard'
  } else {
    // admin, manager, platform_admin
    baseDashboardPath = '/dashboard'
  }

  // --- 5. Route enforcement ---
  if (pathname === '/login') {
    return NextResponse.redirect(new URL(baseDashboardPath, request.url))
  }

  if (userRole === 'customer') {
    if (!pathname.startsWith('/portal')) {
      return NextResponse.redirect(new URL('/portal/dashboard', request.url))
    }
  } else if (userRole === 'employee') {
    if (!pathname.startsWith('/employee')) {
      return NextResponse.redirect(new URL('/employee/dashboard', request.url))
    }
  } else if (
    userRole === 'admin'
    || userRole === 'manager'
    || userRole === 'platform_admin'
  ) {
    if (pathname.startsWith('/portal') || pathname.startsWith('/employee')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
