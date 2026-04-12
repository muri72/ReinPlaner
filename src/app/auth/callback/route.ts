import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email/send'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'
  const type = requestUrl.searchParams.get('type') // signup, magiclink, recovery, email_change

  if (code) {
    const supabase = await createClient()

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error during auth callback:', error.message)
      return NextResponse.redirect(new URL('/login?error=auth_error', requestUrl.origin))
    }

    // Send welcome email on successful email verification (signup confirmation)
    if (type === 'signup' && data.user) {
      const email = data.user.email
      const firstName = data.user.user_metadata?.first_name || 
                        data.user.user_metadata?.full_name?.split(' ')[0] || 
                        'Kunde'
      const companyName = data.user.user_metadata?.company_name
      const planName = 'Professional' // Default plan during trial

      if (email) {
        // Send welcome email asynchronously (don't block redirect)
        sendWelcomeEmail(email, firstName, companyName, planName)
          .then((result) => {
            if (result.success) {
              console.log(`[Welcome Email] Sent to ${email}`)
            } else {
              console.error(`[Welcome Email] Failed to send to ${email}:`, result.error)
            }
          })
          .catch((err) => {
            console.error('[Welcome Email] Exception:', err)
          })
      }
    }
  }

  // URL to redirect to after sign in process completes
  // Redirect to the root, and let the middleware handle the role-based redirect.
  return NextResponse.redirect(new URL(next, requestUrl.origin))
}