import Link from "next/link";
import type { Metadata } from "next";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  MessageCircle,
  Zap,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "Preise – ReinPlaner",
  description:
    "Transparent pricing for every business size. Starter €29, Professional €79, Enterprise €199. All plans include 14-day free trial.",
};

const plans = [
  {
    name: "Starter",
    price: "29",
    period: "Monat",
    description: "Für kleine Reinigungsfirmen mit bis zu 5 Mitarbeitern.",
    cta: "14 Tage kostenlos testen",
    highlighted: false,
    plan: "starter" as const,
    features: [
      { name: "Bis 5 Benutzer", included: true },
      { name: "1.000 Aufträge / Monat", included: true },
      { name: "Einsatzplanung (Kalender)", included: true },
      { name: "Zeiterfassung (Web + App)", included: true },
      { name: "Kundenverwaltung", included: true },
      { name: "Mitarbeiterverwaltung", included: true },
      { name: "E-Mail Support", included: true },
      { name: "API-Zugang", included: false },
      { name: "Prioritäts-Support", included: false },
      { name: "Erweiterte Berichte", included: false },
      { name: "Multi-Standort", included: false },
      { name: "Custom Domain", included: false },
      { name: "SSO-Integration", included: false },
      { name: "Dedizierter Support", included: false },
    ],
  },
  {
    name: "Professional",
    price: "79",
    period: "Monat",
    description: "Für wachsende Unternehmen mit bis zu 25 Mitarbeitern.",
    cta: "14 Tage kostenlos testen",
    highlighted: true,
    plan: "professional" as const,
    features: [
      { name: "Bis 25 Benutzer", included: true },
      { name: "Unbegrenzte Aufträge", included: true },
      { name: "Einsatzplanung (Kalender)", included: true },
      { name: "Zeiterfassung (Web + App)", included: true },
      { name: "Kundenverwaltung", included: true },
      { name: "Mitarbeiterverwaltung", included: true },
      { name: "E-Mail Support", included: true },
      { name: "API-Zugang", included: true },
      { name: "Prioritäts-Support", included: true },
      { name: "Erweiterte Berichte", included: true },
      { name: "Multi-Standort", included: true },
      { name: "Custom Domain", included: false },
      { name: "SSO-Integration", included: false },
      { name: "Dedizierter Support", included: false },
    ],
  },
  {
    name: "Enterprise",
    price: "199",
    period: "Monat",
    description: "Für große Organisationen mit unbegrenzten Möglichkeiten.",
    cta: "Kontakt aufnehmen",
    highlighted: false,
    plan: "enterprise" as const,
    features: [
      { name: "Unbegrenzte Benutzer", included: true },
      { name: "Unbegrenzte Aufträge", included: true },
      { name: "Einsatzplanung (Kalender)", included: true },
      { name: "Zeiterfassung (Web + App)", included: true },
      { name: "Kundenverwaltung", included: true },
      { name: "Mitarbeiterverwaltung", included: true },
      { name: "E-Mail Support", included: true },
      { name: "API-Zugang", included: true },
      { name: "Prioritäts-Support", included: true },
      { name: "Erweiterte Berichte", included: true },
      { name: "Multi-Standort", included: true },
      { name: "Custom Domain", included: true },
      { name: "SSO-Integration", included: true },
      { name: "Dedizierter Support", included: true },
    ],
  },
];

