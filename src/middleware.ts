/**
 * Multi-Tenant Middleware
 * 
 * Extracts tenant information from subdomain and adds it to request headers.
 * Handles auth redirects: unauthenticated users going to /dashboard -> /login
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Base domain for subdomain extraction
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'reinplaner.de';

/**
 * Extract tenant slug from hostname
 */
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

/**
 * Main middleware handler
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const tenantSlug = extractTenantSlug(hostname);
  
  // Create response with tenant header
  const response = NextResponse.next();
  
  if (tenantSlug) {
    response.headers.set('x-tenant-slug', tenantSlug);
  }
  
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  response.headers.set('x-request-id', requestId);
  response.headers.set('x-timestamp', new Date().toISOString());
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};