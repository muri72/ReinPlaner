import type { Metadata } from "next";
import { MarketingPage } from "@/components/ui/marketing-page";

export const metadata: Metadata = {
  title: "Impressum – ReinPlaner",
  description: "Impressum der ReinPlaner Software für Gebäudereinigung.",
};

export default function ImpressumPage() {
  return (
    <MarketingPage maxWidth="lg">
      <h1 className="text-3xl font-bold text-white mb-8">Impressum</h1>

      <div className="glass-card p-8 space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-white mt-6 mb-4">Angaben gemäß § 5 TMG</h2>
          
          <p className="text-slate-300 mb-4">
            <strong className="text-white">ReinPlaner</strong><br />
            Musterstraße 123<br />
            12345 Musterstadt<br />
            Deutschland
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-6 mb-4">Kontakt</h2>
          <p className="text-slate-300 mb-2">
            E-Mail: <a href="mailto:info@reinplaner.de" className="text-blue-400 hover:underline">info@reinplaner.de</a>
          </p>
          <p className="text-slate-300 mb-4">
            Telefon: <a href="tel:+49123456789" className="text-blue-400 hover:underline">+49 (0) 123 456 789</a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-6 mb-4">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
          <p className="text-slate-300 mb-4">
            Max Mustermann<br />
            Musterstraße 123<br />
            12345 Musterstadt
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-6 mb-4">Haftung für Inhalte</h2>
          <p className="text-slate-400 mb-4">
            Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-6 mb-4">Haftung für Links</h2>
          <p className="text-slate-400 mb-4">
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-6 mb-4">Umsatzsteuer-ID</h2>
          <p className="text-slate-300 mb-4">
            Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz: DE 123 456 789
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-6 mb-4">Streitschlichtung</h2>
          <p className="text-slate-400 mb-4">
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr/</a>. Unsere E-Mail-Adresse finden Sie oben im Impressum.
          </p>
        </section>
      </div>
    </MarketingPage>
  );
}
