"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          if (session) {
            router.push("/dashboard"); // Authentifizierte Benutzer zum Dashboard umleiten
          }
        } else if (event === "SIGNED_OUT") {
          toast.info("Sie wurden abgemeldet.");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router, supabase.auth]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800" suppressHydrationWarning>
        <Auth
          supabaseClient={supabase}
          providers={[]} // Keine externen Anbieter wie Google, GitHub usw.
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))', // Supabase Brand-Farbe an Primary anpassen
                  brandAccent: 'hsl(var(--primary-foreground))', // Akzentfarbe an Primary-Foreground anpassen
                },
              },
            },
          }}
          theme="light" // Standardmäßig helles Theme
          redirectTo={`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/callback`}
          localization={{
            variables: {
              sign_in: {
                email_label: 'E-Mail-Adresse',
                password_label: 'Passwort',
                email_input_placeholder: 'Ihre E-Mail-Adresse',
                password_input_placeholder: 'Ihr Passwort',
                button_label: 'Anmelden',
                social_provider_text: 'Mit {{provider}} anmelden',
                link_text: 'Sie haben bereits ein Konto? Anmelden',
              },
              sign_up: {
                email_label: 'E-Mail-Adresse',
                password_label: 'Passwort',
                email_input_placeholder: 'Ihre E-Mail-Adresse',
                password_input_placeholder: 'Ihr Passwort',
                button_label: 'Registrieren',
                social_provider_text: 'Mit {{provider}} registrieren',
                link_text: 'Sie haben noch kein Konto? Registrieren',
              },
              forgotten_password: {
                email_label: 'E-Mail-Adresse',
                button_label: 'Passwort zurücksetzen',
                link_text: 'Passwort vergessen?',
                email_input_placeholder: 'Ihre E-Mail-Adresse',
              },
              update_password: {
                password_label: 'Neues Passwort',
                password_input_placeholder: 'Ihr neues Passwort',
                button_label: 'Passwort aktualisieren',
              },
              magic_link: {
                email_input_placeholder: 'Ihre E-Mail-Adresse',
                button_label: 'Magic Link senden',
                link_text: 'Einen Magic Link senden',
              },
              verify_otp: {
                email_input_placeholder: 'Ihre E-Mail-Adresse',
                phone_input_placeholder: 'Ihre Telefonnummer',
                token_input_placeholder: 'OTP-Token',
                button_label: 'Bestätigen',
              },
            },
          }}
        />
      </div>
    </div>
  );
}