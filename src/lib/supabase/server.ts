import { createServerClient } from '@supabase/ssr'
import { cookies, ReadonlyRequestCookies } from 'next/headers'

export function createClient() {
  const cookieStore: ReadonlyRequestCookies = cookies()

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