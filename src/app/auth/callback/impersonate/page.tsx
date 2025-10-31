"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function getTokenFromUrl(): { access_token: string | null; refresh_token: string | null } {
  const href = typeof window !== "undefined" ? window.location.href : "";
  const url = new URL(href);

  // Tokens können im Hash (#access_token=...) oder in den Query-Parametern liegen
  const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  const queryParams = url.searchParams;

  const access_token = hashParams.get("access_token") || queryParams.get("access_token");
  const refresh_token = hashParams.get("refresh_token") || queryParams.get("refresh_token");

  return { access_token, refresh_token };
}

export default function ImpersonateCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Impersonation wird verarbeitet...");

  useEffect(() => {
    const supabase = createClient();

    const handleImpersonation = async () => {
      const { access_token, refresh_token } = getTokenFromUrl();

      if (!access_token || !refresh_token) {
        setMessage("Keine Session-Tokens in der URL gefunden. Bitte versuchen Sie es erneut.");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        setMessage(`Fehler beim Setzen der Sitzung: ${error.message}`);
        return;
      }

      setMessage("Impersonation erfolgreich. Sie werden weitergeleitet...");
      router.replace("/dashboard");
    };

    handleImpersonation();
  }, [router]);

  return (
    <div className="container mx-auto max-w-md px-4 py-10 text-center">
      <h1 className="text-xl font-semibold mb-2">Impersonation</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}