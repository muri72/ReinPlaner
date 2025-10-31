"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { stopImpersonation } from "@/lib/actions/impersonation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert } from "lucide-react";
import { IMPERSONATION_STORAGE_KEY, ImpersonationMeta } from "../lib/impersonation/constants";
import { cn } from "@/lib/utils";

export function ImpersonationBanner() {
  const [meta, setMeta] = useState<ImpersonationMeta | null>(null);
  const [initialised, setInitialised] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined" || initialised) {
      return;
    }

    const raw = window.localStorage.getItem(IMPERSONATION_STORAGE_KEY);
    if (!raw) {
      setInitialised(true);
      return;
    }

    try {
      const parsed: ImpersonationMeta = JSON.parse(raw);
      const supabase = createClient();

      void supabase.auth.getUser().then(({ data, error }) => {
        if (error) {
          window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
          setInitialised(true);
          return;
        }

        if (data.user?.id === parsed.impersonatedUserId) {
          setMeta(parsed);
        } else if (data.user?.id !== parsed.adminUserId) {
          window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
        }

        setInitialised(true);
      });
    } catch {
      window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
      setInitialised(true);
    }
  }, [initialised]);

  const handleStop = async () => {
    if (!meta || isStopping) return;

    setIsStopping(true);

    const response = await stopImpersonation(meta.sessionId);

    if (!response.success || !response.data) {
      toast.error(response.message || "Impersonation konnte nicht beendet werden.");
      setIsStopping(false);
      return;
    }

    // LocalStorage vor der Weiterleitung bereinigen
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    }

    // Wenn wir einen Redirect-Link erhalten, nutzen wir ihn
    if ((response.data as any).actionLink) {
      toast.success(response.data.message || "Impersonation beendet.");
      setMeta(null);
      setIsStopping(false);
      window.location.href = (response.data as any).actionLink;
      return;
    }

    // Fallback: Falls doch Session-Daten vorliegen (ältere Implementationen)
    const session = (response.data as any).session;
    if (session) {
      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (error) {
        toast.error(error.message || "Sitzung konnte nicht wiederhergestellt werden.");
        setIsStopping(false);
        return;
      }

      toast.success(response.data.message || "Impersonation beendet.");
      setMeta(null);
      setIsStopping(false);
      router.refresh();
      return;
    }

    // Wenn weder actionLink noch Session vorhanden ist
    toast.success("Impersonation beendet.");
    setMeta(null);
    setIsStopping(false);
    router.refresh();
  };

  if (!initialised || !meta) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-md border px-4 py-3",
        "bg-amber-50 border-amber-200 text-amber-900",
        "flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
      )}
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="space-y-1">
          <p className="text-sm font-semibold">
            Impersonation aktiv – Sie handeln als {meta.impersonatedName}
          </p>
          <p className="text-xs text-amber-800">
            Alle Aktionen werden diesem Account zugeordnet. Klicken Sie auf
            &quot;Zurück wechseln&quot;, um zu {meta.adminName} zurückzukehren.
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        onClick={handleStop}
        disabled={isStopping}
        className="border-amber-300 text-amber-900 hover:bg-amber-100"
      >
        {isStopping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Zurück wechseln
      </Button>
    </div>
  );
}