import type { Metadata } from "next";
import { MarketingPage } from "@/components/ui/marketing-page";

export const metadata: Metadata = {
  title: "Datenschutzerklärung – ReinPlaner",
  description: "Datenschutzerklärung für die ReinPlaner Software.",
};

export default function DatenschutzPage() {
  return (
    <MarketingPage maxWidth="lg">
      <h1 className="text-3xl font-bold text-white mb-8">Datenschutzerklärung</h1>

      <div className="glass-card p-8 space-y-8">
        <p className="text-sm text-slate-400">
          <strong className="text-white">Stand:</strong> 13. April 2026
        </p>

        <section>
          <h2 className="text-xl font-semibold text-white mt-6 mb-4">1. Datenschutz auf einen Blick</h2>
          
          <h3 className="text-lg font-semibold text-white mt-4 mb-2">Allgemeine Hinweise</h3>
          <p className="text-slate-400 mb-4">
            Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie unsere Website besuchen oder unsere Software nutzen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-6 mb-4">2. Datenerfassung auf unserer Website und in unserer Software</h2>
          
          <h3 className="text-lg font-semibold text-white mt-4 mb-2">Wer ist verantwortlich für die Datenerfassung?</h3>
          <p className="text-slate-400 mb-4">
            Die Datenverarbeitung auf dieser Website und in unserer Software erfolgt durch uns als Anbieter. Unsere Kontaktdaten finden Sie im Impressum.
          </p>

          <h3 className="text-lg font-semibold text-white mt-4 mb-2">Welche Daten erfassen wir?</h3>
          <ul className="list-disc list-inside text-slate-400 mb-4 space-y-1">
            <li>Name und Kontaktdaten (bei Registrierung)</li>
            <li>Firmenname und -adresse (bei Registrierung)</li>
            <li>Nutzungsdaten (z.B. IP-Adresse, Browser-Typ, Zeitstempel)</li>
            <li>Daten, die Sie im Rahmen der Nutzung eingeben (Kunden, Mitarbeiter, Aufträge)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-6 mb-4">3. Hosting</h2>
          <p className="text-slate-400 mb-4">
            Unsere Website und Software werden auf Servern in Deutschland gehostet. Der Hosting-Anbieter ist die Supabase Inc. mit Sitz in San Francisco, USA, und unsere eigenen Server befinden sich in Deutschland.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-6 mb-4">4. Kontaktformular und Registrierung</h2>
          <p className="text-slate-400 mb-4">
            Wenn Sie uns per Kontaktformular Anfragen zukommen lassen oder sich registrieren, werden Ihre Angaben aus dem Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage und für den Fall von Anschlussfragen bei uns gespeichert.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-6 mb-4">5. Ihre Rechte</h2>
          <p className="text-slate-400 mb-4">
            Sie haben jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung sowie ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten.
          </p>
          <p className="text-slate-400 mb-4">
            Wenn Sie eine Einwilligung zur Datenverarbeitung erteilt haben, können Sie diese jederzeit widerrufen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-6 mb-4">6. SSL-Verschlüsselung</h2>
          <p className="text-slate-400 mb-4">
            Diese Seite nutzt aus Sicherheitsgründen eine SSL-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von „http://" auf „https://" wechselt und an dem Schloss-Symbol in Ihrer Browserzeile.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-6 mb-4">7. Cookies</h2>
          <p className="text-slate-400 mb-4">
            Wir verwenden Cookies, um die Nutzung unserer Dienste zu verbessern. Cookies sind kleine Textdateien, die auf Ihrem Endgerät gespeichert werden.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-6 mb-4">8. Google Fonts</h2>
          <p className="text-slate-400 mb-4">
            Unsere Website verwendet Google Fonts zur einheitlichen Darstellung von Schriftarten. Beim Aufruf einer Seite lädt Ihr Browser die benötigten Fonts in ihren Browsercache, um Texte und Schriftarten korrekt anzuzeigen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-6 mb-4">9. Änderungen dieser Datenschutzerklärung</h2>
          <p className="text-slate-400 mb-4">
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-6 mb-4">10. Kontakt</h2>
          <p className="text-slate-400 mb-4">
            Bei Fragen zum Datenschutz kontaktieren Sie uns bitte:<br />
            E-Mail: <a href="mailto:datenschutz@reinplaner.de" className="text-blue-400 hover:underline">datenschutz@reinplaner.de</a>
          </p>
        </section>
      </div>
    </MarketingPage>
  );
}
