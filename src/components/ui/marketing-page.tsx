"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/", label: "Startseite" },
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Preise" },
  { href: "/#testimonials", label: "Bewertungen" },
];

interface MarketingPageProps {
  children: React.ReactNode;
  showNav?: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

const maxWidthMap = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
  "2xl": "max-w-6xl",
  full: "max-w-7xl",
};

export function MarketingPage({ 
  children, 
  showNav = true,
  maxWidth = "lg",
}: MarketingPageProps) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <main className="min-h-screen section-dark">
      {/* Glass Navbar */}
      {showNav && (
        <header
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            isScrolled
              ? "bg-[#0A0E1A]/80 backdrop-blur-xl border-b border-white/5 shadow-lg"
              : "bg-transparent"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 md:h-20">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/30 blur-xl rounded-full group-hover:bg-blue-500/50 transition-all" />
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                </div>
                <span className="text-xl font-bold text-white tracking-tight">
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
                        ? "text-blue-400 bg-blue-500/10"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Desktop CTA */}
              <div className="hidden md:flex items-center gap-3">
                <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                  <Link href="/login">Anmelden</Link>
                </Button>
                <Button asChild size="sm" className="btn-primary">
                  <Link href="/register">
                    Kostenlos testen
                    <Zap className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-slate-300 hover:text-white"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Mobile Menu */}
      {showNav && (
        <div
          className={`fixed inset-0 z-40 bg-[#05080F] md:hidden transition-all duration-300 ${
            isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
          }`}
        >
          <div className="flex flex-col items-center justify-center h-full space-y-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-2xl font-semibold text-white hover:text-blue-400 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-4 mt-8">
              <Button asChild variant="outline" className="glass-btn border-slate-700 text-white">
                <Link href="/login">Anmelden</Link>
              </Button>
              <Button asChild className="btn-primary">
                <Link href="/register">Kostenlos testen</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="pt-24 pb-16">
        <div className={`${maxWidthMap[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8`}>
          {children}
        </div>
      </div>

      {/* Minimal Footer */}
      <footer className="py-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <p className="text-slate-500">© 2024 ReinPlaner. Alle Rechte vorbehalten.</p>
            <nav className="flex items-center gap-6">
              <Link href="/impressum" className="text-slate-400 hover:text-white transition-colors">Impressum</Link>
              <Link href="/datenschutz" className="text-slate-400 hover:text-white transition-colors">Datenschutz</Link>
              <Link href="/agb" className="text-slate-400 hover:text-white transition-colors">AGB</Link>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}
