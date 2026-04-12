/**
 * Multi-Tenant Middleware
 * 
 * Extracts tenant information from subdomain and adds it to request headers.
 * This runs before the request reaches the application.
 * 
 * Routing:
 * - https://firma1.reinplaner.de -> Tenant: firma1
 * - https://reinplaner.de -> Tenant: reinplaner (default)
 * - https://customdomain.com -> Tenant resolved via custom domain lookup
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Base domain for subdomain extraction
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'reinplaner.de';

/**
 * Extract tenant slug from hostname
 */
function extractTenantSlug(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];
  
  // Check for subdomain pattern: tenant.reinplaner.de
  if (host.endsWith(`.${BASE_DOMAIN}`)) {
    const subdomain = host.replace(`.${BASE_DOMAIN}`, '');
    // Skip common non-tenant subdomains
    if (subdomain && subdomain !== 'www' && subdomain !== 'app' && subdomain !== 'api') {
      return subdomain;
    }
  }
  
  // Check if it's the base domain itself (default/main tenant)
  if (host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}`) {
    return process.env.DEFAULT_TENANT_SLUG || 'reinplaner';
  }
  
  // Custom domain - return null (will be resolved via header)
  return null;
}

/**
 * Main middleware handler
 */
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const tenantSlug = extractTenantSlug(hostname);
  
  // Create response with tenant header
  const response = NextResponse.next();
  
  // Add tenant slug to headers for downstream use
  if (tenantSlug) {
    response.headers.set('x-tenant-slug', tenantSlug);
  }
  
  // Add request ID for tracing
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  response.headers.set('x-request-id', requestId);
  
  // Add timestamp
  response.headers.set('x-timestamp', new Date().toISOString());
  
  return response;
}

/**
 * Configure which paths the middleware should run on
 */
export const config = {
  matcher: [
    // Match all paths except static files and api routes that don't need tenant context
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
