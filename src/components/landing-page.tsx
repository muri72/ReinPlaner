import Link from "next/link";
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
  Star,
  Zap,
  Shield,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const features = [
  {
    icon: Calendar,
    title: "Einsatzplanung",
    description:
      "Kalender-Ansicht mit Drag & Drop, wiederkehrende Aufträge und automatische Tourenplanung.",
  },
  {
    icon: Clock,
    title: "Zeiterfassung",
    description:
      "Mobile Zeiterfassung mit GPS-Tracking. Echtzeit-Daten für Mitarbeiter und Büro.",
  },
  {
    icon: Users,
    title: "Mitarbeiterverwaltung",
    description:
      "Schichtpläne, Tourenzuordnung, Urlaubsverwaltung — alles zentral verwaltet.",
  },
  {
    icon: Building2,
    title: "Kundenverwaltung",
    description:
      "Adressen, Ansprechpartner, Objekte und Verträge auf einen Blick.",
  },
  {
    icon: FileText,
    title: "Abrechnung",
    description:
      "Automatische Rechnungserstellung aus erfassten Daten. 🎉 Jetzt mit Frühjahrsaktion: 3 Monate gratis!",
  },
  {
    icon: MapPin,
    title: "Multi-Standort",
    description:
      "Verwalten Sie mehrere Standorte und Teams. Alles in einem System.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "29",
    description: "Für kleine Reinigungsfirmen",
    features: [
      "Bis 5 Benutzer",
      "1.000 Aufträge / Monat",
      "Einsatzplanung",
      "Zeiterfassung",
      "E-Mail Support",
    ],
    cta: "Jetzt Early Access sichern",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "79",
    description: "Für wachsende Unternehmen",
    features: [
      "Bis 25 Benutzer",
      "Unbegrenzte Aufträge",
      "API-Zugang",
      "Prioritäts-Support",
      "Erweiterte Berichte",
      "Multi-Standort",
    ],
    cta: "Jetzt Early Access sichern",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "199",
    description: "Für große Organisationen",
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
    quote:
      "ReinPlaner hat unsere Planung komplett revolutioniert. Wir sparen jetzt 3 Stunden am Tag.",
    author: "Thomas M.",
    company: "Gebäudereinigung Müller GmbH",
    stars: 5,
  },
  {
    quote:
      "Endlich eine Software, die speziell für unsere Branche entwickelt wurde. Top!",
    author: "Sandra K.",
    company: "CleanService Berlin",
    stars: 5,
  },
  {
    quote:
      "Die Zeiterfassung mit GPS gibt uns volle Transparenz. Kunden sind begeistert.",
    author: "Michael R.",
    company: "RheinClean KG",
    stars: 5,
  },
];

