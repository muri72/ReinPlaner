"use client";
import { useState } from "react";
import { endImpersonation } from "@/lib/actions/platform-admin";
import { useRouter } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";

export function ImpersonationBanner({ tenantName }: { tenantName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleEnd() {
    setLoading(true);
    await endImpersonation();
    router.refresh();
  }

  return (
    <div className="bg-amber-900/90 border-b border-amber-700 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-amber-100">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">
          Sie betrachten den Tenant: <strong>{tenantName}</strong>
        </span>
      </div>
      <button
        onClick={handleEnd}
        disabled={loading}
        className="flex items-center gap-1 text-sm bg-amber-800 hover:bg-amber-700 text-amber-100 px-3 py-1 rounded-md transition-colors"
      >
        <X className="h-3 w-3" />
        {loading ? "Beende..." : "Zurück zur Verwaltung"}
      </button>
    </div>
  );
}
