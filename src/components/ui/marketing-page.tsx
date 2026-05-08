"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";

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
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <main className="min-h-screen bg-background">
      {/* Clean White Navbar */}
      {showNav && (
        <header
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
            isScrolled
              ? "glass-nav shadow-[var(--shadow-card)]"
              : "bg-transparent border-transparent"
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
                <span className="text-xl font-bold text-foreground tracking-tight">
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
                        ? "text-[var(--accent-blue)] bg-blue-50 dark:bg-blue-900/30"
                        : "text-muted-foreground dark:text-slate-300 hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-slate-800"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Desktop CTA */}
              <div className="hidden md:flex items-center gap-3">
                <ThemeSwitcher />
                <Button asChild variant="ghost" size="sm" className="text-muted-foreground dark:text-slate-300 hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-slate-800">
                  <Link href="/login">Anmelden</Link>
                </Button>
                <Button asChild size="sm" className="bg-[var(--accent-blue)] hover:opacity-90 text-white font-medium">
                  <Link href="/register">
                    Kostenlos testen
                    <CheckCircle2 className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-muted-foreground dark:text-slate-300 hover:text-foreground dark:hover:text-white"
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
          className={`fixed inset-0 z-40 bg-background md:hidden transition-all duration-300 ${
            isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
          }`}
        >
          <div className="flex flex-col justify-center h-full space-y-6 pt-16">
            <div className="flex items-center justify-between px-8 pb-4 border-b border-border dark:border-slate-700">
              <Link href="/" className="flex items-center gap-2.5">
                <Image
                  src="/reinplaner-logo.svg"
                  alt="ReinPlaner"
                  width={36}
                  height={36}
                  className="rounded-lg"
                />
                <span className="text-xl font-bold text-foreground tracking-tight">ReinPlaner</span>
              </Link>
              <div className="flex items-center gap-2">
                <ThemeSwitcher />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center space-y-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-2xl font-semibold text-foreground hover:text-[var(--accent-blue)] transition-colors"
              >
                {link.label}
              </Link>
            ))}
            </div>
            <div className="flex flex-col gap-3 w-64 mx-auto">
              <Button asChild variant="outline" className="border-border text-foreground hover:bg-muted">
                <Link href="/login">Anmelden</Link>
              </Button>
              <Button asChild className="bg-[var(--accent-blue)] hover:opacity-90 text-white">
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
      <footer className="py-8 bg-muted border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <p className="text-muted-foreground">
              &copy; {new Date().getFullYear()} ReinPlaner. Alle Rechte vorbehalten.
            </p>
            <nav className="flex items-center gap-6">
              <Link href="/impressum" className="text-muted-foreground hover:text-foreground">Impressum</Link>
              <Link href="/datenschutz" className="text-muted-foreground hover:text-foreground">Datenschutz</Link>
              <Link href="/agb" className="text-muted-foreground hover:text-foreground">AGB</Link>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}
