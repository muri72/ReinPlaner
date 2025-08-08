import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

console.log("--- MINIMAL MIDDLEWARE.TS LOADED ---");

export function middleware(request: NextRequest) {
  console.log("Minimal Middleware: Executing for path:", request.nextUrl.pathname);
  return NextResponse.next();
}

export const config = {
  matcher: ['/'], // Nur die Root-URL abfangen für diesen Test
};