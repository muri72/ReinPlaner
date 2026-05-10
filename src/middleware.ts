/**
 * Multi-Tenant Middleware
 * 
 * Extracts tenant information from subdomain and adds it to request headers.
 * Auth and RBAC are handled in dashboard/layout.tsx
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'reinplaner.de';

function extractTenantSlug(hostname: string): string | null {
  const host = hostname.split(':')[0];
  
  if (host.endsWith(`.${BASE_DOMAIN}`)) {
    const subdomain = host.replace(`.${BASE_DOMAIN}`, '');
    if (subdomain && subdomain !== 'www' && subdomain !== 'app' && subdomain !== 'api') {
      return subdomain;
    }
  }
  
  if (host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}`) {
    return process.env.DEFAULT_TENANT_SLUG || 'reinplaner';
  }
  
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const tenantSlug = extractTenantSlug(hostname);

  const response = NextResponse.next();

  if (tenantSlug) {
    response.headers.set('x-tenant-slug', tenantSlug);
  }

  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  response.headers.set('x-request-id', requestId);
  response.headers.set('x-timestamp', new Date().toISOString());

  // Edge caching for API and dashboard routes
  if (pathname.startsWith('/api/') || pathname.startsWith('/dashboard/')) {
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=30, stale-while-revalidate=60'
    );
  }

  // Security headers for all responses
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // CSP only for HTML pages (not API routes)
  if (!pathname.startsWith('/api/')) {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    );
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};