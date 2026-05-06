# ReinPlaner Marketing Redesign - Personio Style

## Design Issues Identified in Current Implementation

### Current Problems:
1. **Dark backgrounds** with neon glows (`#05080F`, `#0A0E1A`, `#0F1524`)
2. **Glass cards everywhere** with blur effects and semi-transparent backgrounds
3. **Grain texture overlay** creating dated "AI startup" aesthetic
4. **Rainbow gradient accents** (blue-cyan, emerald-teal, violet-purple, etc.)
5. **Hype-style headlines** ("8 STUNDEN PRO WOCHE SPAREN — AUTOMATISIERT")
6. **Dark glass navbar** with backdrop blur
7. **Neon box shadows** like `rgba(37,99,235,0.4)`

---

## 1. CSS Variable Changes for globals.css

Replace the dark mode marketing sections with a professional light theme. Add these CSS variables and class overrides:

```css
/* ==========================================
   MARKETING DESIGN TOKENS - PERSONIO STYLE
   Professional Light Theme for Marketing Pages
   ========================================== */

/* Marketing Color Palette - Muted Professional Blues */
.marketing-blue-50 { --marketing-blue-50: #EFF6FF; }
.marketing-blue-100 { --marketing-blue-100: #DBEAFE; }
.marketing-blue-500 { --marketing-blue-500: #3B82F6; }
.marketing-blue-600 { --marketing-blue-600: #2563EB; }
.marketing-blue-700 { --marketing-blue-700: #1D4ED8; }

.marketing-slate-50 { --marketing-slate-50: #F8FAFC; }
.marketing-slate-100 { --marketing-slate-100: #F1F5F9; }
.marketing-slate-200 { --marketing-slate-200: #E2E8F0; }
.marketing-slate-300 { --marketing-slate-300: #CBD5E1; }
.marketing-slate-400 { --marketing-slate-400: #94A3B8; }
.marketing-slate-500 { --marketing-slate-500: #64748B; }
.marketing-slate-600 { --marketing-slate-600: #475569; }
.marketing-slate-700 { --marketing-slate-700: #334155; }
.marketing-slate-800 { --marketing-slate-800: #1E293B; }
.marketing-slate-900 { --marketing-slate-900: #0F172A; }

/* Marketing Backgrounds */
--marketing-bg-white: #FFFFFF;
--marketing-bg-slate-50: #F8FAFC;
--marketing-bg-slate-100: #F1F5F9;

/* Marketing Text Colors */
--marketing-text-primary: #0F172A;
--marketing-text-secondary: #475569;
--marketing-text-muted: #94A3B8;
--marketing-text-inverse: #FFFFFF;

/* Marketing Shadows - Subtle & Professional */
--marketing-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--marketing-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--marketing-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--marketing-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--marketing-shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

/* Marketing Borders */
--marketing-border: #E2E8F0;
--marketing-border-light: #F1F5F9;

/* ==========================================
   MARKETING UTILITY CLASSES
   ========================================== */

@layer components {
  /* Marketing Page - Clean Light Background */
  .marketing-page {
    background: var(--marketing-bg-white);
    color: var(--marketing-text-primary);
  }
  
  /* Marketing Card - Solid White with Subtle Shadow */
  .marketing-card {
    background: var(--marketing-bg-white);
    border: 1px solid var(--marketing-border);
    border-radius: 12px;
    box-shadow: var(--marketing-shadow);
    transition: box-shadow 0.2s ease;
  }
  
  .marketing-card:hover {
    box-shadow: var(--marketing-shadow-md);
  }
  
  /* Marketing Section Backgrounds */
  .marketing-section-white {
    background: var(--marketing-bg-white);
  }
  
  .marketing-section-slate {
    background: var(--marketing-bg-slate-50);
  }
  
  .marketing-section-blue {
    background: var(--marketing-blue-50);
  }
  
  /* Marketing Typography */
  .marketing-headline {
    font-family: 'Clash Display', system-ui, sans-serif;
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 700;
    color: var(--marketing-text-primary);
    letter-spacing: -0.02em;
    line-height: 1.1;
  }
  
  .marketing-subheadline {
    font-size: 1.125rem;
    color: var(--marketing-text-secondary);
    line-height: 1.6;
  }
  
  /* Marketing Button - Solid Professional */
  .marketing-btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1.5rem;
    background: var(--marketing-blue-600);
    color: white;
    font-weight: 600;
    font-size: 1rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.1s ease;
  }
  
  .marketing-btn-primary:hover {
    background: var(--marketing-blue-700);
    transform: translateY(-1px);
  }
  
  .marketing-btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1.5rem;
    background: white;
    color: var(--marketing-text-primary);
    font-weight: 600;
    font-size: 1rem;
    border-radius: 8px;
    border: 1px solid var(--marketing-border);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .marketing-btn-secondary:hover {
    background: var(--marketing-bg-slate-50);
    border-color: var(--marketing-slate-300);
  }
  
  /* Marketing Navbar - Clean White */
  .marketing-nav {
    background: var(--marketing-bg-white);
    border-bottom: 1px solid var(--marketing-border);
  }
  
  .marketing-nav-link {
    color: var(--marketing-text-secondary);
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    transition: all 0.15s ease;
  }
  
  .marketing-nav-link:hover {
    color: var(--marketing-text-primary);
    background: var(--marketing-bg-slate-50);
  }
  
  .marketing-nav-link-active {
    color: var(--marketing-blue-600);
    background: var(--marketing-blue-50);
  }
  
  /* Feature Icon Container */
  .marketing-feature-icon {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    background: var(--marketing-blue-50);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--marketing-blue-600);
  }
  
  /* Trust Badge */
  .marketing-trust-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background: var(--marketing-bg-slate-50);
    border: 1px solid var(--marketing-border);
    border-radius: 9999px;
    font-size: 0.875rem;
    color: var(--marketing-text-secondary);
  }
  
  /* Stats Card */
  .marketing-stat-card {
    text-align: center;
    padding: 1.5rem;
  }
  
  .marketing-stat-value {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--marketing-text-primary);
    line-height: 1;
  }
  
  .marketing-stat-label {
    font-size: 0.875rem;
    color: var(--marketing-text-muted);
    margin-top: 0.5rem;
  }
  
  /* Pricing Card */
  .marketing-pricing-card {
    background: var(--marketing-bg-white);
    border: 1px solid var(--marketing-border);
    border-radius: 16px;
    padding: 2rem;
    box-shadow: var(--marketing-shadow-sm);
  }
  
  .marketing-pricing-card-highlighted {
    border-color: var(--marketing-blue-500);
    box-shadow: 0 0 0 1px var(--marketing-blue-500), var(--marketing-shadow-lg);
  }
  
  /* FAQ Accordion */
  .marketing-faq-item {
    border-bottom: 1px solid var(--marketing-border);
  }
  
  .marketing-faq-trigger {
    width: 100%;
    text-align: left;
    padding: 1.25rem 0;
    font-weight: 600;
    color: var(--marketing-text-primary);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .marketing-faq-content {
    padding-bottom: 1.25rem;
    color: var(--marketing-text-secondary);
    line-height: 1.7;
  }
  
  /* Hero Screenshot Mockup */
  .marketing-hero-mockup {
    background: white;
    border: 1px solid var(--marketing-border);
    border-radius: 12px;
    box-shadow: var(--marketing-shadow-xl);
    overflow: hidden;
  }
  
  .marketing-hero-mockup-header {
    background: var(--marketing-bg-slate-50);
    border-bottom: 1px solid var(--marketing-border);
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .marketing-hero-mockup-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
}
```

