"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { stopImpersonation } from "@/lib/actions/impersonation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert } from "lucide-react";
import { useImpersonation } from "@/lib/impersonation/context";
import { useUserProfile } from "@/components/user-profile-provider";
import { IMPERSONATION_STORAGE_KEY } from "@/lib/impersonation/constants";
import { cn } from "@/lib/utils";

export function ImpersonationBanner() {
  const { meta, isImpersonating, triggerReinit } = useImpersonation();
  const { displayName } = useUserProfile();
  const [isStopping, setIsStopping] = useState(false);
  const router = useRouter();

  const handleStop = async () => {
    if (!meta || isStopping) return;

    setIsStopping(true);

    // Mark the impersonation as ended in the database
    const response = await stopImpersonation(meta.sessionId);

    if (!response.success) {
      toast.error(response.message || "Impersonation konnte nicht beendet werden.");
      setIsStopping(false);
      return;
    }

    // Clear impersonation metadata locally
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
      // Trigger immediate context re-initialization (this will trigger useEffect in UserProfileProvider automatically)
      triggerReinit();
    }

    toast.success(response.data?.message || "Impersonation beendet.");
    setIsStopping(false);
    // No page reload needed - optimistic update is sufficient!
  };

  // Show banner only when impersonating
  if (!isImpersonating || !meta) {
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
            Impersonation aktiv – Sie handeln als {displayName}
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