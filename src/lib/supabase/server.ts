import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createStandardClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return (cookieStore as any).get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            // The cast to `any` is required to bypass a TypeScript error
            // where `ReadonlyRequestCookies` does not have a `set` method.
            (cookieStore as any).set(name, value, options)
          } catch (error) {
            // Ignore error
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            // The cast to `any` is required to bypass a TypeScript error.
            (cookieStore as any).set(name, '', options)
          } catch (error) {
            // Ignore error
          }
        },
      },
    }
  )
}

// Neue Funktion für den Supabase Admin Client
export function createAdminClient() {
  // Dieser Client ist für serverseitige Operationen und verwendet den Service Role Key.
  // Er benötigt kein Cookie-Management, da er RLS umgeht.
  // Wir verwenden hier den Standard-Client von @supabase/supabase-js.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Environment variable NEXT_PUBLIC_SUPABASE_URL is not set.');
  }
  if (!serviceRoleKey) {
    throw new Error('Environment variable SUPABASE_SERVICE_ROLE_KEY is not set.');
  }

  return createStandardClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        // Es ist wichtig, die Sitzungspersistenz auf dem Server zu deaktivieren.
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}