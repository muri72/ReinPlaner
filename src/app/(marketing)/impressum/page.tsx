import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Impressum – ReinPlaner",
  description: "Impressum der ReinPlaner Software für Gebäudereinigung.",
};

export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Zurück zur Startseite</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Impressum</h1>

        <Card className="border-slate-200">
          <CardContent className="prose prose-slate max-w-none p-8">
            <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-4">Angaben gemäß § 5 TMG</h2>
            
            <p className="text-slate-600 mb-4">
              <strong>ReinPlaner</strong><br />
              Musterstraße 123<br />
              12345 Musterstadt<br />
              Deutschland
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-4">Kontakt</h2>
            <p className="text-slate-600 mb-2">
              E-Mail: <a href="mailto:info@reinplaner.de" className="text-blue-600 hover:underline">info@reinplaner.de</a>
            </p>
            <p className="text-slate-600 mb-4">
              Telefon: <a href="tel:+49123456789" className="text-blue-600 hover:underline">+49 (0) 123 456 789</a>
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-4">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
            <p className="text-slate-600 mb-4">
              Max Mustermann<br />
              Musterstraße 123<br />
              12345 Musterstadt
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-4">Haftung für Inhalte</h2>
            <p className="text-slate-600 mb-4">
              Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-4">Haftung für Links</h2>
            <p className="text-slate-600 mb-4">
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-4">Umsatzsteuer-ID</h2>
            <p className="text-slate-600 mb-4">
              Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz: DE 123 456 789
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-4">Streitschlichtung</h2>
            <p className="text-slate-600 mb-4">
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr/</a>. Unsere E-Mail-Adresse finden Sie oben im Impressum.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
