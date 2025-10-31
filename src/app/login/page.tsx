"use client";

import React from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-6">
        <h1 className="text-2xl font-semibold mb-4 text-center">Anmelden</h1>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{ theme: ThemeSupa }}
          theme="light"
        />
        <p className="mt-4 text-center text-sm text-neutral-500">
          Nach erfolgreicher Anmeldung wirst du automatisch zum passenden Dashboard weitergeleitet.
        </p>
      </div>
    </div>
  );
}