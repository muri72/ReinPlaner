/**
 * Root page - serves as entry point
 * If user is authenticated → redirect to /dashboard
 * If user is not authenticated → show landing page (via (marketing) route group)
 */
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LandingPage } from '@/components/landing-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ReinPlaner – Die Software für Gebäudereinigung',
  description: 'Planung, Zeiterfassung, Abrechnung – alles in einem.',
};

export default async function HomePage() {
  const supabase = await createClient();
  
  // Check if user is actually authenticated (not just has a session)
  const { data: { user }, error } = await supabase.auth.getUser();

  // If authenticated (has user and no error), redirect to dashboard
  if (user && !error) {
    redirect('/dashboard');
  }

  // If not authenticated, show landing page
  return <LandingPage />;
}