import { createServerClient } from '@supabase/ssr'
import { createClient as createStandardClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set(name, value, options)
          } catch (error) {
            // The `cookies().set()` method can only be called from a Server Component or Server Action.
            // This error is typically ignored if we're in a Client Component.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete(name)
          } catch (error) {
            // The `cookies().delete()` method can only be called from a Server Component or Server Action.
            // This error is typically ignored if we're in a Client Component.
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
  return createStandardClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        // Es ist wichtig, die Sitzungspersistenz auf dem Server zu deaktivieren.
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}