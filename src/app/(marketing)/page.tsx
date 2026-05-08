import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import {
  Calendar,
  Clock,
  Users,
  Building2,
  FileText,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Shield,
  Headphones,
  Globe,
  Smartphone,
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
  title: "ReinPlaner – Die Software für Gebäudereinigung",
  description: "Planung, Zeiterfassung, Abrechnung — alles in einem.",
};

const features = [
  {
    icon: Calendar,
    title: "Einsatzplanung",
    description: "Kalender-Ansicht mit Drag & Drop, wiederkehrende Aufträge und automatische Tourenplanung.",
  },
  {
    icon: Clock,
    title: "Zeiterfassung",
    description: "Mobile Zeiterfassung mit GPS-Tracking. Echtzeit-Daten für Mitarbeiter und Büro.",
  },
  {
    icon: Users,
    title: "Mitarbeiterverwaltung",
    description: "Schichtpläne, Tourenzuordnung, Urlaubsverwaltung — alles zentral verwaltet.",
  },
  {
    icon: Building2,
    title: "Kundenverwaltung",
    description: "Adressen, Ansprechpartner, Objekte und Verträge auf einen Blick.",
  },
  {
    icon: FileText,
    title: "Abrechnung",
    description: "Automatische Rechnungserstellung aus erfassten Daten. Export nach DATEV und Excel.",
  },
  {
    icon: MapPin,
    title: "Multi-Standort",
    description: "Verwalten Sie mehrere Standorte und Teams. Alles in einem System.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "29",
    period: "Monat",
    description: "Für kleine Reinigungsfirmen mit bis zu 5 Mitarbeitern.",
    plan: "starter" as const,
    features: [
      "Bis 5 Benutzer",
      "1.000 Aufträge / Monat",
      "Einsatzplanung",
      "Zeiterfassung",
      "Kundenverwaltung",
      "E-Mail Support",
    ],
    cta: "14 Tage kostenlos testen",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "79",
    period: "Monat",
    description: "Für wachsende Unternehmen mit bis zu 25 Mitarbeitern.",
    plan: "professional" as const,
    features: [
      "Bis 25 Benutzer",
      "Unbegrenzte Aufträge",
      "API-Zugang",
      "Prioritäts-Support",
      "Erweiterte Berichte",
      "Multi-Standort",
    ],
    cta: "14 Tage kostenlos testen",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "199",
    period: "Monat",
    description: "Für große Organisationen mit unbegrenzten Möglichkeiten.",
    plan: "enterprise" as const,
    features: [
      "Unbegrenzte Benutzer",
      "Custom Domain",
      "SSO-Integration",
      "Dedizierter Support",
      "Individuelle Anpassungen",
      "SLA-Garantie",
    ],
    cta: "Kontakt aufnehmen",
    highlighted: false,
  },
];

const testimonials = [
  {
    quote: "Seit wir ReinPlaner nutzen, haben wir die Tourenplanung von 4 Stunden auf 45 Minuten pro Tag reduziert. Das ist ein echter Gamechanger für uns.",
    author: "Thomas Brenner",
    company: "Brenner Gebäudeservice",
    location: "Stuttgart",
    initials: "TB",
  },
  {
    quote: "Die mobile Zeiterfassung mit GPS hat unsere Abrechnung revolutioniert. Keine Diskussionen mehr mit Kunden über geleistete Stunden.",
    author: "Sabrina Hartmann",
    company: "CleanPro Hamburg",
    location: "Hamburg",
    initials: "SH",
  },
  {
    quote: "Setup in unter 1 Stunde. Support hat uns persönlich geholfen. Besser als jede andere Software, die wir in 15 Jahren hatten.",
    author: "Michael Vogt",
    company: "Vogt & Partner Reinigung",
    location: "Frankfurt",
    initials: "MV",
  },
];

const stats = [
  { value: "150+", label: "Reinigungsfirmen" },
  { value: "2.500+", label: "Aktive Mitarbeiter" },
  { value: "50.000+", label: "Erfasste Einsätze/Monat" },
  { value: "4.9★", label: "Bewertung" },
];

const benefits = [
  { icon: Shield, title: "DSGVO-konform", desc: "Daten in Deutschland gehostet" },
  { icon: Headphones, title: "Persönlicher Support", desc: "Hilfe bei Fragen" },
  { icon: Globe, title: "Made in Germany", desc: "Deutsche Qualität" },
  { icon: Smartphone, title: "Mobile App", desc: "iOS & Android" },
];

