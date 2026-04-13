import { createBrowserClient } from '@supabase/ssr'

// Lazy initialization to avoid build-time errors when env vars aren't set
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a mock client for build-time static generation
    // The actual client will be created on the client side when needed
    if (typeof window === 'undefined') {
      // Server-side during build: return a placeholder
      return createBrowserClient(
        'https://placeholder.supabase.co',
        'placeholder_anon_key'
      );
    }
    // Client-side: throw helpful error
    throw new Error('Environment variable NEXT_PUBLIC_SUPABASE_URL is not set.');
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}