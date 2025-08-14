import { createServerClient } from '@supabase/ssr'
import { createClient as createStandardClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Environment variable NEXT_PUBLIC_SUPABASE_URL is not set.');
  }
  if (!supabaseAnonKey) {
    throw new Error('Environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.');
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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