const faqs = [
  {
    question: "Wie funktioniert die 14-tägige Testphase?",
    answer: "Registrieren Sie sich kostenlos und nutzen Sie alle Funktionen des Professional-Plans ohne Einschränkungen. Am Ende der Testphase entscheiden Sie, ob Sie einen Plan buchen möchten — keine automatische Abrechnung.",
  },
  {
    question: "Kann ich meine Daten exportieren?",
    answer: "Ja, alle Ihre Daten können Sie jederzeit als CSV oder Excel exportieren. Zusätzlich bieten wir einen direkten DATEV-Export für Ihre Buchhaltung.",
  },
  {
    question: "Was passiert, wenn ich nicht zufrieden bin?",
    answer: "Sie können jederzeit zum Monatsende kündigen — ohne lange Vertragslaufzeiten. Zusätzlich bieten wir eine Geld-zurück-Garantie für die ersten 30 Tage.",
  },
  {
    question: "Gibt es Unterstützung beim Start?",
    answer: "Ja! Unser persönlicher Support hilft Ihnen direkt beim Setup. Professional- und Enterprise-Kunden erhalten Priority-Support mit garantierter Antwortzeit unter 4 Stunden.",
  },
  {
    question: "Wie sicher sind meine Daten?",
    answer: "Alle Daten werden in Deutschland auf Servern gehostet, die der DSGVO entsprechen. Wir nutzen moderne TLS-Verschlüsselung und regelmäßige Backups.",
  },
];

