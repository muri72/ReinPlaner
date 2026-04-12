import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "AGB – ReinPlaner",
  description: "Allgemeine Geschäftsbedingungen der ReinPlaner Software.",
};

export default function AgbPage() {
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
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Allgemeine Geschäftsbedingungen (AGB)</h1>

        <Card className="border-slate-200">
          <CardContent className="prose prose-slate max-w-none p-8">
            <p className="text-sm text-slate-500 mb-6">
              <strong>Stand:</strong> 13. April 2026
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-4">1. Geltungsbereich</h2>
            <p className="text-slate-600 mb-4">
              Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung der Software-as-a-Service-Plattform „ReinPlaner" der ReinPlaner GmbH (nachfolgend „Anbieter"). Mit der Registrierung und Nutzung der Plattform erklärt sich der Nutzer mit diesen AGB einverstanden.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-4">2. Gegenstand der Leistung</h2>
            <p className="text-slate-600 mb-4">
              Der Anbieter stellt dem Nutzer eine cloudbasierte Software für die Gebäudereinigung zur Verfügung. Dies umfasst insbesondere:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-4 space-y-1">
              <li>Einsatzplanung und Tourenmanagement</li>
              <li>Zeiterfassung für Mitarbeiter</li>
              <li>Kunden- und Objektverwaltung</li>
              <li>Mitarbeiterverwaltung</li>
              <li>Abrechnungsfunktionen (soweit gebucht)</li>
            </ul>

            <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-4">3. Registrierung und Vertragsschluss</h2>
            <p className="text-slate-600 mb-4">
              Die Registrierung erfolgt über die Webseite des Anbieters. Der Vertrag kommt mit der Bestätigung der Registrierung durch den Anbieter und Annahme dieser AGB zustande.
            </p>
            <p className="text-slate-600 mb-4">
              Der Nutzer ist verpflichtet, wahrheitsgemäße und vollständige Angaben zu machen und diese aktuell zu halten.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-4">4. Testphase</h2>
            <p className="text-slate-600 mb-4">
              Der Anbieter gewährt eine 14-tägige kostenlose Testphase. Während dieser Zeit kann der Nutzer die Software mit allen Funktionen des gewählten Tarifs testen. Eine Zahlungsverpflichtung entsteht während der Testphase nicht.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-4">5. Preise und Zahlungsbedingungen</h2>
            <p className="text-slate-600 mb-4">
              Es gelten die zum Zeitpunkt der Buchung auf der Website angegebenen Preise. Alle Preise verstehen sich in Euro zzgl. der gesetzlichen MwSt.
            </p>
            <p className="text-slate-600 mb-4">
              Die Abrechnung erfolgt monatlich im Voraus. Zahlungen sind per Lastschrift, Kreditkarte oder Rechnung möglich.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-4">6. Laufzeit und Kündigung</h2>
            <p className="text-slate-600 mb-4">
              Der Vertrag wird auf unbestimmte Zeit geschlossen und kann jederzeit zum Monatsende gekündigt werden. Die Kündigung erfolgt über die Account-Einstellungen oder per E-Mail an support@reinplaner.de.
            </p>
            <p className="text-slate-600 mb-4">
              Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-4">7. Verfügbarkeit</h2>
            <p className="text-slate-600 mb-4">
              Der Anbieter strebt eine Verfügbarkeit von 99% im Jahresmittel an. Geplante Wartungsarbeiten werden nach Möglichkeit außerhalb der Geschäftszeiten durchgeführt.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-4">8. Datenschutz und Datensicherheit</h2>
            <p className="text-slate-600 mb-4">
              Der Anbieter verarbeitet personenbezogene Daten des Nutzers nach den Bestimmungen der DSGVO. Details ergeben sich aus der Datenschutzerklärung.
            </p>
            <p className="text-slate-600 mb-4">
              Der Nutzer ist für die Rechtmäßigkeit der Verarbeitung seiner Kunden- und Mitarbeiterdaten selbst verantwortlich.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-4">9. Haftung</h2>
            <p className="text-slate-600 mb-4">
              Die Haftung des Anbieters richtet sich nach den gesetzlichen Bestimmungen. Für Schäden, die nicht die Verletzung von Leben, Körper oder Gesundheit betreffen, haftet der Anbieter nur bei Vorsatz oder grober Fahrlässigkeit.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-4">10. Urheberrecht</h2>
            <p className="text-slate-600 mb-4">
              Die Software und alle zugehörigen Inhalte sind urheberrechtlich geschützt. Der Nutzer erhält ein nicht ausschließliches, nicht übertragbares Recht zur Nutzung der Software während der Vertragslaufzeit.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-4">11. Schlussbestimmungen</h2>
            <p className="text-slate-600 mb-4">
              Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist Musterstadt.
            </p>
            <p className="text-slate-600 mb-4">
              Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 mt-6 mb-4">Kontakt</h2>
            <p className="text-slate-600 mb-4">
              ReinPlaner GmbH<br />
              Musterstraße 123<br />
              12345 Musterstadt<br />
              E-Mail: <a href="mailto:info@reinplaner.de" className="text-blue-600 hover:underline">info@reinplaner.de</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
