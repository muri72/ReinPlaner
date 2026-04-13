/**
 * Root page - always shows landing page for guests
 * Authenticated users are redirected via middleware
 */
import { LandingPage } from '@/components/landing-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ReinPlaner – Die Software für Gebäudereinigung',
  description: 'Planung, Zeiterfassung, Abrechnung – alles in einem.',
};

export default function HomePage() {
  return <LandingPage />;
}