export function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* ============ HERO SECTION ============ */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-slate-50" />
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-400/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                Jetzt 14 Tage kostenlos testen
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight">
                Die Software für{" "}
                <span className="text-blue-600">Gebäudereinigung</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl">
                Planung, Zeiterfassung, Abrechnung — alles in einem. Für
                Reinigungsfirmen jeder Größe.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white h-13 px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  <Link href="/register">
                    14 Tage kostenlos testen
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-13 px-8 text-base font-medium"
                >
                  <Link href="/pricing">Preise ansehen</Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Keine Kreditkarte erforderlich. Jederzeit kündbar.
              </p>
            </div>

            {/* Right: Dashboard Preview */}
            <div className="relative">
              <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                {/* Browser chrome */}
                <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 text-center">
                    <div className="inline-flex items-center bg-white rounded-md px-3 py-1 text-xs text-slate-500 border border-slate-200">
                      app.reinplaner.de
                    </div>
                  </div>
                </div>
                {/* Dashboard mock content */}
                <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50/30">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-800">
                          Dashboard
                        </h3>
                        <p className="text-xs text-slate-500">
                          Heute, {new Date().toLocaleDateString("de-DE")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 w-20 rounded-md bg-blue-100" />
                        <div className="h-8 w-20 rounded-md bg-blue-600" />
                      </div>
                    </div>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          label: "Aufträge",
                          value: "47",
                          color: "bg-blue-500",
                        },
                        {
                          label: "Mitarbeiter",
                          value: "12",
                          color: "bg-green-500",
                        },
                        {
                          label: "Kunden",
                          value: "23",
                          color: "bg-purple-500",
                        },
                      ].map((kpi) => (
                        <div
                          key={kpi.label}
                          className="bg-white rounded-lg p-3 border border-slate-200"
                        >
                          <p className="text-xs text-slate-500">{kpi.label}</p>
                          <p className="text-xl font-bold text-slate-800">
                            {kpi.value}
                          </p>
                          <div
                            className={`mt-1 h-1 rounded-full ${kpi.color}`}
                          />
                        </div>
                      ))}
                    </div>
                    {/* Calendar placeholder */}
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-slate-700">
                          Einsatzplanung
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-6 rounded text-xs flex items-center justify-center ${
                              i % 3 === 0
                                ? "bg-blue-100 text-blue-700"
                                : i % 3 === 1
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-500"
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
              {/* Decorative glow */}
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl" />
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-cyan-400/15 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ============ SOCIAL PROOF BAR ============ */}
      <section className="py-12 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900">150+</p>
              <p className="text-sm text-slate-500">Reinigungsfirmen</p>
            </div>
            <div className="hidden md:block w-px h-12 bg-slate-200" />
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900">2.500+</p>
              <p className="text-sm text-slate-500">Aktive Mitarbeiter</p>
            </div>
            <div className="hidden md:block w-px h-12 bg-slate-200" />
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900">50.000+</p>
              <p className="text-sm text-slate-500">
                Erfasste Einsätze pro Monat
              </p>
            </div>
            <div className="hidden md:block w-px h-12 bg-slate-200" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <p className="text-sm text-slate-500">4.9 / 5 Bewertung</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FEATURES SECTION ============ */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Alles, was Sie für Ihre{" "}
              <span className="text-blue-600">Reinigungsfirma</span> brauchen
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Von der Planung bis zur Abrechnung — ReinPlaner deckt alle
              Bereiche Ihres Unternehmens ab.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="group hover:shadow-lg hover:border-blue-200 transition-all duration-300 border-slate-200"
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
                    <feature.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Was unsere Kunden sagen
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Über 150 Reinigungsfirmen vertrauen auf ReinPlaner.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <Card
                key={testimonial.author}
                className="border-slate-200 hover:shadow-lg transition-shadow"
              >
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.stars)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <blockquote className="text-slate-700 leading-relaxed mb-4">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      {testimonial.author}
                    </p>
                    <p className="text-sm text-slate-500">
                      {testimonial.company}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING PREVIEW ============ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Transparente Preise, kein Kleingedrucktes
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Wählen Sie den Plan, der zu Ihrem Unternehmen passt. Alle Pläne
              mit 14 Tagen kostenlos testen.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative overflow-hidden ${
                  plan.highlighted
                    ? "border-blue-600 border-2 shadow-xl scale-105"
                    : "border-slate-200 hover:shadow-lg"
                } transition-shadow`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white text-center text-xs font-semibold py-1.5">
                    Beliebteste Wahl
                  </div>
                )}
                <CardHeader className={plan.highlighted ? "pt-8" : ""}>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-slate-900">
                      €{plan.price}
                    </span>
                    <span className="text-slate-500">/Monat</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-slate-600"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className={`w-full ${
                      plan.highlighted
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : ""
                    }`}
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    <Link href={plan.name === "Enterprise" ? "/#contact" : "/register"}>
                      {plan.cta}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button variant="link" asChild>
              <Link href="/pricing">
                Alle Features vergleichen <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ============ TRUST SECTION ============ */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900">
                DSGVO-konform
              </h3>
              <p className="text-sm text-slate-600 max-w-xs">
                Ihre Daten werden in Deutschland gehostet und entsprechen den
                höchsten Sicherheitsstandards.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900">
                In 5 Minuten startklar
              </h3>
              <p className="text-sm text-slate-600 max-w-xs">
                Keine Installation, keine Schulung. Registrieren und sofort
                loslegen.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Headphones className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900">
                Persönlicher Support
              </h3>
              <p className="text-sm text-slate-600 max-w-xs">
                Unser Team hilft Ihnen persönlich bei Fragen und
                Einrichtungsproblemen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Bereit, Ihre Reinigungsfirma zu digitalisieren?
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Starten Sie jetzt kostenlos und erleben Sie, wie ReinPlaner Ihren
            Alltag vereinfacht.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-700 hover:bg-blue-50 h-13 px-8 text-base font-semibold shadow-lg"
            >
              <Link href="/register">
                Jetzt kostenlos starten
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-blue-200">
            14 Tage kostenlos. Keine Kreditkarte. Jederzeit kündbar.
          </p>
        </div>
      </section>
    </main>
  );
}
