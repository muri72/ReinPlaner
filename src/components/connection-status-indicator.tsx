"use client";

import { useState } from "react";
import { Wifi, WifiOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSupabaseConnection } from "@/hooks/use-supabase-connection";

interface ConnectionStatusIndicatorProps {
  isConnected?: boolean;
  latency?: number | null;
  showDetails?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ConnectionStatusIndicator({
  isConnected: initialConnected,
  latency: initialLatency,
  showDetails = false,
  size = "md",
  className = "",
}: ConnectionStatusIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { isConnected, isChecking, error, lastChecked, latency, checkConnection } =
    useSupabaseConnection({
      checkInterval: 30000, // Check every 30 seconds
      autoCheck: true,
      onConnectionChange: (connected) => {
        // Optional: Handle connection change
      },
    });

  // Use passed props if provided, otherwise use hook state
  const actuallyConnected = initialConnected !== undefined ? initialConnected : isConnected;
  const actualLatency = initialLatency !== undefined ? initialLatency : latency;

  const getIcon = () => {
    if (isChecking) {
      return (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
      );
    }

    if (actuallyConnected) {
      return <CheckCircle2 className={`text-green-500 ${size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5"}`} />;
    }

    return <AlertCircle className={`text-destructive ${size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5"}`} />;
  };

  const getStatusText = () => {
    if (isChecking) return "Prüfe...";

    if (actuallyConnected) {
      if (actualLatency !== null && actualLatency < 100) {
        return "Verbunden (Schnell)";
      } else if (actualLatency !== null && actualLatency < 500) {
        return "Verbunden";
      } else {
        return "Verbunden (Langsam)";
      }
    }

    return "Getrennt";
  };

  const formatLatency = (lat: number | null) => {
    if (lat === null) return "N/A";
    return `${lat}ms`;
  };

  const content = (
    <div
      className={`flex items-center gap-2 ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-center gap-2">
        {getIcon()}
        {showDetails && (
          <span className={`text-sm ${actuallyConnected ? "text-green-500" : "text-destructive"}`}>
            {getStatusText()}
          </span>
        )}
      </div>

      {showDetails && actuallyConnected && actualLatency !== null && (
        <span className="text-xs text-muted-foreground">
          ({formatLatency(actualLatency)})
        </span>
      )}
    </div>
  );

  const tooltipContent = (
    <div className="space-y-1 text-sm">
      <div className="font-semibold">
        {actuallyConnected ? "✓ Datenbank verbunden" : "✗ Datenbank getrennt"}
      </div>
      {lastChecked && (
        <div className="text-xs text-muted-foreground">
          Zuletzt geprüft: {lastChecked.toLocaleTimeString()}
        </div>
      )}
      {actuallyConnected && actualLatency !== null && (
        <div className="text-xs text-muted-foreground">
          Antwortzeit: {formatLatency(actualLatency)}
        </div>
      )}
      {error && (
        <div className="text-xs text-destructive">
          Fehler: {error}
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          checkConnection();
        }}
        disabled={isChecking}
        className="mt-2"
      >
        {isChecking ? "Prüfe..." : "Erneut prüfen"}
      </Button>
    </div>
  );

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

// Compact version for use in headers/footers
export function ConnectionStatusBadge({ className = "" }: { className?: string }) {
  const { isConnected, isChecking } = useSupabaseConnection({
    checkInterval: 60000, // Check less frequently for badges
    autoCheck: true,
  });

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
        isChecking
          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
          : isConnected
          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      } ${className}`}
    >
      {isChecking ? (
        <>
          <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent" />
          <span>Prüfe...</span>
        </>
      ) : isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          <span>Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Offline</span>
        </>
      )}
    </div>
  );
}
