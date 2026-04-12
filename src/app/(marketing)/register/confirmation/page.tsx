import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { CheckCircle2, Mail, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
    <main className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header */}
      <header className="p-4 sm:p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Zurück zur Startseite</span>
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg">
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
              <span className="text-2xl font-bold text-slate-900">
                ReinPlaner
              </span>
            </Link>
          </div>

          <Card className="border-slate-200 shadow-xl">
            <CardContent className="pt-8 pb-8 text-center">
              {/* Success Icon */}
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-slate-900 mb-3">
                Registrierung erfolgreich!
              </h1>

              {/* Description */}
              <div className="space-y-4 text-slate-600">
                <p>
                  Wir haben eine Bestätigungs-E-Mail an{" "}
                  <span className="font-semibold text-slate-900">
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
              <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100">
                <Mail className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <p className="text-sm text-blue-700">
                  Die E-Mail kommt in den nächsten Minuten an. Bitte prüfen Sie
                  auch Ihren Spam-Ordner.
                </p>
              </div>

              {/* Resend Info */}
              <div className="mt-6 text-sm text-slate-500">
                Keine E-Mail erhalten?{" "}
                <Link
                  href="/login"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Versuchen Sie sich anzumelden
                </Link>{" "}
                oder kontaktieren Sie unseren Support.
              </div>
            </CardContent>
          </Card>

          {/* Support Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              Fragen? Unser Support hilft Ihnen gerne weiter.
            </p>
            <Link
              href="/#contact"
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              Kontakt aufnehmen
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