---

## 2. Complete Redesigned marketing-header.tsx

```tsx
"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/", label: "Startseite" },
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Preise" },
  { href: "/#testimonials", label: "Bewertungen" },
];

export function MarketingHeader() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Clean White Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          isScrolled
            ? "bg-white border-b border-slate-200 shadow-sm"
            : "bg-white border-b border-slate-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-18">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image
                src="/reinplaner-logo.svg"
                alt="ReinPlaner"
                width={36}
                height={36}
                className="rounded-lg"
              />
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                ReinPlaner
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    pathname === link.href
                      ? "text-blue-600 bg-blue-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Button asChild variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-50">
                <Link href="/login">Anmelden</Link>
              </Button>
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
                <Link href="/register">
                  Kostenlos testen
                  <CheckCircle2 className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-40 bg-white md:hidden transition-all duration-300 ${
          isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`}
      >
        <div className="flex flex-col items-center justify-center h-full space-y-6 pt-16">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-2xl font-semibold text-slate-900 hover:text-blue-600 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="flex flex-col gap-3 mt-8 w-64">
            <Button asChild variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
              <Link href="/login">Anmelden</Link>
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/register">Kostenlos testen</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
```

---

## 3. Complete Redesigned (marketing)/page.tsx

```tsx
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
  TrendingUp,
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
    <main className="min-h-screen bg-white">
      <MarketingHeader />

      {/* ====== HERO SECTION ====== */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text */}
            <div className="text-center lg:text-left">
              {/* Trust Badge Bar */}
              <div className="inline-flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
                  <span className="text-blue-600 font-semibold text-sm">4.9</span>
                  <span className="text-amber-500">★★★★★</span>
                </div>
                <span className="text-sm text-slate-500">150+ Unternehmen</span>
                <span className="text-sm text-slate-500">•</span>
                <span className="text-sm text-slate-500">Made in Germany</span>
                <span className="text-sm text-slate-500">•</span>
                <span className="text-sm text-slate-500">DSGVO-konform</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-[1.1] tracking-tight">
                Die All-in-one Software für{" "}
                <span className="text-blue-600">Reinigungsfirmen</span>
              </h1>

              {/* Subline */}
              <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8">
                Planen Sie Einsätze, erfassen Sie Arbeitszeiten und erstellen Sie Rechnungen — ohne Excel, ohne Papierkram. 60% weniger Zeit für Verwaltung.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
                <Button asChild size="lg" className="h-12 px-8 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
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
              <div className="flex items-center gap-6 justify-center lg:justify-start text-sm text-slate-500">
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
              <div className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                {/* Browser Chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-xs text-slate-500 font-medium">app.reinplaner.de</span>
                  </div>
                </div>
                {/* Dashboard Content - Clean Light Theme */}
                <div className="p-6 bg-white">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900 text-lg">Dashboard</h3>
                        <p className="text-xs text-slate-500">Montag, 15. Januar</p>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 w-20 rounded-lg bg-slate-100" />
                        <div className="h-8 w-20 rounded-lg bg-blue-600" />
                      </div>
                    </div>
                    {/* KPI Cards - Clean */}
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "Aufträge", value: "47", color: "bg-blue-50 border-blue-100" },
                        { label: "Mitarbeiter", value: "12", color: "bg-emerald-50 border-emerald-100" },
                        { label: "Kunden", value: "23", color: "bg-slate-50 border-slate-100" },
                      ].map((kpi) => (
                        <div key={kpi.label} className={`p-3 rounded-lg border ${kpi.color}`}>
                          <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
                          <p className="text-xl font-bold text-slate-900 mt-1">{kpi.value}</p>
                        </div>
                      ))}
                    </div>
                    {/* Calendar Preview - Clean */}
                    <div className="p-4 rounded-lg border border-slate-200 bg-white">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-slate-900">Einsatzplanung</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-9 rounded-lg text-xs flex items-center justify-center font-medium border ${
                              i % 3 === 0
                                ? "bg-blue-50 border-blue-200 text-blue-700"
                                : i % 3 === 1
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-slate-50 border-slate-200 text-slate-500"
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
      <section className="py-12 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== FEATURES SECTION ====== */}
      <section id="features" className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
              ALLES, WAS SIE BRAUCHEN
            </h2>
            <p className="text-lg text-slate-600">
              Von der Planung bis zur Abrechnung — ReinPlaner deckt alle Bereiche Ihres Unternehmens ab.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="p-6 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed line-clamp-3">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== FEATURES CTA ====== */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="p-8 md:p-12 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
              Bereit, 60% weniger Zeit für Verwaltung zu sparen?
            </h2>
            <p className="text-slate-600 mb-8 max-w-xl mx-auto">
              In unter 5 Minuten eingerichtet. Keine Kreditkarte. Keine Installation.
            </p>
            <Button asChild size="lg" className="h-12 px-8 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
              <Link href="/register">
                Jetzt 14 Tage kostenlos testen
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ====== HOW IT WORKS ====== */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
              SO FUNKTIONIERT'S
            </h2>
            <p className="text-lg text-slate-600">
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
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-xl font-bold text-white mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-16 mb-3">{item.title}</h3>
                <p className="text-slate-600">{item.desc}</p>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-slate-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== TESTIMONIALS ====== */}
      <section id="testimonials" className="py-20 md:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
              WAS UNSERE KUNDEN SAGEN
            </h2>
            <p className="text-lg text-slate-600">
              Über 150 Reinigungsfirmen vertrauen auf ReinPlaner.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="p-6 bg-white border border-slate-200 rounded-xl relative">
                <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  {testimonial.initials}
                </div>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-amber-400">★</span>
                  ))}
                </div>
                <blockquote className="text-slate-700 leading-relaxed mb-6 line-clamp-4">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div>
                  <p className="font-semibold text-slate-900">{testimonial.author}</p>
                  <p className="text-sm text-slate-500">{testimonial.company}</p>
                  <p className="text-xs text-slate-400 mt-1">{testimonial.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== PRICING SECTION ====== */}
      <section id="pricing" className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
              TRANSPARENTE PREISE
            </h2>
            <p className="text-lg text-slate-600">
              Alle Pläne inkludieren 14 Tage kostenlos testen — ohne Kreditkarte.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`p-8 rounded-2xl border ${
                  plan.highlighted
                    ? "bg-blue-50 border-blue-500 border-2 shadow-lg"
                    : "bg-white border-slate-200 shadow-sm hover:shadow-md"
                } transition-all duration-300`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                    Beliebteste Wahl
                  </div>
                )}
                <div className={plan.highlighted ? "pt-2" : ""}>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h3>
                  <p className="text-sm text-slate-600 mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-slate-900">€{plan.price}</span>
                    <span className="text-slate-500 ml-1">/ {plan.period}</span>
                  </div>
                  <Button
                    asChild
                    className={`w-full mb-8 h-12 font-semibold ${
                      plan.highlighted
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Link href={plan.plan === "enterprise" ? "/#contact" : `/register?plan=${plan.plan}`}>
                      {plan.cta}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm text-slate-700">
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
      <section className="py-20 md:py-28 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
              Häufig gestellte Fragen
            </h2>
            <p className="text-lg text-slate-600">
              Alles, was Sie über ReinPlaner wissen müssen.
            </p>
          </div>

          <Accordion type="single" collapsible className="bg-white border border-slate-200 rounded-xl p-6">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-b border-slate-200 last:border-0">
                <AccordionTrigger className="text-left font-semibold text-slate-900 hover:text-blue-600 py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ====== FINAL CTA ====== */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-amber-400 text-2xl">★</span>
            ))}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            Starten Sie noch heute — kostenlos
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Über 150 Reinigungsfirmen vertrauen bereits auf ReinPlaner.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="h-14 px-10 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
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

      {/* ====== FOOTER ====== */}
      <footer className="py-12 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <p className="text-slate-500">© 2024 ReinPlaner. Alle Rechte vorbehalten.</p>
            <nav className="flex items-center gap-6">
              <Link href="/impressum" className="text-slate-400 hover:text-slate-600 transition-colors">Impressum</Link>
              <Link href="/datenschutz" className="text-slate-400 hover:text-slate-600 transition-colors">Datenschutz</Link>
              <Link href="/agb" className="text-slate-400 hover:text-slate-600 transition-colors">AGB</Link>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}
```

---

## 4. Complete Redesigned (marketing)/pricing/page.tsx

```tsx
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
    <main className="min-h-screen bg-white">
      <MarketingHeader />

      {/* ============ HERO SECTION ============ */}
      <section className="pt-24 pb-16 sm:pt-32 sm:pb-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Trust Badges */}
          <div className="inline-flex flex-wrap items-center justify-center gap-4 mb-6">
            {trustBadges.map((badge) => (
              <div key={badge.text} className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                <badge.icon className="w-4 h-4 text-blue-600" />
                <span>{badge.text}</span>
              </div>
            ))}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            Der passende Plan für{" "}
            <span className="text-blue-600">Ihre Reinigungsfirma</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Wählen Sie den Plan, der zu Ihrem Unternehmen passt. Alle Pläne
            include 14 Tage kostenlos testen — ohne Kreditkarte.
          </p>
        </div>
      </section>

      {/* ============ PRICING CARDS ============ */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-8 rounded-2xl bg-white border ${
                  plan.highlighted
                    ? "border-blue-500 border-2 shadow-xl"
                    : "border-slate-200 shadow-sm"
                } transition-all duration-300`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm">
                    Beliebteste Wahl
                  </div>
                )}
                <div className={plan.highlighted ? "pt-2" : ""}>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h3>
                  <p className="text-sm text-slate-600 mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-slate-900">€{plan.price}</span>
                    <span className="text-slate-500 ml-1">/ {plan.period}</span>
                  </div>
                  <Button
                    asChild
                    className={`w-full mb-8 h-12 font-semibold ${
                      plan.highlighted
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
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
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
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
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ENTERPRISE CTA ============ */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="p-8 md:p-12 bg-slate-50 border border-slate-200 rounded-2xl">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
              Brauchen Sie etwas Individuelles?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
              Für große Organisationen mit speziellen Anforderungen bieten wir
              maßgeschneiderte Lösungen mit individueller Preisgestaltung.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white h-13 px-8 text-base font-semibold"
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
      <section className="py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
              Häufig gestellte Fragen
            </h2>
            <p className="text-lg text-slate-600">
              Alles, was Sie über unsere Preise wissen müssen.
            </p>
          </div>

          <Accordion type="single" collapsible className="bg-white border border-slate-200 rounded-xl p-6">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-b border-slate-200 last:border-0">
                <AccordionTrigger className="text-left font-semibold text-slate-900 hover:text-blue-600 py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-amber-400 text-2xl">★</span>
            ))}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            Starten Sie noch heute — kostenlos
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Über 150 Reinigungsfirmen vertrauen bereits auf ReinPlaner.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="h-14 px-10 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
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
      <footer className="py-12 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-slate-500">© 2024 ReinPlaner. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </main>
  );
}
```

---

## Summary of Key Design Changes

### Color Palette
| Element | Before (Dark/Neon) | After (Personio Style) |
|---------|-------------------|------------------------|
| Background | `#05080F`, `#0A0E1A`, `#0F1524` | `#FFFFFF`, `#F8FAFC`, `#F1F5F9` |
| Text Primary | `#F1F5F9` (light) | `#0F172A` (slate-900) |
| Text Secondary | `#94A3B8` | `#475569` (slate-600) |
| Accent | Neon blue-cyan gradients | `#2563EB` (professional blue) |
| Cards | Glass with blur effects | Solid white with subtle shadows |
| Borders | `rgba(255,255,255,0.08)` | `#E2E8F0` |

### Typography Changes
- Headlines: White on dark → Slate-900 on white
- Body text: Light slate-300 → Slate-600
- Font weights maintained for hierarchy

### Component Changes
| Component | Before | After |
|-----------|--------|-------|
| Navbar | Glass/dark with blur | Clean white with border |
| Hero Background | Dark with animated glows | Pure white |
| Feature Cards | Glass cards with rainbow gradients | Solid white with border |
| Pricing Cards | Glass with glow effects | Clean white with subtle shadow |
| Buttons | Gradient with neon glow | Solid blue-600 |
| Trust Badges | Glass pill with neon accents | Clean outlined badges |

### Language Changes
| Before (Hype) | After (Credible) |
|---------------|------------------|
| "8 STUNDEN PRO WOCHE SPAREN — AUTOMATISIERT" | "Die All-in-one Software für Reinigungsfirmen" |
| "REVOLUTIONIEREN" | "60% weniger Zeit für Verwaltung" |
| Neon dashboard screenshot | Clean light-themed mockup |
