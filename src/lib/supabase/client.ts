import { createBrowserClient } from '@supabase/ssr'

// Lazy initialization to avoid build-time errors when env vars aren't set
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a mock client for build-time static generation / preview deployments
    // This prevents the entire app from crashing when env vars aren't configured
    console.warn('Supabase env vars not set — using placeholder client');
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder_anon_key'
    );
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}