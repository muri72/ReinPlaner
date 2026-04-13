"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Zap } from "lucide-react";

export function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass-nav py-2"
          : "bg-transparent py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <Image
                src="/logo.png"
                alt="ReinPlaner"
                width={36}
                height={36}
                className="rounded-xl transition-transform group-hover:scale-105"
              />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#05080F]" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              ReinPlaner
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/#features"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors relative group"
            >
              Features
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 transition-all group-hover:w-full" />
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors relative group"
            >
              Preise
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 transition-all group-hover:w-full" />
            </Link>
            <Link
              href="/#contact"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors relative group"
            >
              Kontakt
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 transition-all group-hover:w-full" />
            </Link>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              asChild
              className="text-slate-300 hover:text-white hover:bg-white/10"
            >
              <Link href="/login">Anmelden</Link>
            </Button>
            <Button
              asChild
              className="btn-primary h-10 px-5 text-sm font-semibold"
            >
              <Link href="/register">
                <Zap className="w-4 h-4 mr-1.5" />
                Kostenlos testen
              </Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden p-2 text-slate-300 hover:text-white transition-colors glass-btn rounded-lg"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 glass-nav border-t border-white/5">
          <div className="px-4 py-6 space-y-4">
            <Link
              href="/#features"
              className="block text-base font-medium text-slate-300 hover:text-white py-2 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="block text-base font-medium text-slate-300 hover:text-white py-2 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Preise
            </Link>
            <Link
              href="/#contact"
              className="block text-base font-medium text-slate-300 hover:text-white py-2 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Kontakt
            </Link>
            <div className="pt-4 border-t border-white/10 space-y-3">
              <Button variant="outline" asChild className="w-full glass-btn border-slate-700 text-slate-300">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  Anmelden
                </Link>
              </Button>
              <Button asChild className="w-full btn-primary">
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Zap className="w-4 h-4 mr-1.5" />
                  Kostenlos testen
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
