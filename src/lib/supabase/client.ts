import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  console.log("createClient (browser): Initializing Supabase client."); // NEUER LOG
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}