const faqs = [
  {
    question: "Kann ich meinen Plan später ändern?",
    answer:
      "Ja, Sie können Ihren Plan jederzeit upgraden oder downgraden. Bei einem Upgrade wird die Preisdifferenz sofort berechnet. Bei einem Downgrade wird die Änderung zum Ende des aktuellen Abrechnungszeitraums wirksam.",
  },
  {
    question: "Was passiert nach den 14 Tagen kostenlosem Test?",
    answer:
      "Nach Ablauf der 14-tägigen Testphase können Sie einen Plan auswählen und Ihr Konto正式lich freischalten. Es erfolgt keine automatische Berechnung.",
  },
  {
    question: "Fallen Setup-Kosten an?",
    answer:
      "Nein, es gibt keine Setup-Gebühren. Die Einrichtung erfolgt direkt in Ihrem Browser – keine Installation, keine Schulung erforderlich.",
  },
  {
    question: "Sind meine Daten sicher?",
    answer:
      "Absolut. Alle Daten werden in Deutschland gehostet und entsprechen der DSGVO. Wir nutzen moderne Verschlüsselung und regelmäßige Backups.",
  },
  {
    question: "Bieten Sie Support bei der Einrichtung?",
    answer:
      "Ja! Unser Team hilft Ihnen persönlich bei Fragen und Einrichtungsproblemen. Professional- und Enterprise-Kunden erhalten Prioritäts-Support.",
  },
  {
    question: "Kann ich mehrere Standorte verwalten?",
    answer:
      "Ja, mit dem Professional- und Enterprise-Plan können Sie mehrere Standorte und Teams zentral verwalten.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen">
      {/* ============ HERO SECTION ============ */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 bg-gradient-to-b from-blue-50 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Transparent & Fair
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">
            Der passende Plan für{" "}
            <span className="text-blue-600">Ihre Reinigungsfirma</span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            Wählen Sie den Plan, der zu Ihrem Unternehmen passt. Alle Pläne
            include 14 Tage kostenlos testen — ohne Kreditkarte.
          </p>
        </div>
      </section>

      {/* ============ PRICING CARDS ============ */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative overflow-hidden ${
                  plan.highlighted
                    ? "border-blue-600 border-2 shadow-xl"
                    : "border-slate-200 hover:shadow-lg"
                } transition-all`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white text-center text-xs font-semibold py-1.5">
                    Beliebteste Wahl
                  </div>
                )}
                <CardHeader className={plan.highlighted ? "pt-10" : ""}>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-base mt-2">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-slate-900">
                      €{plan.price}
                    </span>
                    <span className="text-slate-500 ml-1">/ {plan.period}</span>
                  </div>
                  <Button
                    asChild
                    className={`w-full mb-8 h-12 font-semibold ${
                      plan.highlighted
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : ""
                    }`}
                    variant={plan.highlighted ? "default" : "outline"}
                    size="lg"
                  >
                    <Link
                      href={
                        plan.plan === "enterprise"
                          ? "/#contact"
                          : `/register?plan=${plan.plan}`
                      }
                    >
                      {plan.cta}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature.name}
                        className="flex items-center gap-3 text-sm"
                      >
                        {feature.included ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-slate-300 shrink-0" />
                        )}
                        <span
                          className={
                            feature.included
                              ? "text-slate-700"
                              : "text-slate-400"
                          }
                        >
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ENTERPRISE CTA ============ */}
      <section className="py-16 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Brauchen Sie etwas Individuelles?
          </h2>
          <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto">
            Für große Organisationen mit speziellen Anforderungen bieten wir
            maßgeschneiderte Lösungen mit individueller Preisgestaltung.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-slate-900 hover:bg-slate-100 h-13 px-8 text-base font-semibold"
            >
              <Link href="/#contact">
                <MessageCircle className="w-5 h-5 mr-2" />
                Enterprise kontaktieren
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ============ FAQ SECTION ============ */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Häufig gestellte Fragen
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Alles, was Sie über unsere Preise wissen müssen.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left font-medium text-slate-900 hover:text-blue-600">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="w-6 h-6 fill-yellow-400 text-yellow-400"
              />
            ))}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Starten Sie noch heute — kostenlos
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Über 150 Reinigungsfirmen vertrauen bereits auf ReinPlaner.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-700 hover:bg-blue-50 h-13 px-8 text-base font-semibold shadow-lg"
            >
              <Link href="/register">
                14 Tage kostenlos testen
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-blue-200">
            Keine Kreditkarte erforderlich. Jederzeit kündbar.
          </p>
        </div>
      </section>
    </main>
  );
}
