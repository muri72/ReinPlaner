import Link from "next/link";
import type { Metadata } from "next";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  MessageCircle,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MarketingHeader } from "@/components/marketing-header";
import { MarketingFooter } from "@/components/marketing-footer";

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

const trustBadges = [
  { icon: Shield, text: "DSGVO-konform" },
  { icon: Zap, text: "5 Minuten Setup" },
  { icon: CheckCircle2, text: "Keine Kreditkarte" },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-900">
      <MarketingHeader />

      {/* ============ HERO SECTION ============ */}
      <section className="pt-24 pb-16 sm:pt-32 sm:pb-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Trust Badges */}
          <div className="inline-flex flex-wrap items-center justify-center gap-4 mb-6">
            {trustBadges.map((badge) => (
              <div key={badge.text} className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                <badge.icon className="w-4 h-4 text-[var(--accent-blue)] dark:text-[var(--accent-blue)]" />
                <span>{badge.text}</span>
              </div>
            ))}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
            Der passende Plan für{" "}
            <span className="text-[var(--accent-blue)] dark:text-[var(--accent-blue)]">Ihre Reinigungsfirma</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Wählen Sie den Plan, der zu Ihrem Unternehmen passt. Alle Pläne
            include 14 Tage kostenlos testen — ohne Kreditkarte.
          </p>
        </div>
      </section>

      {/* ============ PRICING CARDS ============ */}
      <section className="py-16 bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-8 rounded-2xl bg-white dark:bg-[var(--bg-surface)] border ${
                  plan.highlighted
                    ? "border-blue-500 border-2 shadow-xl dark:shadow-none"
                    : "border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none"
                } transition-all duration-300`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--accent-blue)] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm">
                    Beliebteste Wahl
                  </div>
                )}
                <div className={plan.highlighted ? "pt-2" : ""}>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{plan.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-slate-900 dark:text-white">€{plan.price}</span>
                    <span className="text-slate-500 dark:text-slate-400 ml-1">/ {plan.period}</span>
                  </div>
                  <Button
                    asChild
                    className={`w-full mb-8 h-12 font-semibold ${
                      plan.highlighted
                        ? "bg-[var(--accent-blue)] hover:bg-blue-700 text-white"
                        : "bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-[var(--bg-surface)] dark:hover:bg-slate-600"
                    }`}
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
                          <CheckCircle2 className="w-5 h-5 text-[var(--success)] shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" />
                        )}
                        <span
                          className={
                            feature.included
                              ? "text-slate-700 dark:text-slate-300"
                              : "text-slate-400 dark:text-slate-500"
                          }
                        >
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ENTERPRISE CTA ============ */}
      <section className="py-16 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="p-8 md:p-12 bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)] border border-slate-200 dark:border-slate-700 rounded-2xl">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Brauchen Sie etwas Individuelles?
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8">
              Für große Organisationen mit speziellen Anforderungen bieten wir
              maßgeschneiderte Lösungen mit individueller Preisgestaltung.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-[var(--accent-blue)] hover:bg-blue-700 text-white h-13 px-8 text-base font-semibold"
              >
                <Link href="/#contact">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Enterprise kontaktieren
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ SECTION ============ */}
      <section className="py-20 bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
              Häufig gestellte Fragen
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Alles, was Sie über unsere Preise wissen müssen.
            </p>
          </div>

          <Accordion type="single" collapsible className="bg-white dark:bg-[var(--bg-surface)] border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-b border-slate-200 dark:border-slate-700 last:border-0">
                <AccordionTrigger className="text-left font-semibold text-slate-900 dark:text-white hover:text-[var(--accent-blue)] dark:hover:text-blue-400 py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 dark:text-slate-300 leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-amber-400 text-2xl">★</span>
            ))}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
            Starten Sie noch heute — kostenlos
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
            Über 150 Reinigungsfirmen vertrauen bereits auf ReinPlaner.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="h-14 px-10 text-lg font-semibold bg-[var(--accent-blue)] hover:bg-blue-700 text-white rounded-lg"
            >
              <Link href="/register">
                14 Tage kostenlos testen
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Keine Kreditkarte erforderlich. Jederzeit kündbar.
          </p>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
