"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { syncShiftsToTimeEntries, getSyncStatus } from "@/app/dashboard/reports/actions";

interface SyncStatus {
  total_completed_shifts: number;
  shifts_with_entries: number;
  shifts_missing_entries: number;
}

export function ShiftTimeSyncButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Lade den Status beim Mounten
  useEffect(() => {
    loadStatus();
  }, []);

  // Lade Status erneut nach Sync
  useEffect(() => {
    if (!syncing && status === null) {
      loadStatus();
    }
  }, [syncing]);

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const data = await getSyncStatus();
      setStatus(data);
    } catch (error) {
      console.error("Fehler beim Laden des Sync-Status:", error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncShiftsToTimeEntries();

      if (result.success) {
        toast.success(result.message, {
          description: `${result.created} erstellt, ${result.skipped} übersprungen`,
        });

        // Status neu laden und Page refresh für Server-Komponenten
        await loadStatus();
        router.refresh();
      } else {
        toast.error("Sync fehlgeschlagen", { description: result.message });
      }
    } catch (error) {
      toast.error("Fehler beim Sync", { description: String(error) });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Button onClick={handleSync} disabled={syncing} variant="outline">
        <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Synchronisiere..." : "Einsätze syncen"}
      </Button>

      {/* Status-Anzeige */}
      {!loadingStatus && status && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Abgeschlossen:</span>
            <Badge variant="outline">{status.total_completed_shifts}</Badge>
          </div>
          {status.shifts_missing_entries > 0 ? (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span>{status.shifts_missing_entries} ohne Zeiteintrag</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <span>✓ Alle synchronisiert</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
