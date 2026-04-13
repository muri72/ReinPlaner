"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="ReinPlaner"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              ReinPlaner
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/#features"
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
              Preise
            </Link>
            <Link
              href="/#contact"
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
            >
              Kontakt
            </Link>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Anmelden</Link>
            </Button>
            <Button
              asChild
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Link href="/register">Kostenlos testen</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden p-2 text-slate-600"
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
        <div className="md:hidden bg-white border-b border-slate-200 dark:border-slate-700">
          <div className="px-4 py-4 space-y-3">
            <Link
              href="/#features"
              className="block text-sm font-medium text-slate-600 hover:text-blue-600 py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="block text-sm font-medium text-slate-600 hover:text-blue-600 py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Preise
            </Link>
            <Link
              href="/#contact"
              className="block text-sm font-medium text-slate-600 hover:text-blue-600 py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Kontakt
            </Link>
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <Button variant="outline" asChild className="w-full">
                <Link href="/login">Anmelden</Link>
              </Button>
              <Button
                asChild
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Link href="/register">Kostenlos testen</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