export default function MarketingLandingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-deep)]">
      <MarketingHeader />

      {/* ====== HERO SECTION ====== */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 bg-[var(--bg-elevated)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text */}
            <div className="text-center lg:text-left animate-fade-up">
              {/* Trust Badge Bar */}
              <div className="inline-flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-8 animate-fade-up stagger-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-full">
                  <span className="text-[var(--accent-blue)] font-semibold text-sm">4.9</span>
                  <span className="text-amber-500">★★★★★</span>
                </div>
                <span className="text-sm text-[var(--text-muted)]">150+ Unternehmen</span>
                <span className="text-sm text-[var(--text-muted)]">•</span>
                <span className="text-sm text-[var(--text-muted)]">Made in Germany</span>
                <span className="text-sm text-[var(--text-muted)]">•</span>
                <span className="text-sm text-[var(--text-muted)]">DSGVO-konform</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--text-primary)] mb-6 leading-[1.1] tracking-tight animate-fade-up stagger-2">
                Die All-in-one Software für{" "}
                <span className="text-[var(--accent-blue)] animate-gradient-shift">Reinigungsfirmen</span>
              </h1>

              {/* Subline */}
              <p className="text-lg md:text-xl text-[var(--text-secondary)] leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8 animate-fade-up stagger-3">
                Planen Sie Einsätze, erfassen Sie Arbeitszeiten und erstellen Sie Rechnungen — ohne Excel, ohne Papierkram. 60% weniger Zeit für Verwaltung.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
                <Button asChild size="lg" className="h-12 px-8 text-base font-semibold bg-[var(--accent-blue)] hover:opacity-90 text-white rounded-lg">
                  <Link href="/register">
                    14 Tage kostenlos testen
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base font-medium border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg">
                  <Link href="/pricing">Preise ansehen</Link>
                </Button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-6 justify-center lg:justify-start text-sm text-[var(--text-muted)]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Keine Kreditkarte nötig</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Jederzeit kündbar</span>
                </div>
              </div>
            </div>

            {/* Right: Clean Screenshot Mockup */}
            <div className="relative">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl dark:shadow-none overflow-hidden">
                {/* Browser Chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-xs text-[var(--text-muted)] font-medium">app.reinplaner.de</span>
                  </div>
                </div>
                {/* Dashboard Content - Clean Light Theme */}
                <div className="p-6 bg-white dark:bg-slate-800">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-[var(--text-primary)] text-lg">Dashboard</h3>
                        <p className="text-xs text-[var(--text-muted)]">Montag, 15. Januar</p>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 w-20 rounded-lg bg-slate-100 dark:bg-slate-700" />
                        <div className="h-8 w-20 rounded-lg bg-[var(--accent-blue)]" />
                      </div>
                    </div>
                    {/* KPI Cards - Clean */}
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "Aufträge", value: "47", color: "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800" },
                        { label: "Mitarbeiter", value: "12", color: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800" },
                        { label: "Kunden", value: "23", color: "bg-slate-50 dark:bg-slate-700 border-slate-100 dark:border-slate-600" },
                      ].map((kpi) => (
                        <div key={kpi.label} className={`p-3 rounded-lg border ${kpi.color}`}>
                          <p className="text-xs text-[var(--text-muted)] font-medium">{kpi.label}</p>
                          <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{kpi.value}</p>
                        </div>
                      ))}
                    </div>
                    {/* Calendar Preview - Clean */}
                    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-[var(--accent-blue)]" />
                        <span className="text-sm font-semibold text-[var(--text-primary)]">Einsatzplanung</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-9 rounded-lg text-xs flex items-center justify-center font-medium border ${
                              i % 3 === 0
                                ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                                : i % 3 === 1
                                ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                                : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-[var(--text-muted)]"
                            }`}
                          >
                            {`${8 + i}:00`}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== STATS BAR ====== */}
      <section className="py-12 bg-[var(--bg-surface)] border-y border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] tracking-tight">{stat.value}</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== FEATURES SECTION ====== */}
      <section id="features" className="py-20 md:py-28 bg-[var(--bg-elevated)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-up">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">
              ALLES, WAS SIE BRAUCHEN
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              Von der Planung bis zur Abrechnung — ReinPlaner deckt alle Bereiche Ihres Unternehmens ab.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={feature.title} className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md dark:hover:shadow-none transition-shadow animate-fade-up" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-[var(--accent-blue)]" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{feature.title}</h3>
                <p className="text-[var(--text-secondary)] leading-relaxed line-clamp-3">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== FEATURES CTA ====== */}
      <section className="py-16 md:py-20 bg-[var(--bg-surface)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="p-8 md:p-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm dark:shadow-none">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-4">
              Bereit, 60% weniger Zeit für Verwaltung zu sparen?
            </h2>
            <p className="text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
              In unter 5 Minuten eingerichtet. Keine Kreditkarte. Keine Installation.
            </p>
            <Button asChild size="lg" className="h-12 px-8 text-base font-semibold bg-[var(--accent-blue)] hover:opacity-90 text-white rounded-lg">
              <Link href="/register">
                Jetzt 14 Tage kostenlos testen
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ====== HOW IT WORKS ====== */}
      <section className="py-20 md:py-28 bg-[var(--bg-elevated)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">
              SO FUNKTIONIERT'S
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              In drei einfachen Schritten zu Ihrer digitalen Reinigungsfirma.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Registrieren", desc: "Erstellen Sie Ihr Konto in 2 Minuten. Keine Kreditkarte nötig." },
              { step: "02", title: "Einrichten", desc: "Fügen Sie Ihre Mitarbeiter, Kunden und Objekte hinzu." },
              { step: "03", title: "Durchstarten", desc: "Starten Sie Ihre erste Planung und erleben Sie den Unterschied." },
            ].map((item, index) => (
              <div key={item.step} className="text-center relative p-6">
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-xl bg-[var(--accent-blue)] dark:bg-[var(--accent-blue)] flex items-center justify-center text-xl font-bold text-white mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mt-16 mb-3">{item.title}</h3>
                <p className="text-[var(--text-secondary)]">{item.desc}</p>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-slate-200 dark:bg-slate-700" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== TESTIMONIALS ====== */}
      <section id="testimonials" className="py-20 md:py-28 bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">
              WAS UNSERE KUNDEN SAGEN
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              Über 150 Reinigungsfirmen vertrauen auf ReinPlaner.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl relative">
                <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[var(--accent-blue)] dark:bg-[var(--accent-blue)] flex items-center justify-center text-white font-bold text-sm">
                  {testimonial.initials}
                </div>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-amber-400">★</span>
                  ))}
                </div>
                <blockquote className="text-slate-700 dark:text-slate-300 leading-relaxed mb-6 line-clamp-4">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">{testimonial.author}</p>
                  <p className="text-sm text-[var(--text-muted)]">{testimonial.company}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{testimonial.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== PRICING SECTION ====== */}
      <section id="pricing" className="py-20 md:py-28 bg-[var(--bg-elevated)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">
              TRANSPARENTE PREISE
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              Alle Pläne inkludieren 14 Tage kostenlos testen — ohne Kreditkarte.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`p-8 rounded-2xl border ${
                  plan.highlighted
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 border-2 shadow-lg dark:shadow-none"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md dark:hover:shadow-none"
                } transition-all duration-300 relative`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--accent-blue)] text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                    Beliebteste Wahl
                  </div>
                )}
                <div className={plan.highlighted ? "pt-2" : ""}>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">{plan.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-[var(--text-primary)]">€{plan.price}</span>
                    <span className="text-[var(--text-muted)] ml-1">/ {plan.period}</span>
                  </div>
                  <Button
                    asChild
                    className={`w-full mb-8 h-12 font-semibold ${
                      plan.highlighted
                        ? "bg-[var(--accent-blue)] hover:opacity-90 text-white"
                        : "bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600"
                    }`}
                  >
                    <Link href={plan.plan === "enterprise" ? "/#contact" : `/register?plan=${plan.plan}`}>
                      {plan.cta}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== FAQ SECTION ====== */}
      <section className="py-20 md:py-28 bg-[var(--bg-surface)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">
              Häufig gestellte Fragen
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              Alles, was Sie über ReinPlaner wissen müssen.
            </p>
          </div>

          <Accordion type="single" collapsible className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-b border-slate-200 dark:border-slate-700 last:border-0">
                <AccordionTrigger className="text-left font-semibold text-[var(--text-primary)] hover:text-blue-600 dark:hover:text-blue-400 py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-[var(--text-secondary)] leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ====== FINAL CTA ====== */}
      <section className="py-20 bg-[var(--bg-elevated)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-amber-400 text-2xl">★</span>
            ))}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">
            Starten Sie noch heute — kostenlos
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mb-8">
            Über 150 Reinigungsfirmen vertrauen bereits auf ReinPlaner.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="h-14 px-10 text-lg font-semibold bg-[var(--accent-blue)] hover:opacity-90 text-white rounded-lg"
            >
              <Link href="/register">
                14 Tage kostenlos testen
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Keine Kreditkarte erforderlich. Jederzeit kündbar.
          </p>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <MarketingFooter />
    </main>
  );
}
