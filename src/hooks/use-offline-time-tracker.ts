"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  isOnline,
  isOfflineCacheAvailable,
  getActiveTimeEntry,
  saveActiveTimeEntry,
  clearActiveTimeEntry,
  savePendingEntry,
  getPendingCount,
  getPendingEntries,
  deletePendingEntry,
  archiveSyncedEntry,
  updatePendingEntry,
  CachedTimeEntry,
  type SyncQueueItem,
} from "@/lib/offline-time-cache";
import { createTimeEntry, updateTimeEntry } from "@/app/dashboard/time-tracking/actions";
import { triggerHapticFeedback } from "@/lib/mobile-utils";
import { toast } from "sonner";

interface UseOfflineTimeTrackerOptions {
  userId: string;
  employeeId: string | null;
  onSyncComplete?: () => void;
  onError?: (message: string) => void;
}

interface UseOfflineTimeTrackerReturn {
  // State
  isRunning: boolean;
  isOnline: boolean;
  elapsedSeconds: number;
  displayTime: string;
  pendingCount: number;
  activeEntry: CachedTimeEntry | null;
  isSyncing: boolean;
  lastSyncError: string | null;

  // Actions
  start: (orderId?: string | null, objectId?: string | null, notes?: string) => Promise<void>;
  stop: (notes?: string) => Promise<void>;
  syncPendingEntries: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
}

function formatLiveTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function useOfflineTimeTracker({
  userId,
  employeeId,
  onSyncComplete,
  onError,
}: UseOfflineTimeTrackerOptions): UseOfflineTimeTrackerReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [isCurrentlyOnline, setIsCurrentlyOnline] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [displayTime, setDisplayTime] = useState("00:00:00");
  const [pendingCount, setPendingCount] = useState(0);
  const [activeEntry, setActiveEntry] = useState<CachedTimeEntry | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Format elapsed time display
  useEffect(() => {
    setDisplayTime(formatLiveTime(elapsedSeconds));
  }, [elapsedSeconds]);

  // Load active entry from cache on mount
  useEffect(() => {
    const loadActiveEntry = async () => {
      if (!isOfflineCacheAvailable()) return;

      const cached = await getActiveTimeEntry();
      if (cached && cached.syncStatus !== "synced") {
        setActiveEntry(cached);
        // Calculate elapsed time since start
        if (cached.startTime) {
          const startMs = new Date(cached.startTime).getTime();
          const elapsed = Math.floor((Date.now() - startMs) / 1000);
          setElapsedSeconds(elapsed);
          setIsRunning(true);
          startTimeRef.current = new Date(cached.startTime);
        }
      }
    };

    loadActiveEntry();
  }, []);

  // Start the live timer when running
  useEffect(() => {
    if (isRunning && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!.getTime()) / 1000);
        setElapsedSeconds(elapsed);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsCurrentlyOnline(true);
      // Try to sync pending entries when coming back online
      syncPendingEntries();
    };

    const handleOffline = () => {
      setIsCurrentlyOnline(false);
    };

    if (typeof window !== "undefined") {
      setIsCurrentlyOnline(navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, []);

  // Timer interval effect for elapsed seconds
  useEffect(() => {
    if (isRunning && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
          setElapsedSeconds(elapsed);
        }
      }, 1000);
    } else if (!isRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  const refreshPendingCount = useCallback(async () => {
    if (!isOfflineCacheAvailable()) return;
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  const start = useCallback(
    async (orderId?: string | null, objectId?: string | null, notes?: string) => {
      if (!employeeId) {
        toast.error("Kein Mitarbeiter-ID gefunden.");
        return;
      }

      const now = new Date();
      const startTimeIso = now.toISOString();
      const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      const entry: CachedTimeEntry = {
        id: localId,
        localId,
        employeeId,
        customerId: null,
        objectId: objectId || null,
        orderId: orderId || null,
        startTime: startTimeIso,
        endTime: null,
        durationMinutes: null,
        breakMinutes: null,
        type: "stopwatch",
        notes: notes || null,
        createdAt: now.toISOString(),
        syncedAt: null,
        syncStatus: isOnline() ? "pending" : "pending",
        errorMessage: null,
      };

      // Save to local cache
      await saveActiveTimeEntry(entry);
      setActiveEntry(entry);

      // Haptic feedback
      triggerHapticFeedback("medium");

      // Try to create on server if online
      if (isOnline()) {
        try {
          const result = await createTimeEntry({
            employeeId,
            customerId: null,
            objectId: objectId || null,
            orderId: orderId || null,
            shiftId: undefined,
            startDate: now,
            startTime: now.toTimeString().slice(0, 5),
            endDate: null,
            endTime: null,
            durationMinutes: null,
            breakMinutes: null,
            type: "stopwatch",
            notes: notes || null,
          });

          if (result.success && result.newEntryId) {
            // Update local entry with server ID
            entry.id = result.newEntryId;
            await saveActiveTimeEntry(entry);
            setActiveEntry(entry);
            toast.success("Zeiterfassung gestartet!");
          } else {
            // Server failed but we have it locally queued
            toast.info("Offline gespeichert – wird später synchronisiert.");
          }
        } catch (err) {
          // Network error - save locally for later sync
          await saveActiveTimeEntry(entry);
          setActiveEntry(entry);
          toast.info("Offline gespeichert – wird später synchronisiert.");
        }
      } else {
        // Save to pending queue for later sync
        await savePendingEntry(entry);
        await refreshPendingCount();
        toast.info("Offline gespeichert – wird später synchronisiert.");
      }

      // Start local timer
      startTimeRef.current = now;
      setIsRunning(true);
      setElapsedSeconds(0);
    },
    [employeeId, refreshPendingCount]
  );

  const stop = useCallback(
    async (notes?: string) => {
      if (!activeEntry) return;

      const now = new Date();
      const endTimeIso = now.toISOString();

      const startDateTime = new Date(activeEntry.startTime);
      const durationMinutes = Math.floor((now.getTime() - startDateTime.getTime()) / 60000);

      // Calculate break based on German law
      let breakMinutes = 0;
      if (durationMinutes >= 9 * 60) breakMinutes = 45;
      else if (durationMinutes >= 6 * 60) breakMinutes = 30;

      const updatedEntry: CachedTimeEntry = {
        ...activeEntry,
        endTime: endTimeIso,
        durationMinutes,
        breakMinutes,
        notes: notes || activeEntry.notes,
        syncStatus: "pending",
      };

      triggerHapticFeedback("heavy");

      // Clear active entry from cache
      await clearActiveTimeEntry();

      // Stop local timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Try to update on server if online
      if (isOnline() && activeEntry.id && !activeEntry.id.includes("-")) {
        try {
          const result = await updateTimeEntry(activeEntry.id, {
            endDate: now,
            endTime: now.toTimeString().slice(0, 5),
            durationMinutes,
            breakMinutes,
            notes: notes || activeEntry.notes,
          });

          if (result.success) {
            // Save to synced archive
            updatedEntry.syncStatus = "synced";
            updatedEntry.syncedAt = now.toISOString();
            await archiveSyncedEntry(updatedEntry);
            await refreshPendingCount();
            toast.success("Zeiterfassung beendet und synchronisiert!");
            onSyncComplete?.();
            return;
          } else {
            // Server update failed - save to pending
            await savePendingEntry(updatedEntry);
            await refreshPendingCount();
            toast.warning("Beendet, aber Server-Sync fehlgeschlagen – wird später synchronisiert.");
          }
        } catch (err) {
          // Network error - queue for later
          await savePendingEntry(updatedEntry);
          await refreshPendingCount();
          toast.warning("Beendet und offline gespeichert – wird später synchronisiert.");
        }
      } else {
        // No server ID yet (pure offline start) or offline now
        await savePendingEntry(updatedEntry);
        await refreshPendingCount();
        toast.success("Zeiterfassung beendet (offline gespeichert).");
        onSyncComplete?.();
      }

      // Reset state
      setActiveEntry(null);
      setIsRunning(false);
      setElapsedSeconds(0);
      startTimeRef.current = null;
    },
    [activeEntry, refreshPendingCount, onSyncComplete]
  );

  const syncPendingEntries = useCallback(async () => {
    if (!isOnline() || isSyncing) return;

    setIsSyncing(true);
    setLastSyncError(null);

    try {
      const pending = await getPendingEntries();
      let synced = 0;
      let failed = 0;

      for (const entry of pending) {
        if (entry.syncStatus === "synced") continue;

        // Mark as syncing
        await updatePendingEntry(entry.localId, { syncStatus: "syncing" });

        try {
          if (!entry.endTime) {
            // Entry still running - just update server
            if (entry.id && !entry.id.includes("-")) {
              await updateTimeEntry(entry.id, {
                durationMinutes: Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 60000),
              });
            }
          } else {
            // Entry complete - create or update
            if (entry.id && !entry.id.includes("-")) {
              // Has server ID - update it
              await updateTimeEntry(entry.id, {
                endDate: new Date(entry.endTime),
                endTime: new Date(entry.endTime).toTimeString().slice(0, 5),
                durationMinutes: entry.durationMinutes || undefined,
                breakMinutes: entry.breakMinutes || undefined,
                notes: entry.notes || undefined,
              });
            } else {
              // No server ID - create new entry
              const startDate = new Date(entry.startTime);
              const result = await createTimeEntry({
                employeeId: entry.employeeId,
                customerId: entry.customerId,
                objectId: entry.objectId,
                orderId: entry.orderId,
                shiftId: undefined,
                startDate,
                startTime: startDate.toTimeString().slice(0, 5),
                endDate: entry.endTime ? new Date(entry.endTime) : null,
                endTime: entry.endTime ? new Date(entry.endTime).toTimeString().slice(0, 5) : null,
                durationMinutes: entry.durationMinutes,
                breakMinutes: entry.breakMinutes,
                type: entry.type,
                notes: entry.notes,
              });

              if (!result.success) {
                throw new Error(result.message);
              }
            }
          }

          // Mark as synced and archive
          await updatePendingEntry(entry.localId, { syncStatus: "synced", syncedAt: new Date().toISOString() });
          await archiveSyncedEntry(entry);
          synced++;
        } catch (err) {
          // Mark as failed
          const errorMsg = err instanceof Error ? err.message : "Unbekannter Fehler";
          await updatePendingEntry(entry.localId, {
            syncStatus: "failed",
            errorMessage: errorMsg,
            retryCount: entry.retryCount ? entry.retryCount + 1 : 1,
          });
          failed++;
          console.error(`[OfflineSync] Failed to sync entry ${entry.localId}:`, err);
        }
      }

      if (synced > 0) {
        toast.success(`${synced} Eintrag${synced > 1 ? "e" : ""} synchronisiert.`);
        onSyncComplete?.();
      }
      if (failed > 0) {
        setLastSyncError(`${failed} Eintrag${failed > 1 ? "e" : ""} konnten nicht synchronisiert werden.`);
        toast.error(`${failed} Eintrag${failed > 1 ? "e" : ""} fehlgeschlagen.`);
      }
    } finally {
      await refreshPendingCount();
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPendingCount, onSyncComplete]);

  return {
    isRunning,
    isOnline: isCurrentlyOnline,
    elapsedSeconds,
    displayTime,
    pendingCount,
    activeEntry,
    isSyncing,
    lastSyncError,
    start,
    stop,
    syncPendingEntries,
    refreshPendingCount,
  };
}
