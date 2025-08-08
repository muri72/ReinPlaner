import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

console.log("--- EXTREMELY BAREBONES MIDDLEWARE.TS LOADED ---"); // NEUER TOP-LEVEL LOG

export function middleware(request: NextRequest) {
  console.log("Extremely Barebones Middleware: Executing for path:", request.nextUrl.pathname); // NEUER FUNKTIONS-LOG
  return NextResponse.next();
}

export const config = {
  matcher: ['/'], // Nur die Root-URL abfangen für diesen Test
};