import { LandingPage } from "@/components/landing-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ReinPlaner – Die Software für Gebäudereinigung",
  description:
    "Planung, Zeiterfassung, Abrechnung – alles in einem. Die intelligente Software für Reinigungsfirmen jeder Größe. Jetzt 14 Tage kostenlos testen.",
  openGraph: {
    title: "ReinPlaner – Die Software für Gebäudereinigung",
    description:
      "Planung, Zeiterfassung, Abrechnung – alles in einem. Für Reinigungsfirmen jeder Größe.",
    type: "website",
    locale: "de_DE",
  },
};

export default function HomePage() {
  return <LandingPage />;
}
