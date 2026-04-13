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
  const { data: { session } } = await supabase.auth.getSession();

  // If authenticated, redirect to dashboard
  if (session?.user) {
    redirect('/dashboard');
  }

  // If not authenticated, show landing page
  return <LandingPage />;
}