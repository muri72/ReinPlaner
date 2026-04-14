import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { CheckCircle2, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingPage } from "@/components/ui/marketing-page";

// Force dynamic rendering since we use searchParams
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Registrierung erfolgreich – ReinPlaner",
  description: "Bitte bestätigen Sie Ihre E-Mail-Adresse, um fortzufahren.",
};

interface ConfirmationPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function ConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const params = await searchParams;
  const email = params.email || "";

  return (
    <MarketingPage maxWidth="sm">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="ReinPlaner"
            width={48}
            height={48}
            className="rounded-xl"
          />
          <span className="text-2xl font-bold text-white">
            ReinPlaner
          </span>
        </Link>
      </div>

      <div className="glass-card p-8 text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-3">
          Registrierung erfolgreich!
        </h1>

        {/* Description */}
        <div className="space-y-4 text-slate-400 mb-8">
          <p>
            Wir haben eine Bestätigungs-E-Mail an{" "}
            <span className="font-semibold text-white">
              {email || "Ihre E-Mail-Adresse"}
            </span>{" "}
            gesendet.
          </p>
          <p>
            Bitte klicken Sie auf den Link in der E-Mail, um Ihre
            E-Mail-Adresse zu bestätigen und Ihr Konto zu aktivieren.
          </p>
        </div>

        {/* Email Icon */}
        <div className="p-6 bg-blue-500/10 rounded-2xl border border-blue-500/20">
          <Mail className="w-12 h-12 text-blue-400 mx-auto mb-3" />
          <p className="text-sm text-slate-300">
            Die E-Mail kommt in den nächsten Minuten an. Bitte prüfen Sie
            auch Ihren Spam-Ordner.
          </p>
        </div>

        {/* Resend Info */}
        <div className="mt-6 text-sm text-slate-500">
          Keine E-Mail erhalten?{" "}
          <Link
            href="/login"
            className="text-blue-400 hover:underline font-medium"
          >
            Versuchen Sie sich anzumelden
          </Link>{" "}
          oder kontaktieren Sie unseren Support.
        </div>
      </div>

      {/* Support Link */}
      <div className="mt-8 text-center">
        <p className="text-sm text-slate-500">
          Fragen? Unser Support hilft Ihnen gerne weiter.
        </p>
        <Link
          href="/#contact"
          className="text-sm text-blue-400 hover:underline font-medium"
        >
          Kontakt aufnehmen
        </Link>
      </div>
    </MarketingPage>
  );
}
