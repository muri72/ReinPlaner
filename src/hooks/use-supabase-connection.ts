"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ConnectionStatus {
  isConnected: boolean;
  isChecking: boolean;
  error: string | null;
  lastChecked: Date | null;
  latency: number | null;
}

interface UseSupabaseConnectionOptions {
  checkInterval?: number; // in milliseconds
  autoCheck?: boolean;
  onConnectionChange?: (isConnected: boolean) => void;
}

/**
 * Hook to monitor Supabase database connection status
 * Provides real-time connection monitoring with configurable intervals
 */
export function useSupabaseConnection(
  options: UseSupabaseConnectionOptions = {}
): ConnectionStatus & { checkConnection: () => Promise<boolean> } {
  const {
    checkInterval = 30000, // Check every 30 seconds by default
    autoCheck = true,
    onConnectionChange,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isChecking: false,
    error: null,
    lastChecked: null,
    latency: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  const checkConnection = async () => {
    const startTime = Date.now();

    setStatus((prev) => ({ ...prev, isChecking: true, error: null }));

    try {
      // Simple query to test connection
      const { data, error } = await supabase
        .from("app_settings")
        .select("key")
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      const latency = Date.now() - startTime;

      setStatus((prev) => ({
        ...prev,
        isConnected: true,
        isChecking: false,
        error: null,
        lastChecked: new Date(),
        latency,
      }));

      // Notify parent component if connection was previously lost
      onConnectionChange?.(true);

      return true;
    } catch (error: any) {
      console.error("Supabase connection check failed:", error);

      const errorMessage = error.message || "Unbekannter Verbindungsfehler";

      setStatus((prev) => ({
        ...prev,
        isConnected: false,
        isChecking: false,
        error: errorMessage,
        lastChecked: new Date(),
        latency: null,
      }));

      // Notify parent component
      onConnectionChange?.(false);

      // Show toast notification for connection errors (only once per minute to avoid spam)
      const lastToastTime = sessionStorage.getItem("lastConnectionErrorToast");
      const now = Date.now();

      if (!lastToastTime || now - parseInt(lastToastTime) > 60000) {
        toast.error("Verbindungsfehler", {
          description: "Die Verbindung zur Datenbank ist unterbrochen. Versuchen Sie es später erneut.",
          duration: 5000,
        });
        sessionStorage.setItem("lastConnectionErrorToast", now.toString());
      }

      return false;
    }
  };

  useEffect(() => {
    // Initial connection check
    checkConnection();

    // Set up interval for periodic checks
    if (autoCheck && checkInterval > 0) {
      intervalRef.current = setInterval(() => {
        checkConnection();
      }, checkInterval);
    }

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkInterval, autoCheck]);

  return {
    ...status,
    checkConnection,
  };
}

/**
 * Hook to check if Supabase is reachable with retry logic
 */
export async function checkSupabaseConnection(
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<{ success: boolean; error?: string; latency?: number }> {
  const supabase = createClient();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();

    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key")
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      const latency = Date.now() - startTime;

      return {
        success: true,
        latency,
      };
    } catch (error: any) {
      console.error(`Connection attempt ${attempt}/${maxRetries} failed:`, error);

      if (attempt === maxRetries) {
        return {
          success: false,
          error: error.message || "Verbindung zur Datenbank konnte nicht hergestellt werden",
        };
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
    }
  }

  return {
    success: false,
    error: "Max retries exceeded",
  };
}
