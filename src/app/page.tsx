/**
 * Root page - serves as entry point
 * If user is authenticated → redirect to /dashboard
 * If user is not authenticated → show landing page
 */
import { redirect } from 'next/navigation';
import { LandingPage } from '@/components/landing-page';
import type { Metadata } from 'next';

// Lazy import to avoid build-time errors
async function getUser(): Promise<{ user: any; error: any }> {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    return await supabase.auth.getUser();
  } catch {
    // If Supabase fails (e.g., env vars not set during build), assume not authenticated
    return { user: null, error: { message: 'Supabase not configured' } };
  }
}

export const metadata: Metadata = {
  title: 'ReinPlaner – Die Software für Gebäudereinigung',
  description: 'Planung, Zeiterfassung, Abrechnung – alles in einem.',
};

export default async function HomePage() {
  const { user, error } = await getUser();

  // If authenticated (has user and no error), redirect to dashboard
  if (user && !error) {
    redirect('/dashboard');
  }

  // If not authenticated, show landing page
  return <LandingPage />;
}