"use client";

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
  TrendingUp,
  Globe,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Calendar,
    title: "Einsatzplanung",
    description:
      "Kalender-Ansicht mit Drag & Drop, wiederkehrende Aufträge und automatische Tourenplanung.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Clock,
    title: "Zeiterfassung",
    description:
      "Mobile Zeiterfassung mit GPS-Tracking. Echtzeit-Daten für Mitarbeiter und Büro.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Users,
    title: "Mitarbeiterverwaltung",
    description:
      "Schichtpläne, Tourenzuordnung, Urlaubsverwaltung — alles zentral verwaltet.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: Building2,
    title: "Kundenverwaltung",
    description:
      "Adressen, Ansprechpartner, Objekte und Verträge auf einen Blick.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: FileText,
    title: "Abrechnung",
    description:
      "Automatische Rechnungserstellung aus erfassten Daten. Jetzt mit Frühjahrsaktion: 3 Monate gratis!",
    color: "from-rose-500 to-pink-500",
  },
  {
    icon: MapPin,
    title: "Multi-Standort",
    description:
      "Verwalten Sie mehrere Standorte und Teams. Alles in einem System.",
    color: "from-cyan-500 to-blue-500",
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

const stats = [
  { value: "150+", label: "Reinigungsfirmen" },
  { value: "2.500+", label: "Aktive Mitarbeiter" },
  { value: "50.000+", label: "Erfasste Einsätze/Monat" },
  { value: "4.9★", label: "Bewertung" },
];

const benefits = [
  { icon: Shield, title: "DSGVO-konform", desc: "Daten in Deutschland gehostet" },
  { icon: Zap, title: "5 Minuten Setup", desc: "Keine Installation nötig" },
  { icon: Headphones, title: "Persönlicher Support", desc: "Hilfe bei Fragen" },
  { icon: Globe, title: "Made in Germany", desc: "Deutsche Qualität" },
  { icon: Smartphone, title: "Mobile App", desc: "iOS & Android" },
  { icon: TrendingUp, title: "Skalierbar", desc: "Mit Ihrem Unternehmen" },
];

import { MarketingHeader } from "./marketing-header";

function StatCounter({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl md:text-4xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
    </div>
  );
}

export function LandingPage() {
  return (
    <main className="min-h-screen section-dark">
      <MarketingHeader />
      
      {/* ============ HERO SECTION ============ */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden grain">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#05080F] via-[#0A0E1A] to-[#0F1524]" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[80px]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text */}
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-8 animate-fade-up stagger-1">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-slate-300">14 Tage kostenlos · Keine Kreditkarte</span>
              </div>
              
              {/* Headline */}
              <h1 className="text-display text-white mb-6 animate-fade-up stagger-2">
                DIE SOFTWARE<br />
                <span className="gradient-text">FÜR GEBÄUDE</span><br />
                REINIGUNG
              </h1>
              
              {/* Subline */}
              <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8 animate-fade-up stagger-3">
                Planung, Zeiterfassung, Abrechnung — alles in einem. Für Reinigungsfirmen jeder Größe.
              </p>
              
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6 animate-fade-up stagger-4">
                <Button asChild size="lg" className="btn-primary h-12 px-8 text-base font-semibold btn-pulse">
                  <Link href="/register">
                    14 Tage kostenlos testen
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="glass-btn h-12 px-8 text-base font-medium border-slate-700 hover:border-slate-500">
                  <Link href="/pricing">Preise ansehen</Link>
                </Button>
              </div>
              
              {/* Social Proof */}
              <div className="flex items-center gap-4 justify-center lg:justify-start text-sm text-slate-500 animate-fade-up stagger-5">
                <span>150+ Unternehmen</span>
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="ml-1">4.9★ Bewertung</span>
                </div>
              </div>
            </div>

            {/* Right: Dashboard Preview */}
            <div className="relative animate-fade-up stagger-3">
              <div className="relative glass-card p-1 overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-[#0A0E1A] border-b border-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 text-center">
                    <div className="inline-flex items-center glass-card rounded-md px-3 py-1 text-xs text-slate-400">
                      app.reinplaner.de
                    </div>
                  </div>
                </div>
                {/* Dashboard mock content */}
                <div className="p-6 bg-gradient-to-br from-[#0A0E1A] to-[#0F1524]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-white text-lg">Dashboard</h3>
                        <p className="text-xs text-slate-500">
                          Heute, {new Date().toLocaleDateString("de-DE")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 w-20 rounded-lg glass-card" />
                        <div className="h-8 w-20 rounded-lg bg-blue-600" />
                      </div>
                    </div>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Aufträge", value: "47", color: "bg-blue-500" },
                        { label: "Mitarbeiter", value: "12", color: "bg-emerald-500" },
                        { label: "Kunden", value: "23", color: "bg-violet-500" },
                      ].map((kpi) => (
                        <div key={kpi.label} className="glass-card p-3">
                          <p className="text-xs text-slate-500">{kpi.label}</p>
                          <p className="text-xl font-bold text-white mt-1">{kpi.value}</p>
                          <div className={`mt-2 h-1 rounded-full ${kpi.color}`} />
                        </div>
                      ))}
                    </div>
                    {/* Calendar placeholder */}
                    <div className="glass-card p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-white">Einsatzplanung</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-8 rounded-lg text-xs flex items-center justify-center font-medium ${
                              i % 3 === 0
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : i % 3 === 1
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "glass-card text-slate-500"
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
              {/* Decorative glows */}
              <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl animate-float" />
              <div className="absolute -top-8 -left-8 w-32 h-32 bg-cyan-500/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATS BAR ============ */}
      <section className="py-12 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className={index !== 0 ? "hidden md:block" : ""}>
                  {index !== 0 && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-12 bg-white/10 hidden md:block" />
                  )}
                  <StatCounter value={stat.value} label={stat.label} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ FEATURES SECTION ============ */}
      <section id="features" className="py-20 md:py-32 relative grain">
        <div className="absolute inset-0 bg-gradient-to-b from-[#05080F] to-[#0A0E1A]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-h1 text-white mb-4">
              ALLES, WAS SIE BRAUCHEN
            </h2>
            <p className="text-lg text-slate-400">
              Von der Planung bis zur Abrechnung — ReinPlaner deckt alle Bereiche Ihres Unternehmens ab.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`glass-card glass-card-hover p-6 animate-fade-up stagger-${index + 1}`}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-h3 text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="py-20 md:py-32 relative">
        <div className="absolute inset-0 bg-[#0A0E1A]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-h1 text-white mb-4">SO FUNKTIONIERT'S</h2>
            <p className="text-lg text-slate-400">
              In drei einfachen Schritten zu Ihrer digitalen Reinigungsfirma.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Registrieren", desc: "Erstellen Sie Ihr Konto in 2 Minuten. Keine Kreditkarte nötig." },
              { step: "02", title: "Einrichten", desc: "Fügen Sie Ihre Mitarbeiter, Kunden und Objekte hinzu." },
              { step: "03", title: "Durchstarten", desc: "Starten Sie Ihre erste Planung und erleben Sie den Unterschied." },
            ].map((item, index) => (
              <div key={index} className="glass-card p-8 text-center relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                  {item.step}
                </div>
                <h3 className="text-h3 text-white mt-4 mb-3">{item.title}</h3>
                <p className="text-slate-400">{item.desc}</p>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-blue-500/50 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="py-20 md:py-32 relative grain">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0E1A] to-[#0F1524]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-h1 text-white mb-4">WAS UNSERE KUNDEN SAGEN</h2>
            <p className="text-lg text-slate-400">
              Über 150 Reinigungsfirmen vertrauen auf ReinPlaner.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="glass-card p-8">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.stars)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="text-lg text-slate-300 leading-relaxed mb-6">
                  "{testimonial.quote}"
                </blockquote>
                <div>
                  <p className="font-semibold text-white">{testimonial.author}</p>
                  <p className="text-sm text-slate-500">{testimonial.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING SECTION ============ */}
      <section className="py-20 md:py-32 relative">
        <div className="absolute inset-0 bg-[#0F1524]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-h1 text-white mb-4">TRANSPARENTE PREISE</h2>
            <p className="text-lg text-slate-400">
              Wählen Sie den Plan, der zu Ihrem Unternehmen passt. Alle Pläne mit 14 Tagen kostenlos testen.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`glass-card relative p-8 ${
                  plan.highlighted 
                    ? "ring-2 ring-blue-500/50 scale-105 glow-blue" 
                    : "hover:border-white/12"
                } transition-all duration-300`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
                    Beliebteste Wahl
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-sm text-slate-500">{plan.description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-white">€{plan.price}</span>
                    <span className="text-slate-500 ml-1">/Monat</span>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Button
                  asChild
                  className={`w-full h-12 font-semibold ${
                    plan.highlighted
                      ? "btn-primary btn-pulse"
                      : "glass-btn"
                  }`}
                >
                  <Link href={plan.name === "Enterprise" ? "/#contact" : "/register"}>
                    {plan.cta}
                  </Link>
                </Button>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button variant="link" asChild className="text-slate-400 hover:text-white">
              <Link href="/pricing">
                Alle Features vergleichen <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ============ BENEFITS GRID ============ */}
      <section className="py-20 md:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F1524] to-[#0A0E1A]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="glass-card p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center shrink-0 border border-blue-500/20">
                  <benefit.icon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{benefit.title}</h3>
                  <p className="text-sm text-slate-500">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="py-20 md:py-32 relative grain">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-violet-600/10 to-cyan-600/20" />
        <div className="absolute inset-0 bg-[#05080F]/80" />
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-h1 text-white mb-4">
            BEREIT ZU DIGITALISIEREN?
          </h2>
          <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
            Starten Sie jetzt kostenlos und erleben Sie, wie ReinPlaner Ihren Alltag vereinfacht.
          </p>
          <Button asChild size="lg" className="btn-primary h-14 px-10 text-lg font-semibold btn-pulse">
            <Link href="/register">
              Jetzt kostenlos starten
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
          <p className="mt-4 text-sm text-slate-500">
            14 Tage kostenlos. Keine Kreditkarte. Jederzeit kündbar.
          </p>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3">
                <Image src="/logo.png" alt="ReinPlaner" width={40} height={40} className="rounded-xl" />
                <span className="text-xl font-bold text-white">ReinPlaner</span>
              </Link>
              
              {/* Nav Links */}
              <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
                <Link href="/#features" className="text-slate-400 hover:text-white transition-colors">Features</Link>
                <Link href="/pricing" className="text-slate-400 hover:text-white transition-colors">Preise</Link>
                <Link href="/#contact" className="text-slate-400 hover:text-white transition-colors">Kontakt</Link>
                <Link href="/impressum" className="text-slate-400 hover:text-white transition-colors">Impressum</Link>
                <Link href="/datenschutz" className="text-slate-400 hover:text-white transition-colors">Datenschutz</Link>
              </nav>
              
              {/* Social */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500">© 2024 ReinPlaner</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
