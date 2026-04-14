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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MarketingHeader } from "@/components/marketing-header";

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
    <main className="min-h-screen section-dark">
      <MarketingHeader />
      
      {/* ============ HERO SECTION ============ */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 overflow-hidden grain">
        <div className="absolute inset-0 bg-gradient-to-b from-[#05080F] via-[#0A0E1A] to-[#0F1524]" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-6 border border-blue-500/20">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-slate-200">Transparent & Fair</span>
          </div>
          <h1 className="text-h1 text-white mb-4">
            Der passende Plan für{" "}
            <span className="gradient-text">Ihre Reinigungsfirma</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Wählen Sie den Plan, der zu Ihrem Unternehmen passt. Alle Pläne
            include 14 Tage kostenlos testen — ohne Kreditkarte.
          </p>
        </div>
      </section>

      {/* ============ PRICING CARDS ============ */}
      <section className="py-16 relative">
        <div className="absolute inset-0 bg-[#0A0E1A]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`glass-card relative p-8 ${
                  plan.highlighted
                    ? "ring-2 ring-blue-500/50 glow-blue scale-105"
                    : "hover:border-white/12"
                } transition-all duration-300`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
                    Beliebteste Wahl
                  </div>
                )}
                <div className={plan.highlighted ? "pt-2" : ""}>
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-sm text-slate-400 mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-white">€{plan.price}</span>
                    <span className="text-slate-500 ml-1">/ {plan.period}</span>
                  </div>
                  <Button
                    asChild
                    className={`w-full mb-8 h-12 font-semibold ${
                      plan.highlighted
                        ? "btn-primary btn-pulse"
                        : "glass-btn"
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
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-slate-600 shrink-0" />
                        )}
                        <span
                          className={
                            feature.included
                              ? "text-slate-300"
                              : "text-slate-500"
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
      <section className="py-16 relative grain">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800" />
        <div className="absolute inset-0 bg-blue-600/5" />
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-h2 text-white mb-4">
            Brauchen Sie etwas Individuelles?
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
            Für große Organisationen mit speziellen Anforderungen bieten wir
            maßgeschneiderte Lösungen mit individueller Preisgestaltung.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
      <section className="py-20 relative grain">
        <div className="absolute inset-0 bg-[#0F1524]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px]" />
        
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-h2 text-white mb-4">
              Häufig gestellte Fragen
            </h2>
            <p className="text-lg text-slate-400">
              Alles, was Sie über unsere Preise wissen müssen.
            </p>
          </div>

          <Accordion type="single" collapsible className="glass-card">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-white/5">
                <AccordionTrigger className="text-left font-medium text-white hover:text-blue-400 px-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-400 leading-relaxed px-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="py-20 relative grain">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-violet-600/10 to-cyan-600/20" />
        <div className="absolute inset-0 bg-[#05080F]/60" />
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="w-6 h-6 fill-yellow-400 text-yellow-400"
              />
            ))}
          </div>
          <h2 className="text-h2 text-white mb-4">
            Starten Sie noch heute — kostenlos
          </h2>
          <p className="text-lg text-slate-400 mb-8">
            Über 150 Reinigungsfirmen vertrauen bereits auf ReinPlaner.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="btn-primary h-14 px-10 text-lg font-semibold btn-pulse"
            >
              <Link href="/register">
                14 Tage kostenlos testen
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Keine Kreditkarte erforderlich. Jederzeit kündbar.
          </p>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-slate-500">© 2024 ReinPlaner. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </main>
  );
}
