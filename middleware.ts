/**
 * Multi-Tenant Middleware
 * Detects tenant from subdomain and adds to request headers
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define your main domain here
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost';
const MAIN_DOMAIN_PORT = process.env.NEXT_PUBLIC_PORT || '3000';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  console.log(`[Middleware] Request to: ${hostname}${pathname}`);

  // Extract subdomain
  let subdomain: string | null = null;

  // Handle localhost with port (e.g., cleanspace.localhost:3000)
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.');
    if (parts.length > 1 && parts[0] !== 'localhost') {
      subdomain = parts[0];
    }
  } else {
    // Handle production domains (e.g., cleanspace.yoursaas.com)
    const parts = hostname.split('.');

    // Check if it's a subdomain (more than 2 parts for .com, more than 3 for .co.uk, etc.)
    if (parts.length >= 3) {
      // Get first part as subdomain, unless it's 'www'
      if (parts[0] !== 'www') {
        subdomain = parts[0];
      }
    }
  }

  console.log(`[Middleware] Detected subdomain: ${subdomain || 'none'}`);

  // Skip middleware for:
  // - API routes (handled in API route itself)
  // - Static files
  // - Next.js internals
  const skipPaths = [
    '/api/',
    '/_next/',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
  ];

  if (skipPaths.some(path => pathname.startsWith(path))) {
    const response = NextResponse.next();
    if (subdomain) {
      response.headers.set('x-tenant-subdomain', subdomain);
    }
    return response;
  }

  // If no subdomain and not super admin route, redirect to www or show tenant selector
  if (!subdomain && !pathname.startsWith('/super-admin')) {
    // For now, allow access without subdomain (backward compatibility during migration)
    // TODO: After migration, redirect to tenant selection page
    console.log('[Middleware] No subdomain detected, allowing access');
  }

  // If subdomain detected, add to headers for use in API routes and pages
  const response = NextResponse.next();

  if (subdomain) {
    response.headers.set('x-tenant-subdomain', subdomain);
    response.cookies.set('tenant_subdomain', subdomain, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
