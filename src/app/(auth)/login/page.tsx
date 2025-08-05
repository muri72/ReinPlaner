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
        // Der "AUTH_ERROR"-Event-Typ existiert nicht in onAuthStateChange.
        // Fehlerbehandlung für die Auth-Komponente erfolgt normalerweise über den onError-Prop,
        // aber gemäß den Anweisungen wird dieser nicht verwendet.
      }
    );

    return () => subscription.unsubscribe();
  }, [router, supabase.auth]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          Anmelden
        </h2>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "hsl(var(--primary))",
                  brandAccent: "hsl(var(--primary-foreground))",
                },
              },
            },
          }}
          theme="light" // Verwende helles Theme gemäß Designsystem
          redirectTo={`${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`}
        />
      </div>
    </div>
  );
}