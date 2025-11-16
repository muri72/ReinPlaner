import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error during auth callback:', error.message)
      return NextResponse.redirect(new URL('/login?error=auth_error', requestUrl.origin))
    }
  }

  // URL to redirect to after sign in process completes
  // Redirect to the root, and let the middleware handle the role-based redirect.
  return NextResponse.redirect(new URL(next, requestUrl.origin))
}